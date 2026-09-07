import { Router } from "express";
import { randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, tokensTable, oauthCredentialsTable } from "@workspace/db";
import { encryptToken, decryptToken } from "../utils/crypto.js";
import { cached, cacheDelByPattern } from "../services/RedisClient.js";
import { adminMiddleware } from "../middleware/auth.js";

type TokenUpsertValues = {
  platform: string;
  accountName: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  connected: boolean;
  scope: string | null;
};

async function upsertToken(values: TokenUpsertValues): Promise<void> {
  await db
    .insert(tokensTable)
    .values(values)
    .onConflictDoUpdate({
      target: tokensTable.platform,
      set: {
        accountName: values.accountName,
        accessToken: values.accessToken,
        refreshToken: values.refreshToken,
        expiresAt: values.expiresAt,
        connected: values.connected,
        scope: values.scope,
        connectedAt: sql`now()`,
        updatedAt: sql`now()`,
      },
    });
}

const ENV_MAP: Record<string, { idKey: string; secretKey: string }> = {
  youtube: { idKey: "YOUTUBE_CLIENT_ID", secretKey: "YOUTUBE_CLIENT_SECRET" },
  instagram: { idKey: "INSTAGRAM_CLIENT_ID", secretKey: "INSTAGRAM_CLIENT_SECRET" },
  facebook: { idKey: "FACEBOOK_CLIENT_ID", secretKey: "FACEBOOK_CLIENT_SECRET" },
  tiktok: { idKey: "TIKTOK_CLIENT_KEY", secretKey: "TIKTOK_CLIENT_SECRET" },
  twitter: { idKey: "TWITTER_CLIENT_ID", secretKey: "TWITTER_CLIENT_SECRET" },
  ga4: { idKey: "YOUTUBE_CLIENT_ID", secretKey: "YOUTUBE_CLIENT_SECRET" },
  threads: { idKey: "THREADS_CLIENT_ID", secretKey: "THREADS_CLIENT_SECRET" },
};

function safeDecrypt(s: string): string {
  try { return decryptToken(s); } catch { return s; }
}

// Platforms that reuse another platform's OAuth client when their own creds are missing.
// GA4 shares the Google OAuth client with YouTube.
const CREDS_FALLBACK_PLATFORM: Record<string, string> = {
  ga4: "youtube",
};

async function getCreds(platform: string): Promise<{ clientId: string; clientSecret: string } | null> {
  try {
    const [row] = await db
      .select()
      .from(oauthCredentialsTable)
      .where(eq(oauthCredentialsTable.platform, platform))
      .limit(1);
    if (row) {
      return { clientId: safeDecrypt(row.clientId), clientSecret: safeDecrypt(row.clientSecret) };
    }
  } catch {
    // fall through to env / sibling
  }

  const env = ENV_MAP[platform];
  if (env) {
    const clientId = process.env[env.idKey];
    const clientSecret = process.env[env.secretKey];
    if (clientId && clientSecret) return { clientId, clientSecret };
  }

  // Last resort: check sibling platform's DB-stored creds (e.g. GA4 -> YouTube).
  const sibling = CREDS_FALLBACK_PLATFORM[platform];
  if (sibling) {
    try {
      const [row] = await db
        .select()
        .from(oauthCredentialsTable)
        .where(eq(oauthCredentialsTable.platform, sibling))
        .limit(1);
      if (row) {
        return { clientId: safeDecrypt(row.clientId), clientSecret: safeDecrypt(row.clientSecret) };
      }
    } catch {
      // give up
    }
  }

  return null;
}

async function isConfigured(platform: string): Promise<boolean> {
  return (await getCreds(platform)) !== null;
}

const router = Router();

const stateStore = new Map<string, { platform: string; expiresAt: number; userId: string }>();

function generateState(platform: string, userId: string): string {
  const state = randomBytes(24).toString("hex");
  stateStore.set(state, { platform, expiresAt: Date.now() + 10 * 60 * 1000, userId });
  return state;
}

