import { Router } from "express";
import crypto from "crypto";

const router = Router();

const META_APP_SECRET = process.env["META_APP_SECRET"] ?? "";
const META_VERIFY_TOKEN = process.env["META_WEBHOOK_VERIFY_TOKEN"] ?? "smc_verify_token";

function verifyMetaSignature(req: { headers: Record<string, string | string[] | undefined>; rawBody?: Buffer }): boolean {
  if (!META_APP_SECRET) return true;
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", META_APP_SECRET).update(req.rawBody ?? Buffer.alloc(0)).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

router.get("/webhooks/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
    console.info("[Webhook] Meta webhook verified");
    res.status(200).send(challenge);
    return;
  }

  res.status(403).json({ error: "verification_failed" });
});

router.post("/webhooks/meta", (req, res) => {
  if (!verifyMetaSignature(req as unknown as Parameters<typeof verifyMetaSignature>[0])) {
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  const body = req.body as {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{
        field?: string;
        value?: Record<string, unknown>;
      }>;
    }>;
  };

  if (body.object !== "page" && body.object !== "instagram") {
    res.sendStatus(200);
    return;
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const { field, value } = change;

      switch (field) {
        case "feed":
          console.info("[Webhook] New Facebook feed event", { entryId: entry.id, value });
          break;
        case "mentions":
          console.info("[Webhook] New Instagram mention", { entryId: entry.id, value });
          break;
        case "comments":
          console.info("[Webhook] New comment event", { entryId: entry.id, value });
          break;
        case "likes":
          console.info("[Webhook] New like event", { entryId: entry.id, value });
          break;
        default:
          console.info(`[Webhook] Unhandled field: ${field}`, { value });
      }
    }
  }

  res.sendStatus(200);
});

export default router;
