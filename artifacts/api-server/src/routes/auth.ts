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