function verifyState(state: string, expectedPlatform: string): { valid: true; userId: string } | { valid: false } {
  const entry = stateStore.get(state);
  if (!entry) return { valid: false };
  stateStore.delete(state);
  if (entry.expiresAt < Date.now()) return { valid: false };
  if (entry.platform !== expectedPlatform) return { valid: false };
  return { valid: true, userId: entry.userId };
}

const connectNonceStore = new Map<string, { userId: string; expiresAt: number }>();

function consumeConnectNonce(nonce: string): string | null {
  const entry = connectNonceStore.get(nonce);
  if (!entry) return null;
  connectNonceStore.delete(nonce);
  if (entry.expiresAt < Date.now()) return null;
  return entry.userId;
}

function getBaseUrl(): string {
  const configuredUrl = process.env.APP_BASE_URL?.trim();
  if (!configuredUrl) return "http://localhost:5173";

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error("APP_BASE_URL must be an absolute http(s) URL.");
  }
}

function getCallbackUrl(platform: string): string {
  return `${getBaseUrl()}/api/auth/${platform}/callback`;
}

function redirectToFrontend(
  res: Parameters<typeof router.get>[1] extends (req: never, res: infer R) => void ? R : never,
  status: "success" | "error",
  platform: string,
  message?: string
) {
  const url = new URL(`${getBaseUrl()}/connections`);
  url.searchParams.set("oauth_status", status);
  url.searchParams.set("platform", platform);
  if (message) url.searchParams.set("message", message);
  res.redirect(url.toString());
}

function safeEncrypt(token: string): string {
  try {
    return encryptToken(token);
  } catch {
    return token;
  }
}

router.post("/auth/connect-nonce", adminMiddleware, (req, res) => {
  const userId = req.user!.sub;
  const nonce = randomBytes(24).toString("hex");
  connectNonceStore.set(nonce, { userId, expiresAt: Date.now() + 5 * 60 * 1000 });
  res.json({ nonce });
});

router.get("/auth/config", async (_req, res) => {
  let hit = false;
  const base = getBaseUrl();
  const payload = await cached(
    `auth:config:${base}`,
    3600,
    async () => {
      const platforms = ["youtube", "instagram", "facebook", "tiktok", "twitter", "ga4", "threads"] as const;
      const entries = await Promise.all(
        platforms.map(async (p) => [p, {
          callbackUrl: `${base}/api/auth/${p}/callback`,
          configured: await isConfigured(p),
        }] as const)
      );
      return Object.fromEntries(entries);
    },
    { onHit: () => { hit = true; } },
  );
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.json(payload);
});

// ─── YOUTUBE ────────────────────────────────────────────────────────────────

router.get("/auth/youtube/connect", async (req, res) => {
  const nonce = typeof req.query["nonce"] === "string" ? req.query["nonce"] : null;
  const userId = nonce ? consumeConnectNonce(nonce) : null;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "A valid connect nonce is required." });
    return;
  }

  const creds = await getCreds("youtube");
  if (!creds) {
    res.status(503).json({ error: "YouTube OAuth not configured. Add credentials in /connections." });
    return;
  }
  const clientId = creds.clientId;
  const state = generateState("youtube", userId);
  const redirectUri = getCallbackUrl("youtube");
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const url = "https://accounts.google.com/o/oauth2/v2/auth"
    + "?client_id=" + encodeURIComponent(clientId)
    + "&redirect_uri=" + encodeURIComponent(redirectUri)
    + "&response_type=code"
    + "&scope=" + encodeURIComponent(scopes.join(" "))
    + "&state=" + encodeURIComponent(state)
    + "&access_type=offline"
    + "&prompt=consent";

  res.redirect(url);
});

