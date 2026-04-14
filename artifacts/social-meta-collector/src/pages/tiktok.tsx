import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, Heart, MessageCircle, Share2, TrendingUp, Play } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getApiUrl } from "@/lib/api-url";

function fmt(n?: number) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function TikTokPage() {
  const [profile, setProfile] = useState<any>(null);
  const [videos, setVideos] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = getApiUrl();
    Promise.all([
      fetch(`${base}tiktok/profile`).then((r) => r.json()),
      fetch(`${base}tiktok/videos?limit=20`).then((r) => r.json()),
      fetch(`${base}tiktok/analytics`).then((r) => r.json()),
    ]).then(([p, v, a]) => {
      setProfile(p);
      setVideos(v);
      setAnalytics(a);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-72" /></div>
            </div>
          ) : profile ? (
            <div className="flex items-start gap-4">
              {profile.avatarUrl && <img src={profile.avatarUrl} alt={profile.nickname} className="w-16 h-16 rounded-full object-cover" />}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{profile.nickname}</h2>
                  <Badge variant="secondary" className="text-[#00F2EA] border-[#00F2EA]/20">TikTok</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">@{profile.uniqueId}</p>
                {profile.bioDescription && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{profile.bioDescription}</p>}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Seguidores", value: fmt(profile?.followerCount), icon: Users },
          { label: "Total de Curtidas", value: fmt(profile?.heartCount), icon: Heart },
          { label: "Vídeos", value: fmt(profile?.videoCount), icon: Play },
          { label: "Taxa Eng.", value: analytics ? `${analytics.averageEngagementRate.toFixed(2)}%` : "—", icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Vídeos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right"><Eye className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><Heart className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><MessageCircle className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><Share2 className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>
                  ))
                : videos?.items.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium max-w-xs truncate">{v.description}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(v.viewCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(v.likeCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(v.commentCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(v.shareCount)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {v.createTime ? new Date(v.createTime).toLocaleDateString("pt-BR") : "—"}
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
