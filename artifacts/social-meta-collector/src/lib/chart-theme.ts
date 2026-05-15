/**
 * Chart palette — neutral monochromatic Squarespace-inspired.
 * Platform marks kept muted; charts use foreground/muted scale.
 */
export const PLATFORM_COLORS = {
  youtube:   "#1A1A1A",
  instagram: "#3A3A3A",
  facebook:  "#5A5A5A",
  tiktok:    "#7A7A7A",
  twitter:   "#9A9A9A",
} as const;

export const CHART_PALETTE = [
  "#0F0F0F",
  "#3A3A3A",
  "#6E6E6E",
  "#9A9A9A",
  "#B8865B", // restrained warm accent
  "#5B6B7B", // restrained cool accent
] as const;

export function getTooltipStyle(isDark: boolean) {
  return {
    background: isDark ? "hsl(0 0% 10%)" : "#ffffff",
    border: `1px solid ${isDark ? "hsl(0 0% 18%)" : "hsl(30 8% 90%)"}`,
    borderRadius: 6,
    fontSize: 12,
    color: isDark ? "hsl(0 0% 92%)" : "hsl(0 0% 6%)",
    boxShadow: isDark
      ? "0 4px 12px rgba(0,0,0,0.4)"
      : "0 4px 12px rgba(0,0,0,0.06)",
    padding: "8px 12px",
  };
}

export function getAxisStyle(isDark: boolean) {
  return {
    tick: { fontSize: 11, fill: isDark ? "hsl(0 0% 58%)" : "hsl(0 0% 40%)" },
    stroke: isDark ? "hsl(0 0% 58%)" : "hsl(0 0% 40%)",
  };
}

export function getGridStyle(isDark: boolean) {
  return isDark ? "hsl(0 0% 18%)" : "hsl(30 8% 90%)";
}