router.get("/auth/youtube/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    redirectToFrontend(res as never, "error", "youtube", "Authorization denied by user.");
    return;
  }
  const stateResult = state ? verifyState(state, "youtube") : { valid: false as const };
  if (!stateResult.valid) {
    redirectToFrontend(res as never, "error", "youtube", "Invalid or expired state. Please try again.");
    return;
  }

  const ytCreds = await getCreds("youtube");
  const clientId = ytCreds?.clientId;
  const clientSecret = ytCreds?.clientSecret;
  if (!clientId || !clientSecret) {
    redirectToFrontend(res as never, "error", "youtube", "OAuth credentials not configured.");
    return;
  }

  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresIn: number | undefined;
  let grantedScope: string | undefined;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getCallbackUrl("youtube"),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      redirectToFrontend(res as never, "error", "youtube", "Failed to exchange code for token.");
      return;
    }
    const tokenData = await tokenRes.json() as Record<string, unknown>;
    accessToken = tokenData.access_token as string;
    refreshToken = tokenData.refresh_token as string | undefined;
    expiresIn = tokenData.expires_in as number | undefined;
    grantedScope = tokenData.scope as string | undefined;
  } catch {
    redirectToFrontend(res as never, "error", "youtube", "Network error during token exchange.");
    return;
  }

  let accountName = "YouTube Account";
  try {
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (channelRes.ok) {
      const channelData = await channelRes.json() as Record<string, unknown>;
      const items = channelData.items as Array<{ snippet?: { title?: string } }> | undefined;
      accountName = items?.[0]?.snippet?.title ?? "YouTube Account";
    }
  } catch {
    // use default name
  }

  try {
    const encryptedAccess = safeEncrypt(accessToken);
    const encryptedRefresh = refreshToken ? safeEncrypt(refreshToken) : null;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await upsertToken({
      platform: "youtube",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      connected: true,
      scope: grantedScope ?? null,
    });
  } catch (err) {
    req.log.error({ err, platform: "youtube" }, "Failed to save OAuth token");
    redirectToFrontend(res as never, "error", "youtube", "Failed to save token.");
    return;
  }

  await Promise.all([
    cacheDelByPattern("youtube:"),
    cacheDelByPattern("dashboard:"),
    cacheDelByPattern("comparator:"),
  ]);
  redirectToFrontend(res as never, "success", "youtube");
});

// ─── INSTAGRAM ──────────────────────────────────────────────────────────────

router.get("/auth/instagram/connect", async (req, res) => {
  const nonce = typeof req.query["nonce"] === "string" ? req.query["nonce"] : null;
  const userId = nonce ? consumeConnectNonce(nonce) : null;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "A valid connect nonce is required." });
    return;
  }

  const creds = await getCreds("instagram");
  if (!creds) {
    res.status(503).json({ error: "Instagram OAuth not configured. Add credentials in /connections." });
    return;
  }
  const clientId = creds.clientId;
  const state = generateState("instagram", userId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCallbackUrl("instagram"),
    response_type: "code",
    scope: "user_profile,user_media",
    state,
  });
  res.redirect(`https://api.instagram.com/oauth/authorize?${params}`);
});

