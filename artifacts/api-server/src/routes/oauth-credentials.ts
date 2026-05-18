import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, oauthCredentialsTable } from "@workspace/db";
import { encryptToken, decryptToken } from "../utils/crypto.js";
import { authMiddleware } from "../middleware/auth.js";
import { cacheDelByPattern } from "../services/RedisClient.js";

const router = Router();

const SUPPORTED_PLATFORMS = ["youtube", "instagram", "facebook", "tiktok", "twitter"] as const;
type Platform = typeof SUPPORTED_PLATFORMS[number];

const ENV_MAP: Record<Platform, { idKey: string; secretKey: string }> = {
  youtube: { idKey: "YOUTUBE_CLIENT_ID", secretKey: "YOUTUBE_CLIENT_SECRET" },
  instagram: { idKey: "INSTAGRAM_CLIENT_ID", secretKey: "INSTAGRAM_CLIENT_SECRET" },
  facebook: { idKey: "FACEBOOK_CLIENT_ID", secretKey: "FACEBOOK_CLIENT_SECRET" },
  tiktok: { idKey: "TIKTOK_CLIENT_KEY", secretKey: "TIKTOK_CLIENT_SECRET" },
  twitter: { idKey: "TWITTER_CLIENT_ID", secretKey: "TWITTER_CLIENT_SECRET" },
};

function isSupported(p: string): p is Platform {
  return (SUPPORTED_PLATFORMS as readonly string[]).includes(p);
}

function safeDecrypt(s: string): string {
  try {
    return decryptToken(s);
  } catch {
    return s;
  }
}

function preview(s: string): string {
  if (s.length <= 8) return "•".repeat(s.length);
  return s.slice(0, 4) + "…" + s.slice(-4);
}

const upsertSchema = z.object({
  clientId: z.string().min(1, "clientId required").max(512),
  clientSecret: z.string().min(1, "clientSecret required").max(512),
});

router.get("/oauth-credentials", authMiddleware, async (_req, res) => {
  const rows = await db.select().from(oauthCredentialsTable);
  const dbMap = new Map(rows.map((r) => [r.platform, r]));

  const result = SUPPORTED_PLATFORMS.map((platform) => {
    const dbRow = dbMap.get(platform);
    if (dbRow) {
      const decrypted = safeDecrypt(dbRow.clientId);
      return {
        platform,
        source: "db" as const,
        clientIdPreview: preview(decrypted),
        updatedAt: dbRow.updatedAt,
      };
    }
    const { idKey, secretKey } = ENV_MAP[platform];
    const envId = process.env[idKey];
    const envSecret = process.env[secretKey];
    if (envId && envSecret) {
      return { platform, source: "env" as const, clientIdPreview: preview(envId), updatedAt: null };
    }
    return { platform, source: "none" as const, clientIdPreview: null, updatedAt: null };
  });

  res.json({ credentials: result });
});

router.put("/oauth-credentials/:platform", authMiddleware, async (req, res) => {
  const platform = String(req.params.platform);
  if (!isSupported(platform)) {
    res.status(400).json({ error: "unsupported_platform", message: `Platform must be one of: ${SUPPORTED_PLATFORMS.join(", ")}` });
    return;
  }
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const encryptedId = encryptToken(parsed.data.clientId.trim());
  const encryptedSecret = encryptToken(parsed.data.clientSecret.trim());
  const now = new Date();

  await db
    .insert(oauthCredentialsTable)
    .values({ platform, clientId: encryptedId, clientSecret: encryptedSecret, updatedAt: now })
    .onConflictDoUpdate({
      target: oauthCredentialsTable.platform,
      set: { clientId: encryptedId, clientSecret: encryptedSecret, updatedAt: now },
    });

  await cacheDelByPattern("auth:config:");
  res.json({ ok: true, platform, source: "db", clientIdPreview: preview(parsed.data.clientId.trim()) });
});

router.delete("/oauth-credentials/:platform", authMiddleware, async (req, res) => {
  const platform = String(req.params.platform);
  if (!isSupported(platform)) {
    res.status(400).json({ error: "unsupported_platform" });
    return;
  }
  await db.delete(oauthCredentialsTable).where(eq(oauthCredentialsTable.platform, platform));
  await cacheDelByPattern("auth:config:");
  res.json({ ok: true, platform });
});

export default router;
