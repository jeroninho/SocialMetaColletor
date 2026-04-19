import React from "react";
import {
  useGetYoutubeChannel,
  getGetYoutubeChannelQueryKey,
  useListYoutubeVideos,
  getListYoutubeVideosQueryKey,
  useGetYoutubeAnalytics,
  getGetYoutubeAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, Video, ThumbsUp, MessageCircle, TrendingUp, Clock, MousePointerClick, UserPlus, UserMinus, Image as ImageIcon, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function YouTubePage() {
  const { data: channel, isLoading: loadingChannel } = useGetYoutubeChannel({
    query: { queryKey: getGetYoutubeChannelQueryKey() },
  });
  const { data: videosData, isLoading: loadingVideos } = useListYoutubeVideos(
    { limit: 20, offset: 0 },
    { query: { queryKey: getListYoutubeVideosQueryKey({ limit: 20, offset: 0 }) } }
  );
  const { data: analytics, isLoading: loadingAnalytics } = useGetYoutubeAnalytics({
    query: { queryKey: getGetYoutubeAnalyticsQueryKey() },
  });

  const isLoading = loadingChannel || loadingVideos || loadingAnalytics;

  const analyticsAvailable = channel?.analyticsAvailable ?? analytics?.analyticsAvailable ?? false;
  const periodDays = channel?.periodDays ?? analytics?.periodDays ?? 28;
  const watchTimeMinutes = channel?.watchTimeMinutes ?? analytics?.watchTimeMinutes ?? 0;
  const thumbnailImpressions = channel?.thumbnailImpressions ?? analytics?.thumbnailImpressions ?? 0;
  const thumbnailCtr = channel?.thumbnailCtr ?? analytics?.thumbnailCtr ?? 0;
  const subscribersGained = channel?.subscribersGained ?? analytics?.subscribersGained ?? 0;
  const subscribersLost = channel?.subscribersLost ?? analytics?.subscribersLost ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {!isLoading && !analyticsAvailable && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            YouTube Analytics não está disponível. Reconecte sua conta YouTube para conceder o escopo
            <code className="mx-1 px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-xs">yt-analytics.readonly</code>
            e ver métricas reais (Watch Time, CTR, Impressões etc.).
          </span>
        </div>
      )}

      {/* Channel header */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          ) : channel ? (
            <div className="flex items-start gap-4">
              {channel.thumbnailUrl && (
                <img src={channel.thumbnailUrl} alt={channel.title} className="w-16 h-16 rounded-full object-cover" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{channel.title}</h2>
                  <Badge variant="secondary" className="text-[#FF0000] border-[#FF0000]/20">YouTube</Badge>
                </div>
                {channel.description && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl line-clamp-2">{channel.description}</p>
                )}
                {channel.publishedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Channel since {new Date(channel.publishedAt).getFullYear()}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Subscribers", value: fmt(channel?.subscriberCount), icon: Users },
          { label: "Total Views", value: fmt(channel?.viewCount), icon: Eye },
          { label: "Videos", value: fmt(channel?.videoCount), icon: Video },
          { label: "Avg Engagement", value: analytics ? `${analytics.averageEngagementRate.toFixed(2)}%` : "—", icon: TrendingUp },
          {
            label: `Watch Time (${periodDays}d)`,
            value: analyticsAvailable ? `${fmt(watchTimeMinutes)} min` : "—",
            icon: Clock,
          },
          {
            label: `Thumbnail Impressions (${periodDays}d)`,
            value: analyticsAvailable ? fmt(thumbnailImpressions) : "—",
            icon: ImageIcon,
          },
          {
            label: `Thumbnail CTR (${periodDays}d)`,
            value: analyticsAvailable ? `${(thumbnailCtr * 100).toFixed(2)}%` : "—",
            icon: MousePointerClick,
          },
          {
            label: `Subscribers Gained (${periodDays}d)`,
            value: analyticsAvailable ? fmt(subscribersGained) : "—",
            icon: UserPlus,
          },
          {
            label: `Subscribers Lost (${periodDays}d)`,
            value: analyticsAvailable ? fmt(subscribersLost) : "—",
            icon: UserMinus,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Videos table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Videos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right"><ThumbsUp className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><MessageCircle className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right">Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : videosData?.items.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium max-w-xs truncate">{v.title}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(v.viewCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(v.likeCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(v.commentCount)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