router.get("/auth/instagram/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    redirectToFrontend(res as never, "error", "instagram", "Authorization denied by user.");
    return;
  }
  const stateResult = state ? verifyState(state, "instagram") : { valid: false as const };
  if (!stateResult.valid) {
    redirectToFrontend(res as never, "error", "instagram", "Invalid or expired state. Please try again.");
    return;
  }

  const igCreds = await getCreds("instagram");
  const clientId = igCreds?.clientId;
  const clientSecret = igCreds?.clientSecret;
  if (!clientId || !clientSecret) {
    redirectToFrontend(res as never, "error", "instagram", "OAuth credentials not configured.");
    return;
  }

  let shortLivedToken: string;
  try {
    const body = new FormData();
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
    body.append("grant_type", "authorization_code");
    body.append("redirect_uri", getCallbackUrl("instagram"));
    body.append("code", code);

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body,
    });
    if (!tokenRes.ok) {
      redirectToFrontend(res as never, "error", "instagram", "Failed to exchange code for token.");
      return;
    }
    const tokenData = await tokenRes.json() as Record<string, unknown>;
    shortLivedToken = tokenData.access_token as string;
  } catch {
    redirectToFrontend(res as never, "error", "instagram", "Network error during token exchange.");
    return;
  }

  let accessToken = shortLivedToken;
  let expiresIn: number | undefined;
  try {
    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(clientSecret)}&access_token=${encodeURIComponent(shortLivedToken)}`
    );
    if (longLivedRes.ok) {
      const data = await longLivedRes.json() as Record<string, unknown>;
      accessToken = (data.access_token as string) ?? shortLivedToken;
      expiresIn = data.expires_in as number | undefined;
    }
  } catch {
    // use short-lived token
  }

  let accountName = "Instagram Account";
  try {
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`
    );
    if (profileRes.ok) {
      const profile = await profileRes.json() as Record<string, unknown>;
      accountName = (profile.username as string) ?? "Instagram Account";
    }
  } catch {
    // use default
  }

  try {
    const encryptedAccess = safeEncrypt(accessToken);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await upsertToken({
      platform: "instagram",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: null,
      expiresAt,
      connected: true,
      scope: "user_profile,user_media",
    });
  } catch (err) {
    req.log.error({ err, platform: "instagram" }, "Failed to save OAuth token");
    redirectToFrontend(res as never, "error", "instagram", "Failed to save token.");
    return;
  }

  await Promise.all([
    cacheDelByPattern("instagram:"),
    cacheDelByPattern("dashboard:"),
    cacheDelByPattern("comparator:"),
  ]);
  redirectToFrontend(res as never, "success", "instagram");
});

// ─── FACEBOOK ───────────────────────────────────────────────────────────────

router.get("/auth/facebook/connect", async (req, res) => {
  const nonce = typeof req.query["nonce"] === "string" ? req.query["nonce"] : null;
  const userId = nonce ? consumeConnectNonce(nonce) : null;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "A valid connect nonce is required." });
    return;
  }

  const creds = await getCreds("facebook");
  if (!creds) {
    res.status(503).json({ error: "Facebook OAuth not configured. Add credentials in /connections." });
    return;
  }
  const clientId = creds.clientId;
  const state = generateState("facebook", userId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCallbackUrl("facebook"),
    response_type: "code",
    scope: "public_profile,pages_show_list,pages_read_engagement",
    state,
  });
  res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
});

