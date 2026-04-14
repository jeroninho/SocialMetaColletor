import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const VALID_PLATFORMS = ["youtube", "instagram", "facebook", "tiktok", "twitter"];

const platformData: Record<string, { followers: number; views: number; likes: number; comments: number; shares: number; engagementRate: number; content: number; growthRate: number }> = {
  youtube: { followers: 184200, views: 434400, likes: 25592, comments: 1187, shares: 0, engagementRate: 5.82, content: 5, growthRate: 3.2 },
  instagram: { followers: 42800, views: 237700, likes: 18010, comments: 1168, shares: 0, engagementRate: 7.59, content: 5, growthRate: 5.8 },
  facebook: { followers: 31200, views: 209600, likes: 9560, comments: 836, shares: 822, engagementRate: 6.81, content: 5, growthRate: 2.4 },
  tiktok: { followers: 324000, views: 5491000, likes: 452500, comments: 21520, shares: 79300, engagementRate: 10.07, content: 5, growthRate: 12.5 },
  twitter: { followers: 89400, views: 1440000, likes: 33210, comments: 1734, shares: 9332, engagementRate: 3.07, content: 5, growthRate: 7.3 },
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr: string): boolean {
  if (!ISO_DATE_PATTERN.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function generatePeriodData(platform: string, startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const base = platformData[platform];
  if (!base) return null;

  const points = [];
  const numPoints = Math.min(days, 12);
  const interval = days / numPoints;

  for (let i = 0; i < numPoints; i++) {
    const date = new Date(start.getTime() + i * interval * 24 * 60 * 60 * 1000);
    const variation = 0.8 + Math.random() * 0.4;
    points.push({
      date: date.toISOString().split("T")[0],
      views: Math.round((base.views / numPoints) * variation),
      likes: Math.round((base.likes / numPoints) * variation),
      comments: Math.round((base.comments / numPoints) * variation),
      shares: Math.round((base.shares / numPoints) * variation),
      engagementRate: parseFloat((base.engagementRate * variation).toFixed(2)),
    });
  }

  return {
    platform,
    period: { startDate, endDate, days },
    summary: {
      totalViews: points.reduce((s, p) => s + p.views, 0),
      totalLikes: points.reduce((s, p) => s + p.likes, 0),
      totalComments: points.reduce((s, p) => s + p.comments, 0),
      totalShares: points.reduce((s, p) => s + p.shares, 0),
      avgEngagementRate: parseFloat((points.reduce((s, p) => s + p.engagementRate, 0) / points.length).toFixed(2)),
      followers: base.followers,
      growthRate: base.growthRate,
    },
    dataPoints: points,
  };
}

router.get("/comparator", authMiddleware, async (req, res) => {
  const platformsRaw = (req.query.platforms as string) || "";
  const startDate = (req.query.startDate as string) || "";
  const endDate = (req.query.endDate as string) || "";

  if (!platformsRaw.trim()) {
    res.status(400).json({ error: "platforms parameter is required" });
    return;
  }

  const platforms = platformsRaw.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
  const invalidPlatforms = platforms.filter((p) => !VALID_PLATFORMS.includes(p));
  if (invalidPlatforms.length > 0) {
    res.status(400).json({ error: `Invalid platforms: ${invalidPlatforms.join(", ")}. Valid: ${VALID_PLATFORMS.join(", ")}` });
    return;
  }

  const effectiveStart = startDate || "2025-01-01";
  const effectiveEnd = endDate || "2025-01-31";

  if (!isValidDate(effectiveStart) || !isValidDate(effectiveEnd)) {
    res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    return;
  }

  if (new Date(effectiveStart) >= new Date(effectiveEnd)) {
    res.status(400).json({ error: "startDate must be before endDate" });
    return;
  }

  const results = platforms
    .map((p) => generatePeriodData(p, effectiveStart, effectiveEnd))
    .filter(Boolean);

  res.json({
    comparison: results,
    availablePlatforms: VALID_PLATFORMS,
  });
});

export default router;
