import React from "react";
import {
  useGetInstagramProfile,
  getGetInstagramProfileQueryKey,
  useListInstagramMedia,
  getListInstagramMediaQueryKey,
  useGetInstagramAnalytics,
  getGetInstagramAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Image, ThumbsUp, MessageCircle, TrendingUp, Eye } from "lucide-react";
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

const mediaTypeColors: Record<string, string> = {
  IMAGE: "bg-blue-100 text-blue-700",
  VIDEO: "bg-purple-100 text-purple-700",
  CAROUSEL_ALBUM: "bg-pink-100 text-pink-700",
};

export default function InstagramPage() {
  const { data: profile, isLoading: loadingProfile } = useGetInstagramProfile({
    query: { queryKey: getGetInstagramProfileQueryKey() },
  });
  const { data: mediaData, isLoading: loadingMedia } = useListInstagramMedia(
    { limit: 20, offset: 0 },
    { query: { queryKey: getListInstagramMediaQueryKey({ limit: 20, offset: 0 }) } }
  );
  const { data: analytics, isLoading: loadingAnalytics } = useGetInstagramAnalytics({
    query: { queryKey: getGetInstagramAnalyticsQueryKey() },
  });

  const isLoading = loadingProfile || loadingMedia || loadingAnalytics;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Profile header */}
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
          ) : profile ? (
            <div className="flex items-start gap-4">
              {profile.profilePictureUrl && (
                <img src={profile.profilePictureUrl} alt={profile.username} className="w-16 h-16 rounded-full object-cover" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">@{profile.username}</h2>
                  {profile.name && <span className="text-muted-foreground text-sm">{profile.name}</span>}
                  <Badge variant="outline">Instagram</Badge>
                </div>
                {profile.biography && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl line-clamp-2">{profile.biography}</p>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-1 block">{profile.website}</a>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Followers", value: fmt(profile?.followersCount), icon: Users },
          { label: "Following", value: fmt(profile?.followingCount), icon: Users },
          { label: "Media", value: fmt(profile?.mediaCount), icon: Image },
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

      {/* Media table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Media</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caption</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right"><Eye className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><ThumbsUp className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><MessageCircle className="w-3.5 h-3.5 inline" /></TableHead>
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
                : mediaData?.items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium max-w-xs truncate text-sm">
                        {m.caption ? m.caption.slice(0, 70) + (m.caption.length > 70 ? "..." : "") : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mediaTypeColors[m.mediaType] ?? ""}`}>
                          {m.mediaType.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(m.impressions)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(m.likeCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(m.commentsCount)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {m.timestamp ? new Date(m.timestamp).toLocaleDateString() : "—"}
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
