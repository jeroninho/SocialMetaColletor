import React from "react";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Heart, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  LineChart,
  Line,
} from "recharts";
import { useTheme } from "@/context/theme";
import {
  PLATFORM_COLORS,
  getTooltipStyle,
  getAxisStyle,
  getGridStyle,
} from "@/lib/chart-theme";

/* ── Helpers ─────────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

/* ── Stat card config ────────────────────────────────────── */
const statConfig = [
  {
    key: "totalFollowers",
    title: "Total de Seguidores",
    icon: Users,
    desc: "Em todas as plataformas",
    iconBg: "rgba(79,107,244,0.12)",
    iconColor: "#4F6BF4",
    trend: +12.4,
  },
  {
    key: "totalViews",
    title: "Total de Visualizações",
    icon: Eye,
    desc: "Views acumulados",
    iconBg: "rgba(24,119,242,0.12)",
    iconColor: "#1877F2",
    trend: +8.1,
  },
  {
    key: "totalEngagements",
    title: "Total de Engajamentos",
    icon: Heart,
    desc: "Curtidas, comentários e shares",
    iconBg: "rgba(225,48,108,0.12)",
    iconColor: "#E1306C",
    trend: -2.3,
  },
  {
    key: "averageEngagementRate",
    title: "Taxa Média de Engajamento",
    icon: Activity,
    desc: "Performance agregada",
    iconBg: "rgba(76,175,80,0.12)",
    iconColor: "#4CAF50",
    trend: +1.7,
    isRate: true,
  },
];

