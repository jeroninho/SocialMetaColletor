import React from "react";
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

const platformBadge: Record<string, { color: string; icon: React.ReactNode }> = {
  youtube: { color: "text-[#FF0000]", icon: <Youtube className="w-3 h-3" /> },
  instagram: { color: "text-[#E1306C]", icon: <Instagram className="w-3 h-3" /> },
  facebook: { color: "text-[#1877F2]", icon: <Facebook className="w-3 h-3" /> },
};

export default function Reports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    date: new Date(dp.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    YouTube: dp.youtube,
    Instagram: dp.instagram,
    Facebook: dp.facebook,
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Engagement trends and recently collected metadata</p>
        </div>
        <Button size="sm" onClick={handleSync} disabled={sync.isPending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${sync.isPending ? "animate-spin" : ""}`} />
          {sync.isPending ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Engagement trends chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Engagement Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTrends ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmt(v)} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [fmt(value), ""]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="YouTube" stroke="#FF0000" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Instagram" stroke="#E1306C" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Facebook" stroke="#1877F2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent metadata table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Metadata Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Collected</TableHead>
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
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant="outline" className={`flex items-center gap-1 w-fit ${pb?.color}`}>
                            {pb?.icon}
                            <span className="capitalize">{entry.platform}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm font-medium">
                          {entry.title ?? entry.contentId}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{entry.contentType}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.views)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.likes)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.comments)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmt(entry.shares)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
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
