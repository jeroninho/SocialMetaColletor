export const PLATFORM_COLORS = {
  youtube: "#FF4444",
  instagram: "#E1306C",
  facebook: "#2D88FF",
  tiktok: "#2EC4B6",
  twitter: "#1DA1F2",
} as const;

export const CHART_PALETTE = [
  "#4F6BF4",
  "#FF4444",
  "#E1306C",
  "#2D88FF",
  "#2EC4B6",
  "#F59E0B",
] as const;

export function getTooltipStyle(isDark: boolean) {
  return {
    background: isDark ? "hsl(230 20% 16%)" : "#ffffff",
    border: `1px solid ${isDark ? "hsl(230 18% 22%)" : "hsl(220 20% 90%)"}`,
    borderRadius: 6,
    fontSize: 12,
    color: isDark ? "hsl(220 20% 90%)" : "hsl(224 47% 12%)",
    boxShadow: isDark
      ? "0 8px 24px rgba(0,0,0,0.4)"
      : "0 8px 24px rgba(0,0,0,0.08)",
    padding: "8px 12px",
  };
}

export function getAxisStyle(isDark: boolean) {
  return {
    tick: { fontSize: 11, fill: isDark ? "hsl(220 12% 55%)" : "hsl(220 10% 50%)" },
    stroke: isDark ? "hsl(220 12% 55%)" : "hsl(220 10% 50%)",
  };
}

export function getGridStyle(isDark: boolean) {
  return isDark ? "hsl(230 18% 20%)" : "hsl(220 20% 92%)";
}
