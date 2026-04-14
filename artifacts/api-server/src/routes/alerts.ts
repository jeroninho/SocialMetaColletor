import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, alertRulesTable, alertHistoryTable } from "@workspace/db";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const VALID_SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+$/;
const VALID_PLATFORMS = ["youtube", "instagram", "facebook", "tiktok", "twitter"];
const VALID_METRICS = ["views", "likes", "comments", "shares", "engagementRate", "followers"];
const VALID_CONDITIONS = ["above", "below"];
const VALID_CHANNELS = ["slack", "email"];

router.get("/alerts/rules", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  try {
    const rules = await db.select().from(alertRulesTable)
      .where(eq(alertRulesTable.userId, userId))
      .orderBy(desc(alertRulesTable.createdAt));
    res.json({ items: rules });
  } catch {
    res.json({ items: [] });
  }
});

router.post("/alerts/rules", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  const { name, platform, metric, condition, threshold, channel, webhookUrl, email } = req.body as {
    name: string;
    platform: string;
    metric: string;
    condition: string;
    threshold: number;
    channel: string;
    webhookUrl?: string;
    email?: string;
  };

  if (!name || !platform || !metric || !condition || !threshold || !channel) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (!VALID_PLATFORMS.includes(platform)) {
    res.status(400).json({ error: "Invalid platform" });
    return;
  }
  if (!VALID_METRICS.includes(metric)) {
    res.status(400).json({ error: "Invalid metric" });
    return;
  }
  if (!VALID_CONDITIONS.includes(condition)) {
    res.status(400).json({ error: "Invalid condition" });
    return;
  }
  if (!VALID_CHANNELS.includes(channel)) {
    res.status(400).json({ error: "Invalid channel" });
    return;
  }
  if (typeof threshold !== "number" || threshold <= 0) {
    res.status(400).json({ error: "Threshold must be a positive number" });
    return;
  }

  if (channel === "slack" && webhookUrl && !VALID_SLACK_WEBHOOK_PATTERN.test(webhookUrl)) {
    res.status(400).json({ error: "Invalid Slack webhook URL. Must be a valid hooks.slack.com URL." });
    return;
  }

  try {
    const [rule] = await db.insert(alertRulesTable).values({
      userId,
      name,
      platform,
      metric,
      condition,
      threshold,
      channel,
      webhookUrl: webhookUrl ?? null,
      email: email ?? null,
      enabled: true,
    }).returning();

    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: "Failed to create alert rule" });
  }
});

router.patch("/alerts/rules/:id/toggle", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  const id = parseInt(req.params.id);
  try {
    const existing = await db.select().from(alertRulesTable)
      .where(and(eq(alertRulesTable.id, id), eq(alertRulesTable.userId, userId)))
      .limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    const [updated] = await db.update(alertRulesTable)
      .set({ enabled: !existing[0].enabled })
      .where(and(eq(alertRulesTable.id, id), eq(alertRulesTable.userId, userId)))
      .returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to toggle rule" });
  }
});

router.delete("/alerts/rules/:id", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  const id = parseInt(req.params.id);
  try {
    await db.delete(alertRulesTable)
      .where(and(eq(alertRulesTable.id, id), eq(alertRulesTable.userId, userId)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

router.get("/alerts/history", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  try {
    const userRules = await db.select({ id: alertRulesTable.id }).from(alertRulesTable)
      .where(eq(alertRulesTable.userId, userId));
    const ruleIds = userRules.map((r) => r.id);
    if (ruleIds.length === 0) {
      res.json({ items: [] });
      return;
    }
    const history = await db.select().from(alertHistoryTable)
      .orderBy(desc(alertHistoryTable.sentAt))
      .limit(50);
    const filtered = history.filter((h) => ruleIds.includes(h.ruleId));
    res.json({ items: filtered });
  } catch {
    res.json({ items: [] });
  }
});

router.post("/alerts/test", authMiddleware, async (req, res) => {
  const { channel, webhookUrl, email } = req.body as { channel: string; webhookUrl?: string; email?: string };

  if (channel === "slack" && webhookUrl) {
    if (!VALID_SLACK_WEBHOOK_PATTERN.test(webhookUrl)) {
      res.status(400).json({ error: "Invalid Slack webhook URL. Must be a valid hooks.slack.com URL." });
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "🔔 Teste de alerta do SocialMetaCollector — configuração bem-sucedida!" }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (response.ok) {
        res.json({ success: true, message: "Mensagem de teste enviada ao Slack!" });
        return;
      }
      res.status(400).json({ error: "Webhook do Slack retornou erro" });
      return;
    } catch {
      res.status(500).json({ error: "Falha ao enviar para o Slack" });
      return;
    }
  }

  if (channel === "email" && email) {
    res.json({ success: true, message: `Alerta de teste seria enviado para ${email} (envio de e-mail não configurado)` });
    return;
  }

  res.status(400).json({ error: "Canal ou configuração inválida" });
});

export default router;