/* ── Skeleton ────────────────────────────────────────────── */
function StatCardSkeleton() {
  return (
    <Card className="border-border/40 card-static">
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-32 skeleton-shimmer" />
          <Skeleton className="h-10 w-10 rounded-xl skeleton-shimmer" />
        </div>
        <Skeleton className="h-9 w-28 skeleton-shimmer" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-36 skeleton-shimmer" />
          <Skeleton className="h-3 w-12 skeleton-shimmer" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Trend badge ─────────────────────────────────────────── */
function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: up ? "rgba(76,175,80,0.14)" : "rgba(244,67,54,0.14)",
        color: up ? "#4CAF50" : "#F44336",
      }}
    >
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* ── Dashboard ───────────────────────────────────────────── */
export default function Dashboard() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const tooltipStyle = getTooltipStyle(dark);
  const axisStyle    = getAxisStyle(dark);
  const gridColor    = getGridStyle(dark);

  /* Skeleton state */
  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3 h-72 rounded-2xl skeleton-shimmer" />
          <Skeleton className="lg:col-span-2 h-72 rounded-2xl skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-2xl skeleton-shimmer" />)}
        </div>
      </div>
    );
  }

  /* Chart data */
  const pieData = summary.platformBreakdown.map((p) => ({
    name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    value: p.followers,
    color: PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS] ?? "#888",
  }));

  const barData = summary.platformBreakdown.map((p) => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    Seguidores: p.followers,
    raw: p.platform,
  }));

  /* Engagement trend sparkline mock */
  const trendData = [
    { mes: "Nov", engaj: 38200 },
    { mes: "Dez", engaj: 44100 },
    { mes: "Jan", engaj: 57400 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-98 duration-300">

      {/* ── Stat cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statConfig.map((cfg) => {
          const Icon = cfg.icon;
          const raw = summary[cfg.key as keyof typeof summary] as number;
          const value = cfg.isRate ? `${raw.toFixed(2)}%` : fmt(raw);

          return (
            <Card
              key={cfg.key}
              className="border-border/40 overflow-hidden group"
            >
              {/* Thin accent bar on top */}
              <div
                className="h-0.5 w-full"
                style={{
                  background: `linear-gradient(90deg, ${cfg.iconColor}, transparent)`,
                }}
              />
              <CardContent className="pt-4 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <p
                    className="text-[13px] font-medium leading-tight pr-2"
                    style={{ color: dark ? "#E0E0E0" : "#4B5563" }}
                  >
                    {cfg.title}
                  </p>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.iconBg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: cfg.iconColor }} />
                  </div>
                </div>

                {/* Big metric number */}
                <p
                  className="text-3xl font-bold tabular-nums tracking-tight"
                  style={{
                    fontFamily: "var(--app-font-heading)",
                    color: dark ? "#FFFFFF" : "#111827",
                  }}
                >
                  {value}
                </p>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-[12px] text-muted-foreground">{cfg.desc}</p>
                  <TrendBadge value={cfg.trend} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Charts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Bar chart */}
        <Card className="lg:col-span-3 border-border/40">
          <CardHeader className="pb-1 pt-5">
            <CardTitle
              className="text-base"
              style={{ fontFamily: "var(--app-font-heading)" }}
            >
              Seguidores por Plataforma
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Últimos dados coletados
            </p>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="chart-scroll-mobile">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
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
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [fmt(v), "Seguidores"]}
                    cursor={{ fill: "rgba(79,107,244,0.07)" }}
                  />
                  <Bar dataKey="Seguidores" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {barData.map((entry) => (
                      <Cell
                        key={entry.platform}
                        fill={PLATFORM_COLORS[entry.raw as keyof typeof PLATFORM_COLORS] ?? "#6C63FF"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie + legend */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="pb-1 pt-5">
            <CardTitle
              className="text-base"
              style={{ fontFamily: "var(--app-font-heading)" }}
            >
              Distribuição de Audiência
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Resumo das contas conectadas
            </p>
          </CardHeader>
          <CardContent className="pb-5">
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
                  strokeWidth={0}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [fmt(v), "Seguidores"]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-col gap-2 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                  <span
                    className="font-bold tabular-nums"
                    style={{ fontFamily: "var(--app-font-heading)" }}
                  >
                    {fmt(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Engagement trend sparkline ──────────────── */}
      <Card className="border-border/40">
        <CardHeader className="pb-1 pt-5">
          <CardTitle
            className="text-base"
            style={{ fontFamily: "var(--app-font-heading)" }}
          >
            Tendência de Engajamento
          </CardTitle>
          <p className="text-xs text-muted-foreground">Últimos 3 meses</p>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="chart-scroll-mobile">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trendData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="mes" tick={axisStyle.tick} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle.tick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), "Engajamento"]} />
                <Line
                  type="monotone"
                  dataKey="engaj"
                  stroke="#4F6BF4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#4F6BF4", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#4F6BF4" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Platform cards ─────────────────────────── */}
      <div>
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-3 text-muted-foreground"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Visão por Plataforma
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.platformBreakdown.map((platform) => {
            const color = PLATFORM_COLORS[platform.platform as keyof typeof PLATFORM_COLORS] ?? "#888";
            return (
              <Card
                key={platform.platform}
                className="border-border/40 overflow-hidden"
              >
                {/* Platform color top bar */}
                <div
                  className="h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }}
                />
                <CardContent className="pt-4 pb-5">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="font-bold capitalize text-sm"
                      style={{ fontFamily: "var(--app-font-heading)" }}
                    >
                      {platform.platform}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: platform.connected
                          ? `${color}22`
                          : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                        color: platform.connected ? color : "var(--color-muted-foreground)",
                      }}
                    >
                      {platform.connected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Seguidores", value: fmt(platform.followers) },
                      { label: "Conteúdo", value: fmt(platform.content) },
                      { label: "Taxa Eng.", value: `${platform.engagementRate.toFixed(1)}%` },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl py-2.5 px-1"
                        style={{
                          background: dark ? "rgba(255,255,255,0.05)" : "rgba(30,42,56,0.05)",
                        }}
                      >
                        <p
                          className="text-sm font-bold tabular-nums"
                          style={{ fontFamily: "var(--app-font-heading)" }}
                        >
                          {value}
                        </p>
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
