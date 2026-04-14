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

// ─── YOUTUBE ────────────────────────────────────────────────────────────────

router.get("/auth/youtube/connect", (req, res) => {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "YouTube OAuth not configured. Set YOUTUBE_CLIENT_ID." });
    return;
  }
  const state = generateState("youtube");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCallbackUrl("youtube"),
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
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
    });
  } catch {
    redirectToFrontend(res as never, "error", "facebook", "Failed to save token.");
    return;
  }

  redirectToFrontend(res as never, "success", "facebook");
});

export default router;
