import { Router } from "express";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";
import { encryptToken } from "../utils/crypto.js";

const router = Router();

const stateStore = new Map<string, { platform: string; expiresAt: number }>();

function generateState(platform: string): string {
  const state = randomBytes(24).toString("hex");
  stateStore.set(state, { platform, expiresAt: Date.now() + 10 * 60 * 1000 });
  return state;
}

function verifyState(state: string, expectedPlatform: string): boolean {
  const entry = stateStore.get(state);
  if (!entry) return false;
  stateStore.delete(state);
  if (entry.expiresAt < Date.now()) return false;
  if (entry.platform !== expectedPlatform) return false;
  return true;
}

function getBaseUrl(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
  if (!domain) return "http://localhost:3000";
  return `https://${domain}`;
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

router.get("/auth/config", (req, res) => {
  const base = getBaseUrl();
  res.json({
    youtube: {
      callbackUrl: `${base}/api/auth/youtube/callback`,
      configured: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
    },
    instagram: {
      callbackUrl: `${base}/api/auth/instagram/callback`,
      configured: !!(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET),
    },
    facebook: {
      callbackUrl: `${base}/api/auth/facebook/callback`,
      configured: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
    },
    tiktok: {
      callbackUrl: `${base}/api/auth/tiktok/callback`,
      configured: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    },
    twitter: {
      callbackUrl: `${base}/api/auth/twitter/callback`,
      configured: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    },
  });
});

// ─── YOUTUBE ────────────────────────────────────────────────────────────────

router.get("/auth/youtube/connect", (req, res) => {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "YouTube OAuth not configured. Set YOUTUBE_CLIENT_ID." });
    return;
  }
  const state = generateState("youtube");
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
  if (!state || !verifyState(state, "youtube")) {
    redirectToFrontend(res as never, "error", "youtube", "Invalid or expired state. Please try again.");
    return;
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
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

    await db.delete(tokensTable).where(eq(tokensTable.platform, "youtube"));
    await db.insert(tokensTable).values({
      platform: "youtube",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      connected: true,
      scope: grantedScope ?? null,
    });
  } catch {
    redirectToFrontend(res as never, "error", "youtube", "Failed to save token.");
    return;
  }

  redirectToFrontend(res as never, "success", "youtube");
});

// ─── INSTAGRAM ──────────────────────────────────────────────────────────────

router.get("/auth/instagram/connect", (req, res) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Instagram OAuth not configured. Set INSTAGRAM_CLIENT_ID." });
    return;
  }
  const state = generateState("instagram");
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
  if (!state || !verifyState(state, "instagram")) {
    redirectToFrontend(res as never, "error", "instagram", "Invalid or expired state. Please try again.");
    return;
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
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

    await db.delete(tokensTable).where(eq(tokensTable.platform, "instagram"));
    await db.insert(tokensTable).values({
      platform: "instagram",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: null,
      expiresAt,
      connected: true,
      scope: "user_profile,user_media",
    });
  } catch {
    redirectToFrontend(res as never, "error", "instagram", "Failed to save token.");
    return;
  }

  redirectToFrontend(res as never, "success", "instagram");
});

// ─── FACEBOOK ───────────────────────────────────────────────────────────────

router.get("/auth/facebook/connect", (req, res) => {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Facebook OAuth not configured. Set FACEBOOK_CLIENT_ID." });
    return;
  }
  const state = generateState("facebook");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCallbackUrl("facebook"),
    response_type: "code",
    scope: "pages_read_engagement,pages_show_list,read_insights,public_profile",
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
  if (!state || !verifyState(state, "facebook")) {
    redirectToFrontend(res as never, "error", "facebook", "Invalid or expired state. Please try again.");
    return;
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
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

    await db.delete(tokensTable).where(eq(tokensTable.platform, "facebook"));
    await db.insert(tokensTable).values({
      platform: "facebook",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: null,
      expiresAt,
      connected: true,
      scope: "pages_read_engagement,pages_show_list,read_insights,public_profile",
    });
  } catch {
    redirectToFrontend(res as never, "error", "facebook", "Failed to save token.");
    return;
  }

  redirectToFrontend(res as never, "success", "facebook");
});

// ─── TIKTOK ─────────────────────────────────────────────────────────────────

router.get("/auth/tiktok/connect", (req, res) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    res.status(503).json({ error: "TikTok OAuth not configured. Set TIKTOK_CLIENT_KEY." });
    return;
  }
  const state = generateState("tiktok");
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
  if (!state || !verifyState(state, "tiktok")) {
    redirectToFrontend(res as never, "error", "tiktok", "Invalid or expired state. Please try again.");
    return;
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
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

    await db.delete(tokensTable).where(eq(tokensTable.platform, "tiktok"));
    await db.insert(tokensTable).values({
      platform: "tiktok",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      connected: true,
      scope: grantedScope,
    });
  } catch {
    redirectToFrontend(res as never, "error", "tiktok", "Failed to save token.");
    return;
  }

  redirectToFrontend(res as never, "success", "tiktok");
});

// ─── TWITTER (X) ────────────────────────────────────────────────────────────

router.get("/auth/twitter/connect", (req, res) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Twitter/X OAuth not configured. Set TWITTER_CLIENT_ID." });
    return;
  }
  const state = generateState("twitter");
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
  if (!state || !verifyState(state, "twitter")) {
    redirectToFrontend(res as never, "error", "twitter", "Invalid or expired state. Please try again.");
    return;
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
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

    await db.delete(tokensTable).where(eq(tokensTable.platform, "twitter"));
    await db.insert(tokensTable).values({
      platform: "twitter",
      accountName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      connected: true,
      scope: grantedScope,
    });
  } catch {
    redirectToFrontend(res as never, "error", "twitter", "Failed to save token.");
    return;
  }

  redirectToFrontend(res as never, "success", "twitter");
});

export default router;
