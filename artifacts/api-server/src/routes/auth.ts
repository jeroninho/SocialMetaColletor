import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";
import {
  ConnectYoutubeBody,
  ConnectInstagramBody,
  ConnectFacebookBody,
  DisconnectPlatformParams,
} from "@workspace/api-zod";
import { encryptToken } from "../utils/crypto.js";

const router = Router();

function safeEncrypt(token: string): string {
  try {
    return encryptToken(token);
  } catch {
    return token;
  }
}

async function validateYoutubeToken(token: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    throw { status: 502, message: "Unable to reach YouTube API" };
  }
  if (response.status === 401) {
    throw { status: 401, message: "Invalid access token" };
  }
  if (response.status === 403) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const errors = (body?.error as Record<string, unknown> | undefined)?.errors;
    const reason = Array.isArray(errors) && errors.length > 0
      ? (errors[0] as Record<string, unknown>)?.reason
      : undefined;
    const authReasons = new Set(["authError", "invalidCredentials", "required", "forbidden"]);
    if (typeof reason === "string" && authReasons.has(reason)) {
      throw { status: 401, message: "Invalid access token" };
    }
    throw { status: 502, message: "YouTube API returned an unexpected error" };
  }
  if (!response.ok) {
    throw { status: 502, message: "YouTube API returned an unexpected error" };
  }
}

async function validateInstagramToken(token: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(token)}`
    );
  } catch {
    throw { status: 502, message: "Unable to reach Instagram API" };
  }
  if (response.status === 401 || response.status === 403) {
    throw { status: 401, message: "Invalid access token" };
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const err = body?.error as Record<string, unknown> | undefined;
    const code = typeof err?.code === "number" ? err.code : 0;
    if (code === 190 || code === 102) {
      throw { status: 401, message: "Invalid access token" };
    }
    throw { status: 502, message: "Instagram API returned an unexpected error" };
  }
}

async function validateFacebookToken(token: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(
      `https://graph.facebook.com/me?fields=id,name&access_token=${encodeURIComponent(token)}`
    );
  } catch {
    throw { status: 502, message: "Unable to reach Facebook API" };
  }
  if (response.status === 401 || response.status === 403) {
    throw { status: 401, message: "Invalid access token" };
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const err = body?.error as Record<string, unknown> | undefined;
    const code = typeof err?.code === "number" ? err.code : 0;
    if (code === 190 || code === 102) {
      throw { status: 401, message: "Invalid access token" };
    }
    throw { status: 502, message: "Facebook API returned an unexpected error" };
  }
}

function isValidationError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    "message" in err
  );
}

router.get("/auth/status", async (req, res) => {
  try {
    const tokens = await db
      .select()
      .from(tokensTable)
      .where(eq(tokensTable.connected, true));

    const statusMap: Record<string, {
      connected: boolean;
      accountName?: string;
      connectedAt?: Date;
      expiresAt?: Date | null;
    }> = {
      youtube: { connected: false },
      instagram: { connected: false },
      facebook: { connected: false },
    };

    for (const token of tokens) {
      statusMap[token.platform] = {
        connected: token.connected,
        accountName: token.accountName,
        connectedAt: token.connectedAt,
        expiresAt: token.expiresAt,
      };
    }

    res.json(statusMap);
  } catch (err) {
    req.log.error({ err }, "Error fetching auth status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/youtube/connect", async (req, res) => {
  const parsed = ConnectYoutubeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { accessToken, accountName } = parsed.data;

  try {
    await validateYoutubeToken(accessToken);
  } catch (err) {
    if (isValidationError(err)) {
      res.status(err.status).json({ error: err.message });
    } else {
      req.log.error({ err }, "Unexpected error validating YouTube token");
      res.status(502).json({ error: "Unable to validate token" });
    }
    return;
  }

  try {
    const encryptedToken = safeEncrypt(accessToken);

    await db.delete(tokensTable).where(eq(tokensTable.platform, "youtube"));
    await db.insert(tokensTable).values({
      platform: "youtube",
      accountName,
      accessToken: encryptedToken,
      connected: true,
    });

    res.json({ success: true, platform: "youtube", accountName });
  } catch (err) {
    req.log.error({ err }, "Error connecting YouTube");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/instagram/connect", async (req, res) => {
  const parsed = ConnectInstagramBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { accessToken, accountName } = parsed.data;

  try {
    await validateInstagramToken(accessToken);
  } catch (err) {
    if (isValidationError(err)) {
      res.status(err.status).json({ error: err.message });
    } else {
      req.log.error({ err }, "Unexpected error validating Instagram token");
      res.status(502).json({ error: "Unable to validate token" });
    }
    return;
  }

  try {
    const encryptedToken = safeEncrypt(accessToken);

    await db.delete(tokensTable).where(eq(tokensTable.platform, "instagram"));
    await db.insert(tokensTable).values({
      platform: "instagram",
      accountName,
      accessToken: encryptedToken,
      connected: true,
    });

    res.json({ success: true, platform: "instagram", accountName });
  } catch (err) {
    req.log.error({ err }, "Error connecting Instagram");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/facebook/connect", async (req, res) => {
  const parsed = ConnectFacebookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { accessToken, accountName } = parsed.data;

  try {
    await validateFacebookToken(accessToken);
  } catch (err) {
    if (isValidationError(err)) {
      res.status(err.status).json({ error: err.message });
    } else {
      req.log.error({ err }, "Unexpected error validating Facebook token");
      res.status(502).json({ error: "Unable to validate token" });
    }
    return;
  }

  try {
    const encryptedToken = safeEncrypt(accessToken);

    await db.delete(tokensTable).where(eq(tokensTable.platform, "facebook"));
    await db.insert(tokensTable).values({
      platform: "facebook",
      accountName,
      accessToken: encryptedToken,
      connected: true,
    });

    res.json({ success: true, platform: "facebook", accountName });
  } catch (err) {
    req.log.error({ err }, "Error connecting Facebook");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/:platform/disconnect", async (req, res) => {
  const parsed = DisconnectPlatformParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid platform" });
    return;
  }
  const { platform } = parsed.data;

  try {
    await db.delete(tokensTable).where(eq(tokensTable.platform, platform));
    res.json({ success: true, message: `${platform} disconnected successfully` });
  } catch (err) {
    req.log.error({ err }, "Error disconnecting platform");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
