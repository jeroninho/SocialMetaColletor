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

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

const statConfig = [
  {
    key: "totalFollowers",
    title: "Total de Seguidores",
    icon: Users,
    desc: "Em todas as plataformas",
    trend: +12.4,
  },
  {
    key: "totalViews",
    title: "Total de Visualizações",
    icon: Eye,
    desc: "Views acumulados",
    trend: +8.1,
  },
  {
    key: "totalEngagements",
    title: "Total de Engajamentos",
    icon: Heart,
    desc: "Curtidas, comentários e shares",
    trend: -2.3,
  },
  {
    key: "averageEngagementRate",
    title: "Taxa Média de Engajamento",
    icon: Activity,
    desc: "Performance agregada",
    trend: +1.7,
    isRate: true,
  },
];

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      <Icon className="w-3 h-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function Dashboard() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const tooltipStyle = getTooltipStyle(dark);
  const axisStyle    = getAxisStyle(dark);
  const gridColor    = getGridStyle(dark);

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3 h-72 rounded-md" />
          <Skeleton className="lg:col-span-2 h-72 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-md" />)}
        </div>
      </div>
    );
  }

  const pieData = summary.platformBreakdown.map((p) => ({
    name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    value: p.followers,
    color: PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS] ?? "hsl(var(--muted-foreground))",
  }));

  const barData = summary.platformBreakdown.map((p) => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    Seguidores: p.followers,
    raw: p.platform,
  }));

  const trendData = [
    { mes: "Nov", engaj: 38200 },
    { mes: "Dez", engaj: 44100 },
    { mes: "Jan", engaj: 57400 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statConfig.map((cfg) => {
          const Icon = cfg.icon;
          const raw = summary[cfg.key as keyof typeof summary] as number;
          const value = cfg.isRate ? `${raw.toFixed(2)}%` : fmt(raw);

          return (
            <Card key={cfg.key}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[13px] font-medium leading-tight pr-2 text-muted-foreground">
                    {cfg.title}
                  </p>
                  <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 bg-muted">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                </div>

                <p
                  className="text-3xl font-semibold tabular-nums tracking-tight text-foreground"
                  style={{ fontFamily: "var(--app-font-heading)" }}
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <Card className="lg:col-span-3">
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
                    cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                  />
                  <Bar dataKey="Seguidores" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {barData.map((entry) => (
                      <Cell
                        key={entry.platform}
                        fill={PLATFORM_COLORS[entry.raw as keyof typeof PLATFORM_COLORS] ?? (dark ? "hsl(0 0% 88%)" : "hsl(0 0% 12%)")}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
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
                    className="font-semibold tabular-nums"
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

      <Card>
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
                  stroke={dark ? "hsl(0 0% 92%)" : "hsl(0 0% 8%)"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-3 text-muted-foreground"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Visão por Plataforma
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.platformBreakdown.map((platform) => {
            return (
              <Card key={platform.platform}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="font-semibold capitalize text-sm"
                      style={{ fontFamily: "var(--app-font-heading)" }}
                    >
                      {platform.platform}
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {platform.connected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Seguidores", value: fmt(platform.followers) },
                      { label: "Conteúdo", value: fmt(platform.content) },
                      { label: "Taxa Eng.", value: `${platform.engagementRate.toFixed(1)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-md py-2.5 px-1 bg-muted/60">
                        <p
                          className="text-sm font-semibold tabular-nums"
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
