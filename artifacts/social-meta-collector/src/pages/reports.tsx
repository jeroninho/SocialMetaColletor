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
import { RefreshCw, Youtube, Instagram, Facebook, Download, FileText, Music, Twitter } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import { useTheme } from "@/context/theme";
import { getTooltipStyle, getAxisStyle, getGridStyle } from "@/lib/chart-theme";

function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const PLATFORM_HEX: Record<string, string> = {
  youtube: "#FF4444",
  instagram: "#E1306C",
  facebook: "#2D88FF",
  tiktok: "#00F2EA",
  twitter: "#1DA1F2",
};

const platformBadge: Record<string, { hex: string; icon: React.ReactNode }> = {
  youtube: { hex: "#FF4444", icon: <Youtube className="w-3 h-3" /> },
  instagram: { hex: "#E1306C", icon: <Instagram className="w-3 h-3" /> },
  facebook: { hex: "#2D88FF", icon: <Facebook className="w-3 h-3" /> },
  tiktok: { hex: "#00F2EA", icon: <Music className="w-3 h-3" /> },
  twitter: { hex: "#1DA1F2", icon: <Twitter className="w-3 h-3" /> },
};

type ChartTab = "line" | "bar" | "pie";

function ChartTabBtn({
  tab,
  current,
  label,
  onClick,
}: {
  tab: ChartTab;
  current: ChartTab;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
        current === tab
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      {label}
    </button>
  );
}

export default function Reports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [chartTab, setChartTab] = useState<ChartTab>("line");
  const { theme } = useTheme();
  const dark = theme === "dark";

  const tooltipStyle = getTooltipStyle(dark);
  const axisStyle = getAxisStyle(dark);
  const gridColor = getGridStyle(dark);

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

  const handleExportCSV = () => {
    const items = recentData?.items;
    if (!items?.length) return;
    const headers = ["Plataforma", "Conteúdo", "Tipo", "Views", "Likes", "Comentários", "Shares", "Data Coleta"];
    const rows = items.map((e) => [
      e.platform,
      `"${(e.title ?? e.contentId ?? "").replace(/"/g, '""')}"`,
      e.contentType,
      e.views ?? 0,
      e.likes ?? 0,
      e.comments ?? 0,
      e.shares ?? 0,
      new Date(e.collectedAt).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado!", description: "Arquivo baixado com sucesso." });
  };

  const handleExportPDF = () => {
    const items = recentData?.items;
    if (!items?.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("SocialMetaCollector - Relatório", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [["Plataforma", "Conteúdo", "Tipo", "Views", "Likes", "Comentários", "Shares", "Data"]],
      body: items.map((e) => [
        e.platform,
        (e.title ?? e.contentId ?? "").slice(0, 40),
        e.contentType,
        fmt(e.views),
        fmt(e.likes),
        fmt(e.comments),
        fmt(e.shares),
        new Date(e.collectedAt).toLocaleDateString("pt-BR"),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [108, 99, 255] },
    });
    doc.save(`relatorio_${new Date().toISOString().split("T")[0]}.pdf`);
    toast({ title: "PDF exportado!", description: "Arquivo baixado com sucesso." });
  };

  const chartData = trends?.dataPoints.map((dp: any) => ({
    date: new Date(dp.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
    YouTube: dp.youtube,
    Instagram: dp.instagram,
    Facebook: dp.facebook,
    TikTok: dp.tiktok ?? 0,
    Twitter: dp.twitter ?? 0,
  }));

  const pieData = [
    { name: "YouTube", value: trends?.dataPoints.reduce((s: number, d: any) => s + d.youtube, 0) ?? 0, color: "#FF4444" },
    { name: "Instagram", value: trends?.dataPoints.reduce((s: number, d: any) => s + d.instagram, 0) ?? 0, color: "#E1306C" },
    { name: "Facebook", value: trends?.dataPoints.reduce((s: number, d: any) => s + d.facebook, 0) ?? 0, color: "#2D88FF" },
    { name: "TikTok", value: trends?.dataPoints.reduce((s: number, d: any) => s + (d.tiktok ?? 0), 0) ?? 0, color: "#00F2EA" },
    { name: "Twitter", value: trends?.dataPoints.reduce((s: number, d: any) => s + (d.twitter ?? 0), 0) ?? 0, color: "#1DA1F2" },
  ].filter((d) => d.value > 0);

  const legendStyle = { fontSize: 12, color: dark ? "hsl(220 20% 70%)" : "hsl(220 10% 46%)" };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tendencias de engajamento e metadata coletada</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={!recentData?.items?.length} className="rounded-full h-9">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={!recentData?.items?.length} className="rounded-full h-9">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button size="sm" onClick={handleSync} disabled={sync.isPending} className="rounded-full h-9">
            <RefreshCw className={`w-4 h-4 mr-2 ${sync.isPending ? "animate-spin" : ""}`} />
            {sync.isPending ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </div>

      {/* Engagement chart card */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-5 flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">Engagement Trends</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Performance cross-platform ao longo do tempo</p>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 flex-shrink-0">
            {(["line", "bar", "pie"] as ChartTab[]).map((tab) => (
              <ChartTabBtn
                key={tab}
                tab={tab}
                current={chartTab}
                label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                onClick={() => setChartTab(tab)}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          {loadingTrends ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <>
              {chartTab === "line" && (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" tick={axisStyle.tick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle.tick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), ""]} />
                    <Legend wrapperStyle={legendStyle} />
                    <Line type="monotone" dataKey="YouTube" stroke="#FF4444" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="Instagram" stroke="#E1306C" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="Facebook" stroke="#2D88FF" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="TikTok" stroke="#00F2EA" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="Twitter" stroke="#1DA1F2" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {chartTab === "bar" && (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" tick={axisStyle.tick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle.tick} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), ""]} />
                    <Legend wrapperStyle={legendStyle} />
                    <Bar dataKey="YouTube" fill="#FF4444" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Instagram" fill="#E1306C" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Facebook" fill="#2D88FF" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="TikTok" fill="#00F2EA" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Twitter" fill="#1DA1F2" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartTab === "pie" && (
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmt(v), "Engajamentos"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3 min-w-fit md:pr-8">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm text-muted-foreground">{entry.name}</span>
                        <span className="font-bold text-sm tabular-nums ml-auto pl-6">{fmt(entry.value)}</span>
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
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold">Recent Metadata Entries</CardTitle>
          <p className="text-xs text-muted-foreground">Ultimo conteudo coletado por plataforma</p>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="text-xs pl-6">Platform</TableHead>
                <TableHead className="text-xs">Content</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Views</TableHead>
                <TableHead className="text-xs text-right">Likes</TableHead>
                <TableHead className="text-xs text-right">Comments</TableHead>
                <TableHead className="text-xs text-right">Shares</TableHead>
                <TableHead className="text-xs text-right pr-6">Collected</TableHead>
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
                      <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors border-border/40">
                        <TableCell className="pl-6">
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1.5 w-fit text-xs rounded-full px-2.5"
                            style={{ color: pb?.hex, borderColor: `${pb?.hex}40`, background: `${pb?.hex}12` }}
                          >
                            {pb?.icon}
                            <span className="capitalize">{entry.platform}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm font-medium">
                          {entry.title ?? entry.contentId}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">{entry.contentType}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.views)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.likes)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.comments)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.shares)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground pr-6">
                          {new Date(entry.collectedAt).toLocaleDateString("pt-BR")}
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