router.get("/auth/facebook/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    redirectToFrontend(res as never, "error", "facebook", "Authorization denied by user.");
    return;
  }
  const stateResult = state ? verifyState(state, "facebook") : { valid: false as const };
  if (!stateResult.valid) {
    redirectToFrontend(res as never, "error", "facebook", "Invalid or expired state. Please try again.");
    return;
  }

  const fbCreds = await getCreds("facebook");
  const clientId = fbCreds?.clientId;
  const clientSecret = fbCreds?.clientSecret;
  if (!clientId || !clientSecret) {
    redirectToFrontend(res as never, "error", "facebook", "OAuth credentials not configured.");
    return;
  }

  let accessToken: string;
  let expiresIn: number | undefined;
  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getCallbackUrl("facebook"),
      code,
    });
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?${params}`
    );
    if (!tokenRes.ok) {
      redirectToFrontend(res as never, "error", "facebook", "Failed to exchange code for token.");
      return;
    }
    const tokenData = await tokenRes.json() as Record<string, unknown>;
    accessToken = tokenData.access_token as string;
    expiresIn = tokenData.expires_in as number | undefined;
  } catch {
    redirectToFrontend(res as never, "error", "facebook", "Network error during token exchange.");
    return;
  }

  let longLivedToken = accessToken;
  try {
    const llParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: accessToken,
    });
    const llRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${llParams}`);
    if (llRes.ok) {
      const llData = await llRes.json() as Record<string, unknown>;
      longLivedToken = (llData.access_token as string) ?? accessToken;
      expiresIn = (llData.expires_in as number) ?? expiresIn;
    }
  } catch {
    // use short-lived token
  }

  let accountName = "Facebook Account";
  try {
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name&access_token=${encodeURIComponent(longLivedToken)}`
    );
    if (profileRes.ok) {
      const profile = await profileRes.json() as Record<string, unknown>;
      accountName = (profile.name as string) ?? "Facebook Account";
    }
  } catch {
    // use default
  }

  try {
    const encryptedAccess = safeEncrypt(longLivedToken);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await upsertToken({
      platform: "facebook",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: null,
      expiresAt,
      connected: true,
      scope: "public_profile,pages_show_list,pages_read_engagement",
    });
  } catch (err) {
    req.log.error({ err, platform: "facebook" }, "Failed to save OAuth token");
    redirectToFrontend(res as never, "error", "facebook", "Failed to save token.");
    return;
  }

  await Promise.all([
    cacheDelByPattern("facebook:"),
    cacheDelByPattern("dashboard:"),
    cacheDelByPattern("comparator:"),
  ]);
  redirectToFrontend(res as never, "success", "facebook");
});

// ─── TIKTOK ─────────────────────────────────────────────────────────────────

router.get("/auth/tiktok/connect", async (req, res) => {
  const nonce = typeof req.query["nonce"] === "string" ? req.query["nonce"] : null;
  const userId = nonce ? consumeConnectNonce(nonce) : null;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "A valid connect nonce is required." });
    return;
  }

  const creds = await getCreds("tiktok");
  if (!creds) {
    res.status(503).json({ error: "TikTok OAuth not configured. Add credentials in /connections." });
    return;
  }
  const clientKey = creds.clientId;
  const state = generateState("tiktok", userId);
  const csrfState = state;
  const redirectUri = getCallbackUrl("tiktok");
  const scopes = ["user.info.basic", "video.list"];

  const url = "https://www.tiktok.com/v2/auth/authorize/"
    + "?client_key=" + encodeURIComponent(clientKey)
    + "&redirect_uri=" + encodeURIComponent(redirectUri)
    + "&response_type=code"
    + "&scope=" + encodeURIComponent(scopes.join(","))
    + "&state=" + encodeURIComponent(csrfState);

  res.redirect(url);
});

router.get("/auth/tiktok/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    redirectToFrontend(res as never, "error", "tiktok", "Authorization denied by user.");
    return;
  }
  const stateResult = state ? verifyState(state, "tiktok") : { valid: false as const };
  if (!stateResult.valid) {
    redirectToFrontend(res as never, "error", "tiktok", "Invalid or expired state. Please try again.");
    return;
  }

  const ttCreds = await getCreds("tiktok");
  const clientKey = ttCreds?.clientId;
  const clientSecret = ttCreds?.clientSecret;
  if (!clientKey || !clientSecret) {
    redirectToFrontend(res as never, "error", "tiktok", "OAuth credentials not configured.");
    return;
  }

  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresIn: number | undefined;
  let grantedScope = "user.info.basic,video.list";

  try {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: getCallbackUrl("tiktok"),
      }),
    });
    if (!tokenRes.ok) {
      redirectToFrontend(res as never, "error", "tiktok", "Failed to exchange code for token.");
      return;
    }
    const tokenData = await tokenRes.json() as Record<string, unknown>;
    accessToken = tokenData.access_token as string;
    refreshToken = tokenData.refresh_token as string | undefined;
    expiresIn = tokenData.expires_in as number | undefined;
    if (typeof tokenData.scope === "string" && tokenData.scope.length > 0) {
      grantedScope = tokenData.scope;
    }
  } catch {
    redirectToFrontend(res as never, "error", "tiktok", "Network error during token exchange.");
    return;
  }

  let accountName = "TikTok Account";
  try {
    const profileRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,username", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profileData = await profileRes.json() as { data?: { user?: { display_name?: string; username?: string } } };
      accountName = profileData?.data?.user?.display_name ?? profileData?.data?.user?.username ?? "TikTok Account";
    }
  } catch {
    // use default
  }

  try {
    const encryptedAccess = safeEncrypt(accessToken);
    const encryptedRefresh = refreshToken ? safeEncrypt(refreshToken) : null;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await upsertToken({
      platform: "tiktok",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      connected: true,
      scope: grantedScope,
    });
  } catch (err) {
    req.log.error({ err, platform: "tiktok" }, "Failed to save OAuth token");
    redirectToFrontend(res as never, "error", "tiktok", "Failed to save token.");
    return;
  }

  await Promise.all([
    cacheDelByPattern("tiktok:"),
    cacheDelByPattern("dashboard:"),
    cacheDelByPattern("comparator:"),
  ]);
  redirectToFrontend(res as never, "success", "tiktok");
});

// ─── TWITTER (X) ────────────────────────────────────────────────────────────

router.get("/auth/twitter/connect", async (req, res) => {
  const nonce = typeof req.query["nonce"] === "string" ? req.query["nonce"] : null;
  const userId = nonce ? consumeConnectNonce(nonce) : null;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "A valid connect nonce is required." });
    return;
  }

  const creds = await getCreds("twitter");
  if (!creds) {
    res.status(503).json({ error: "Twitter/X OAuth not configured. Add credentials in /connections." });
    return;
  }
  const clientId = creds.clientId;
  const state = generateState("twitter", userId);
  const redirectUri = getCallbackUrl("twitter");
  const scopes = ["tweet.read", "users.read", "offline.access"];
  const codeChallenge = state;

  const url = "https://twitter.com/i/oauth2/authorize"
    + "?client_id=" + encodeURIComponent(clientId)
    + "&redirect_uri=" + encodeURIComponent(redirectUri)
    + "&response_type=code"
    + "&scope=" + encodeURIComponent(scopes.join(" "))
    + "&state=" + encodeURIComponent(state)
    + "&code_challenge=" + encodeURIComponent(codeChallenge)
    + "&code_challenge_method=plain";

  res.redirect(url);
});

router.get("/auth/twitter/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    redirectToFrontend(res as never, "error", "twitter", "Authorization denied by user.");
    return;
  }
  const stateResult = state ? verifyState(state, "twitter") : { valid: false as const };
  if (!stateResult.valid) {
    redirectToFrontend(res as never, "error", "twitter", "Invalid or expired state. Please try again.");
    return;
  }

  const twCreds = await getCreds("twitter");
  const clientId = twCreds?.clientId;
  const clientSecret = twCreds?.clientSecret;
  if (!clientId || !clientSecret) {
    redirectToFrontend(res as never, "error", "twitter", "OAuth credentials not configured.");
    return;
  }

  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresIn: number | undefined;
  let grantedScope = "tweet.read,users.read,offline.access";

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        redirect_uri: getCallbackUrl("twitter"),
        grant_type: "authorization_code",
        code_verifier: state,
      }),
    });
    if (!tokenRes.ok) {
      redirectToFrontend(res as never, "error", "twitter", "Failed to exchange code for token.");
      return;
    }
    const tokenData = await tokenRes.json() as Record<string, unknown>;
    accessToken = tokenData.access_token as string;
    refreshToken = tokenData.refresh_token as string | undefined;
    expiresIn = tokenData.expires_in as number | undefined;
    if (typeof tokenData.scope === "string" && tokenData.scope.length > 0) {
      grantedScope = (tokenData.scope as string).split(/\s+/).join(",");
    }
  } catch {
    redirectToFrontend(res as never, "error", "twitter", "Network error during token exchange.");
    return;
  }

  let accountName = "Twitter Account";
  try {
    const profileRes = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profileData = await profileRes.json() as { data?: { name?: string; username?: string } };
      accountName = profileData?.data?.name ?? profileData?.data?.username ?? "Twitter Account";
    }
  } catch {
    // use default
  }

  try {
    const encryptedAccess = safeEncrypt(accessToken);
    const encryptedRefresh = refreshToken ? safeEncrypt(refreshToken) : null;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await upsertToken({
      platform: "twitter",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      connected: true,
      scope: grantedScope,
    });
  } catch (err) {
    req.log.error({ err, platform: "twitter" }, "Failed to save OAuth token");
    redirectToFrontend(res as never, "error", "twitter", "Failed to save token.");
    return;
  }

  await Promise.all([
    cacheDelByPattern("twitter:"),
    cacheDelByPattern("dashboard:"),
    cacheDelByPattern("comparator:"),
  ]);
  redirectToFrontend(res as never, "success", "twitter");
});

// ─── GOOGLE ANALYTICS 4 ─────────────────────────────────────────────────────

router.get("/auth/ga4/connect", async (req, res) => {
  const nonce = typeof req.query["nonce"] === "string" ? req.query["nonce"] : null;
  const userId = nonce ? consumeConnectNonce(nonce) : null;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "A valid connect nonce is required." });
    return;
  }

  const creds = await getCreds("ga4");
  if (!creds) {
    res.status(503).json({ error: "GA4 OAuth not configured. Add credentials in /connections." });
    return;
  }
  const state = generateState("ga4", userId);
  const redirectUri = getCallbackUrl("ga4");
  const scopes = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const url = "https://accounts.google.com/o/oauth2/v2/auth"
    + "?client_id=" + encodeURIComponent(creds.clientId)
    + "&redirect_uri=" + encodeURIComponent(redirectUri)
    + "&response_type=code"
    + "&scope=" + encodeURIComponent(scopes.join(" "))
    + "&state=" + encodeURIComponent(state)
    + "&access_type=offline"
    + "&prompt=consent";

  res.redirect(url);
});

router.get("/auth/ga4/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    redirectToFrontend(res as never, "error", "ga4", "Authorization denied by user.");
    return;
  }
  const stateResult = state ? verifyState(state, "ga4") : { valid: false as const };
  if (!stateResult.valid) {
    redirectToFrontend(res as never, "error", "ga4", "Invalid or expired state. Please try again.");
    return;
  }

  const creds = await getCreds("ga4");
  if (!creds) {
    redirectToFrontend(res as never, "error", "ga4", "OAuth credentials not configured.");
    return;
  }

  let accessToken: string;
  let refreshToken: string | undefined;
  let expiresIn: number | undefined;
  let grantedScope: string | undefined;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: getCallbackUrl("ga4"),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      redirectToFrontend(res as never, "error", "ga4", "Failed to exchange code for token.");
      return;
    }
    const tokenData = await tokenRes.json() as Record<string, unknown>;
    accessToken = tokenData.access_token as string;
    refreshToken = tokenData.refresh_token as string | undefined;
    expiresIn = tokenData.expires_in as number | undefined;
    grantedScope = tokenData.scope as string | undefined;
  } catch {
    redirectToFrontend(res as never, "error", "ga4", "Network error during token exchange.");
    return;
  }

  let accountName = "Google Analytics 4";
  try {
    const summariesRes = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (summariesRes.ok) {
      const data = await summariesRes.json() as { accountSummaries?: Array<{ displayName?: string; propertySummaries?: Array<{ displayName?: string }> }> };
      const first = data.accountSummaries?.[0];
      const propName = first?.propertySummaries?.[0]?.displayName;
      accountName = propName ?? first?.displayName ?? "Google Analytics 4";
    }
  } catch {
    // use default
  }

  try {
    const encryptedAccess = safeEncrypt(accessToken);
    const encryptedRefresh = refreshToken ? safeEncrypt(refreshToken) : null;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await upsertToken({
      platform: "ga4",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      connected: true,
      scope: grantedScope ?? null,
    });
  } catch (err) {
    req.log.error({ err, platform: "ga4" }, "Failed to save OAuth token");
    redirectToFrontend(res as never, "error", "ga4", "Failed to save token.");
    return;
  }

  await Promise.all([
    cacheDelByPattern("ga4:"),
    cacheDelByPattern("dashboard:"),
  ]);
  redirectToFrontend(res as never, "success", "ga4");
});

// ─── THREADS ────────────────────────────────────────────────────────────────

router.get("/auth/threads/connect", async (req, res) => {
  const nonce = typeof req.query["nonce"] === "string" ? req.query["nonce"] : null;
  const userId = nonce ? consumeConnectNonce(nonce) : null;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "A valid connect nonce is required." });
    return;
  }

  const creds = await getCreds("threads");
  if (!creds) {
    res.status(503).json({ error: "Threads OAuth not configured. Add credentials in /connections." });
    return;
  }
  const state = generateState("threads", userId);
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: getCallbackUrl("threads"),
    response_type: "code",
    scope: "threads_basic,threads_manage_insights",
    state,
  });
  res.redirect(`https://threads.net/oauth/authorize?${params}`);
});

