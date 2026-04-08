import React, { useState } from "react";
import {
  useListRecentMetadata,
  getListRecentMetadataQueryKey,
  useGetEngagementTrends,
  getGetEngagementTrendsQueryKey,
  useSyncAllMetadata,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Youtube, Instagram, Facebook } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const platformBadge: Record<string, { color: string; hex: string; icon: React.ReactNode }> = {
  youtube: { color: "text-[#FF0000]", hex: "#FF0000", icon: <Youtube className="w-3 h-3" /> },
  instagram: { color: "text-[#E1306C]", hex: "#E1306C", icon: <Instagram className="w-3 h-3" /> },
  facebook: { color: "text-[#1877F2]", hex: "#1877F2", icon: <Facebook className="w-3 h-3" /> },
};

type ChartTab = "line" | "bar" | "pie";

export default function Reports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [chartTab, setChartTab] = useState<ChartTab>("line");

  const { data: recentData, isLoading: loadingRecent } = useListRecentMetadata(
    { limit: 10 },
    { query: { queryKey: getListRecentMetadataQueryKey({ limit: 10 }) } }
  );

  const { data: trends, isLoading: loadingTrends } = useGetEngagementTrends({
    query: { queryKey: getGetEngagementTrendsQueryKey() },
  });

  const sync = useSyncAllMetadata();

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync();
      toast({
        title: "Sync complete",
        description: `Synced: ${result.platformsSynced.join(", ")}`,
      });
      queryClient.invalidateQueries({ queryKey: getListRecentMetadataQueryKey({ limit: 10 }) });
    } catch {
      toast({ title: "Sync failed", description: "Could not sync metadata.", variant: "destructive" });
    }
  };

  const chartData = trends?.dataPoints.map((dp) => ({
    date: new Date(dp.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
    YouTube: dp.youtube,
    Instagram: dp.instagram,
    Facebook: dp.facebook,
  }));

  const pieData = [
    { name: "YouTube", value: trends?.dataPoints.reduce((s, d) => s + d.youtube, 0) ?? 0, color: "#FF0000" },
    { name: "Instagram", value: trends?.dataPoints.reduce((s, d) => s + d.instagram, 0) ?? 0, color: "#E1306C" },
    { name: "Facebook", value: trends?.dataPoints.reduce((s, d) => s + d.facebook, 0) ?? 0, color: "#1877F2" },
  ].filter((d) => d.value > 0);

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };

  const tabBtn = (tab: ChartTab, label: string) => (
    <button
      onClick={() => setChartTab(tab)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
        chartTab === tab
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Engagement trends and recently collected metadata</p>
        </div>
        <Button size="sm" onClick={handleSync} disabled={sync.isPending} className="rounded-full">
          <RefreshCw className={`w-4 h-4 mr-2 ${sync.isPending ? "animate-spin" : ""}`} />
          {sync.isPending ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Chart tabs */}
      <Card className="border-border/60">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">Engagement Trends</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Cross-platform performance over time</p>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 flex-shrink-0">
            {tabBtn("line", "Line")}
            {tabBtn("bar", "Bar")}
            {tabBtn("pie", "Pie")}
          </div>
        </CardHeader>
        <CardContent>
          {loadingTrends ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <>
              {chartTab === "line" && (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmt(v)} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), ""]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="YouTube" stroke="#FF0000" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Instagram" stroke="#E1306C" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Facebook" stroke="#1877F2" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {chartTab === "bar" && (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmt(v)} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), ""]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="YouTube" fill="#FF0000" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Instagram" fill="#E1306C" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Facebook" fill="#1877F2" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartTab === "pie" && (
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), "Engagements"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3 min-w-fit">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm">{entry.name}</span>
                        <span className="font-semibold text-sm tabular-nums ml-auto pl-4">{fmt(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent metadata table */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recent Metadata Entries</CardTitle>
          <p className="text-xs text-muted-foreground">Latest collected content across platforms</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Platform</TableHead>
                <TableHead className="text-xs">Content</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Views</TableHead>
                <TableHead className="text-xs text-right">Likes</TableHead>
                <TableHead className="text-xs text-right">Comments</TableHead>
                <TableHead className="text-xs text-right">Shares</TableHead>
                <TableHead className="text-xs text-right">Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRecent
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : recentData?.items.map((entry) => {
                    const pb = platformBadge[entry.platform];
                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 w-fit text-xs ${pb?.color}`}
                            style={{ borderColor: `${pb?.hex}40` }}
                          >
                            {pb?.icon}
                            <span className="capitalize">{entry.platform}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm font-medium">
                          {entry.title ?? entry.contentId}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">{entry.contentType}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.views)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.likes)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.comments)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.shares)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(entry.collectedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
