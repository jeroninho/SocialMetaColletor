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
  Legend,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const platformColors: Record<string, string> = {
  youtube: "#FF0000",
  instagram: "#E1306C",
  facebook: "#1877F2",
  tiktok: "#69C9D0",
  twitter: "#1DA1F2",
};

const statConfig = [
  {
    key: "totalFollowers",
    title: "Total Followers",
    icon: Users,
    desc: "Across all platforms",
    gradient: "from-violet-500/10 to-purple-500/5",
    accent: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950",
  },
  {
    key: "totalViews",
    title: "Total Views",
    icon: Eye,
    desc: "Lifetime video views",
    gradient: "from-blue-500/10 to-cyan-500/5",
    accent: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-950",
  },
  {
    key: "totalEngagements",
    title: "Total Engagements",
    icon: Heart,
    desc: "Likes, comments & shares",
    gradient: "from-rose-500/10 to-pink-500/5",
    accent: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950",
  },
  {
    key: "averageEngagementRate",
    title: "Avg Engagement Rate",
    icon: Activity,
    desc: "Aggregated performance",
    gradient: "from-emerald-500/10 to-teal-500/5",
    accent: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950",
    suffix: "%",
    isRate: true,
  },
];

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const pieData = summary.platformBreakdown.map((p) => ({
    name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    value: p.followers,
    color: platformColors[p.platform] ?? "#888",
  }));

  const barData = summary.platformBreakdown.map((p) => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    Followers: p.followers,
    Engagement: Number(p.engagementRate.toFixed(2)),
    Content: p.content,
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
              className={`border-border/60 bg-gradient-to-br ${cfg.gradient} hover:shadow-md transition-all duration-200 group`}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{cfg.title}</p>
                  <div className={`w-9 h-9 rounded-lg ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${cfg.accent}`} />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                  <div className="flex items-center gap-0.5 text-emerald-500 text-xs font-medium">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>live</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{cfg.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar chart - followers per platform */}
        <Card className="lg:col-span-3 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Platform Followers</CardTitle>
            <p className="text-xs text-muted-foreground">Followers breakdown by platform</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="platform" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmt(v)} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(v: number, name: string) => [name === "Followers" ? fmt(v) : v, name]}
                />
                <Bar dataKey="Followers" radius={[6, 6, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell
                      key={entry.platform}
                      fill={platformColors[entry.platform.toLowerCase()] ?? "hsl(var(--primary))"}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie chart - audience share */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Audience Share</CardTitle>
            <p className="text-xs text-muted-foreground">Follower distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmt(v), "Followers"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-1">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">{fmt(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Platform Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.platformBreakdown.map((platform) => {
            const color = platformColors[platform.platform] ?? "#888";
            return (
              <Card key={platform.platform} className="border-border/60 overflow-hidden hover:shadow-md transition-all">
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold capitalize text-sm">{platform.platform}</span>
                    <Badge
                      variant={platform.connected ? "default" : "secondary"}
                      className="text-[10px] rounded-full"
                      style={platform.connected ? { background: color, color: "#fff", border: "none" } : {}}
                    >
                      {platform.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold tabular-nums">{fmt(platform.followers)}</p>
                      <p className="text-[10px] text-muted-foreground">Followers</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">{fmt(platform.content)}</p>
                      <p className="text-[10px] text-muted-foreground">Content</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">{platform.engagementRate.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">Eng. Rate</p>
                    </div>
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