router.get("/auth/threads/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    redirectToFrontend(res as never, "error", "threads", "Authorization denied by user.");
    return;
  }
  const stateResult = state ? verifyState(state, "threads") : { valid: false as const };
  if (!stateResult.valid) {
    redirectToFrontend(res as never, "error", "threads", "Invalid or expired state. Please try again.");
    return;
  }

  const creds = await getCreds("threads");
  if (!creds) {
    redirectToFrontend(res as never, "error", "threads", "OAuth credentials not configured.");
    return;
  }

  let accessToken: string;
  let expiresIn: number | undefined;
  try {
    const tokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: getCallbackUrl("threads"),
        code,
      }),
    });
    if (!tokenRes.ok) {
      redirectToFrontend(res as never, "error", "threads", "Failed to exchange code for token.");
      return;
    }
    const tokenData = await tokenRes.json() as Record<string, unknown>;
    accessToken = tokenData.access_token as string;
    expiresIn = tokenData.expires_in as number | undefined;
  } catch {
    redirectToFrontend(res as never, "error", "threads", "Network error during token exchange.");
    return;
  }

  // Try to exchange for long-lived token (60 days)
  try {
    const llRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(creds.clientSecret)}&access_token=${encodeURIComponent(accessToken)}`
    );
    if (llRes.ok) {
      const data = await llRes.json() as Record<string, unknown>;
      accessToken = (data.access_token as string) ?? accessToken;
      expiresIn = (data.expires_in as number) ?? expiresIn;
    }
  } catch {
    // use short-lived token
  }

  let accountName = "Threads Account";
  try {
    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`
    );
    if (profileRes.ok) {
      const profile = await profileRes.json() as Record<string, unknown>;
      accountName = (profile.username as string) ?? (profile.name as string) ?? "Threads Account";
    }
  } catch {
    // use default
  }

  try {
    const encryptedAccess = safeEncrypt(accessToken);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    await upsertToken({
      platform: "threads",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: null,
      expiresAt,
      connected: true,
      scope: "threads_basic,threads_manage_insights",
    });
  } catch (err) {
    req.log.error({ err, platform: "threads" }, "Failed to save OAuth token");
    redirectToFrontend(res as never, "error", "threads", "Failed to save token.");
    return;
  }

  await Promise.all([
    cacheDelByPattern("threads:"),
    cacheDelByPattern("dashboard:"),
  ]);
  redirectToFrontend(res as never, "success", "threads");
});

export default router;
