import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Eye, Heart, MessageCircle, Share2, TrendingUp, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/context/theme";
import { PLATFORM_COLORS, getTooltipStyle, getAxisStyle, getGridStyle } from "@/lib/chart-theme";
import { getApiUrl, authFetch } from "@/lib/api-url";

function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const ALL_PLATFORMS = ["youtube", "instagram", "facebook", "tiktok", "twitter"];

export default function ComparatorPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const tooltipStyle = getTooltipStyle(dark);
  const axisStyle = getAxisStyle(dark);
  const gridColor = getGridStyle(dark);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube", "instagram"]);
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-01-31");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const fetchComparison = () => {
    if (selectedPlatforms.length === 0) return;
    setLoading(true);
    const base = getApiUrl();
    const params = new URLSearchParams({
      platforms: selectedPlatforms.join(","),
      startDate,
      endDate,
    });
    authFetch(`${base}comparator?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchComparison(); }, []);

  const comparison = data?.comparison ?? [];

  const metricsData = comparison.map((c: any) => ({
    platform: c.platform.charAt(0).toUpperCase() + c.platform.slice(1),
    raw: c.platform,
    Views: c.summary.totalViews,
    Likes: c.summary.totalLikes,
    Comments: c.summary.totalComments,
    Shares: c.summary.totalShares,
    Followers: c.summary.followers,
    "Eng. Rate": c.summary.avgEngagementRate,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-lg font-semibold">Comparador de Campanhas</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Compare métricas entre plataformas e períodos
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Plataformas</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedPlatforms.includes(p)
                      ? "text-white border-transparent"
                      : "text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                  style={
                    selectedPlatforms.includes(p)
                      ? { backgroundColor: PLATFORM_COLORS[p as keyof typeof PLATFORM_COLORS] }
                      : {}
                  }
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-background"
              />
            </div>
            <Button size="sm" onClick={fetchComparison} disabled={loading || selectedPlatforms.length === 0}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : comparison.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {comparison.map((c: any) => {
              const color = PLATFORM_COLORS[c.platform as keyof typeof PLATFORM_COLORS] ?? "#888";
              return (
                <Card key={c.platform} className="overflow-hidden">
                  <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm capitalize">{c.platform}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {c.period.days} dias
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Eye, label: "Views", value: fmt(c.summary.totalViews) },
                        { icon: Heart, label: "Curtidas", value: fmt(c.summary.totalLikes) },
                        { icon: MessageCircle, label: "Comentários", value: fmt(c.summary.totalComments) },
                        { icon: Share2, label: "Shares", value: fmt(c.summary.totalShares) },
                        { icon: Users, label: "Seguidores", value: fmt(c.summary.followers) },
                        { icon: TrendingUp, label: "Eng. Rate", value: `${c.summary.avgEngagementRate}%` },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-sm font-bold tabular-nums">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Comparação Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metricsData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="platform" tick={axisStyle.tick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle.tick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), ""]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Views" fill="#6C63FF" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Likes" fill="#FF6F91" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Comments" fill="#2D88FF" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Shares" fill="#2EC4B6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="py-12 text-center">
          <p className="text-muted-foreground">Selecione plataformas e clique em "Comparar"</p>
        </Card>
      )}
    </div>
  );
}
