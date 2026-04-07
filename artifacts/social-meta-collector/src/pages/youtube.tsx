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
import { Users, Eye, Video, ThumbsUp, MessageCircle, TrendingUp } from "lucide-react";
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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
