import React from "react";
import {
  useGetFacebookPage,
  getGetFacebookPageQueryKey,
  useListFacebookPosts,
  getListFacebookPostsQueryKey,
  useGetFacebookAnalytics,
  getGetFacebookAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ThumbsUp, MessageCircle, Share2, TrendingUp, Eye } from "lucide-react";
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

export default function FacebookPage() {
  const { data: page, isLoading: loadingPage } = useGetFacebookPage({
    query: { queryKey: getGetFacebookPageQueryKey() },
  });
  const { data: postsData, isLoading: loadingPosts } = useListFacebookPosts(
    { limit: 20, offset: 0 },
    { query: { queryKey: getListFacebookPostsQueryKey({ limit: 20, offset: 0 }) } }
  );
  const { data: analytics, isLoading: loadingAnalytics } = useGetFacebookAnalytics({
    query: { queryKey: getGetFacebookAnalyticsQueryKey() },
  });

  const isLoading = loadingPage || loadingPosts || loadingAnalytics;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page header */}
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
          ) : page ? (
            <div className="flex items-start gap-4">
              {page.profilePictureUrl && (
                <img src={page.profilePictureUrl} alt={page.name} className="w-16 h-16 rounded-full object-cover" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{page.name}</h2>
                  {page.category && <span className="text-muted-foreground text-sm">{page.category}</span>}
                  <Badge variant="secondary" className="text-[#1877F2] border-[#1877F2]/20">Facebook</Badge>
                </div>
                {page.about && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl line-clamp-2">{page.about}</p>
                )}
                {page.talkingAboutCount !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">{fmt(page.talkingAboutCount)} people talking about this</p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Page Fans", value: fmt(page?.fanCount), icon: Users },
          { label: "Followers", value: fmt(page?.followersCount), icon: Users },
          { label: "Total Shares", value: fmt(analytics?.totalShares), icon: Share2 },
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

      {/* Posts table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead className="text-right"><Eye className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><ThumbsUp className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><MessageCircle className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><Share2 className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right">Posted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : postsData?.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium max-w-xs truncate text-sm">
                        {p.message ? p.message.slice(0, 70) + (p.message.length > 70 ? "..." : "") : p.story ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(p.impressions)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(p.likeCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(p.commentCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(p.shareCount)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {p.createdTime ? new Date(p.createdTime).toLocaleDateString() : "—"}
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
