import React from "react";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Heart, Activity, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useTheme } from "@/context/theme";
import {
  PLATFORM_COLORS,
  getTooltipStyle,
  getAxisStyle,
  getGridStyle,
} from "@/lib/chart-theme";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const statConfig = [
  {
    key: "totalFollowers",
    title: "Total Followers",
    icon: Users,
    desc: "Across all platforms",
    gradient: "from-violet-500/10 to-purple-500/5",
    accent: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950",
    iconColor: "#7C6FEA",
  },
  {
    key: "totalViews",
    title: "Total Views",
    icon: Eye,
    desc: "Lifetime video views",
    gradient: "from-blue-500/10 to-cyan-500/5",
    accent: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950",
    iconColor: "#2D88FF",
  },
  {
    key: "totalEngagements",
    title: "Total Engagements",
    icon: Heart,
    desc: "Likes, comments & shares",
    gradient: "from-rose-500/10 to-pink-500/5",
    accent: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950",
    iconColor: "#E1306C",
  },
  {
    key: "averageEngagementRate",
    title: "Avg Engagement Rate",
    icon: Activity,
    desc: "Aggregated performance",
    gradient: "from-emerald-500/10 to-teal-500/5",
    accent: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    iconColor: "#10B981",
    isRate: true,
  },
];

function StatCardSkeleton() {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const tooltipStyle = getTooltipStyle(dark);
  const axisStyle = getAxisStyle(dark);
  const gridColor = getGridStyle(dark);

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const pieData = summary.platformBreakdown.map((p) => ({
    name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    value: p.followers,
    color: PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS] ?? "#888",
  }));

  const barData = summary.platformBreakdown.map((p) => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    Followers: p.followers,
    raw: p.platform,
  }));

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statConfig.map((cfg) => {
          const Icon = cfg.icon;
          const raw = summary[cfg.key as keyof typeof summary] as number;
          const value = cfg.isRate ? `${raw.toFixed(2)}%` : fmt(raw);
          return (
            <Card
              key={cfg.key}
              className={`border-border/50 shadow-sm hover:shadow-md bg-gradient-to-br ${cfg.gradient} transition-all duration-200`}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-sm font-medium text-muted-foreground leading-tight pr-2">{cfg.title}</p>
                  <div
                    className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}
                  >
                    <Icon className="w-4 h-4" style={{ color: cfg.iconColor }} />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-500">
                    <ArrowUpRight className="w-3 h-3" /> live
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border-border/50 shadow-sm">
          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Platform Followers</CardTitle>
            <p className="text-xs text-muted-foreground">Seguidores por plataforma</p>
          </CardHeader>
          <CardContent className="pb-5">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="platform"
                  tick={axisStyle.tick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={axisStyle.tick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), "Followers"]} />
                <Bar dataKey="Followers" radius={[8, 8, 0, 0]} maxBarSize={56}>
                  {barData.map((entry) => (
                    <Cell
                      key={entry.platform}
                      fill={PLATFORM_COLORS[entry.raw as keyof typeof PLATFORM_COLORS] ?? "#7C6FEA"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-sm font-semibold">Audience Share</CardTitle>
            <p className="text-xs text-muted-foreground">Distribuicao de seguidores</p>
          </CardHeader>
          <CardContent className="pb-5">
            <ResponsiveContainer width="100%" height={165}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), "Followers"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{fmt(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform cards */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Platform Overview
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.platformBreakdown.map((platform) => {
            const color = PLATFORM_COLORS[platform.platform as keyof typeof PLATFORM_COLORS] ?? "#888";
            return (
              <Card
                key={platform.platform}
                className="border-border/50 shadow-sm hover:shadow-md overflow-hidden transition-all"
              >
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
                <CardContent className="pt-4 pb-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold capitalize text-sm">{platform.platform}</span>
                    <Badge
                      className="text-[10px] rounded-full px-2.5 font-medium border-0"
                      style={
                        platform.connected
                          ? { background: `${color}20`, color }
                          : undefined
                      }
                      variant={platform.connected ? "outline" : "secondary"}
                    >
                      {platform.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Followers", value: fmt(platform.followers) },
                      { label: "Content", value: fmt(platform.content) },
                      { label: "Eng. Rate", value: `${platform.engagementRate.toFixed(1)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted/40 rounded-xl py-2.5 px-1">
                        <p className="text-sm font-bold tabular-nums">{value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
