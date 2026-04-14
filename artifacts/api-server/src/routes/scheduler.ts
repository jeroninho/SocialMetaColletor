import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, syncSchedulesTable } from "@workspace/db";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const activeTimers = new Map<number, NodeJS.Timeout>();

const VALID_PLATFORMS = ["youtube", "instagram", "facebook", "tiktok", "twitter"];
const MAX_INTERVAL = 1440;
const MIN_INTERVAL = 5;

async function runSyncForPlatforms(platforms: string[]) {
  for (const platform of platforms) {
    try {
      const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
      const response = await fetch(`${baseUrl}/api/${platform}/analytics`);
      if (response.ok) {
        console.log(`[Scheduler] Synced ${platform} metrics`);
      } else {
        console.warn(`[Scheduler] Failed to sync ${platform}: ${response.status}`);
      }
    } catch (err) {
      console.error(`[Scheduler] Error syncing ${platform}:`, err);
    }
  }
}

function scheduleSync(scheduleId: number, intervalMinutes: number, platforms: string[]) {
  clearSchedule(scheduleId);
  const timer = setInterval(async () => {
    try {
      const schedule = await db.select().from(syncSchedulesTable).where(eq(syncSchedulesTable.id, scheduleId)).limit(1);
      if (!schedule[0] || !schedule[0].enabled) {
        clearSchedule(scheduleId);
        return;
      }
      await runSyncForPlatforms(platforms);
      await db.update(syncSchedulesTable).set({ lastRunAt: new Date() }).where(eq(syncSchedulesTable.id, scheduleId));
      console.log(`[Scheduler] Auto-sync executed for platforms: ${platforms.join(", ")}`);
    } catch (err) {
      console.error("[Scheduler] Sync error:", err);
    }
  }, intervalMinutes * 60 * 1000);
  activeTimers.set(scheduleId, timer);
}

function clearSchedule(scheduleId: number) {
  const existing = activeTimers.get(scheduleId);
  if (existing) {
    clearInterval(existing);
    activeTimers.delete(scheduleId);
  }
}

async function rehydrateSchedules() {
  try {
    const schedules = await db.select().from(syncSchedulesTable).where(eq(syncSchedulesTable.enabled, true));
    for (const schedule of schedules) {
      scheduleSync(schedule.id, schedule.intervalMinutes, schedule.platforms.split(","));
    }
    if (schedules.length > 0) {
      console.log(`[Scheduler] Rehydrated ${schedules.length} active schedule(s)`);
    }
  } catch (err) {
    console.error("[Scheduler] Failed to rehydrate schedules:", err);
  }
}

rehydrateSchedules();

router.get("/scheduler/schedules", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  try {
    const schedules = await db.select().from(syncSchedulesTable)
      .where(eq(syncSchedulesTable.userId, userId))
      .orderBy(desc(syncSchedulesTable.createdAt));
    res.json({ items: schedules });
  } catch {
    res.json({ items: [] });
  }
});

router.post("/scheduler/schedules", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  const { platforms, intervalMinutes } = req.body as { platforms: string[]; intervalMinutes: number };

  if (!platforms?.length || !intervalMinutes) {
    res.status(400).json({ error: "Platforms and interval are required" });
    return;
  }

  if (typeof intervalMinutes !== "number" || intervalMinutes < MIN_INTERVAL || intervalMinutes > MAX_INTERVAL) {
    res.status(400).json({ error: `Interval must be between ${MIN_INTERVAL} and ${MAX_INTERVAL} minutes` });
    return;
  }

  const invalidPlatforms = platforms.filter((p) => !VALID_PLATFORMS.includes(p));
  if (invalidPlatforms.length > 0) {
    res.status(400).json({ error: `Invalid platforms: ${invalidPlatforms.join(", ")}` });
    return;
  }

  try {
    const [schedule] = await db.insert(syncSchedulesTable).values({
      userId,
      platforms: platforms.join(","),
      intervalMinutes,
      enabled: true,
    }).returning();

    scheduleSync(schedule.id, intervalMinutes, platforms);
    res.json(schedule);
  } catch {
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

router.patch("/scheduler/schedules/:id/toggle", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  const id = parseInt(req.params.id);
  try {
    const existing = await db.select().from(syncSchedulesTable)
      .where(and(eq(syncSchedulesTable.id, id), eq(syncSchedulesTable.userId, userId)))
      .limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }
    const newEnabled = !existing[0].enabled;
    const [updated] = await db.update(syncSchedulesTable).set({ enabled: newEnabled })
      .where(and(eq(syncSchedulesTable.id, id), eq(syncSchedulesTable.userId, userId)))
      .returning();

    if (newEnabled) {
      scheduleSync(id, existing[0].intervalMinutes, existing[0].platforms.split(","));
    } else {
      clearSchedule(id);
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to toggle schedule" });
  }
});

router.delete("/scheduler/schedules/:id", authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  const id = parseInt(req.params.id);
  try {
    clearSchedule(id);
    await db.delete(syncSchedulesTable)
      .where(and(eq(syncSchedulesTable.id, id), eq(syncSchedulesTable.userId, userId)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

export default router;
