import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, Heart, MessageCircle, Repeat, TrendingUp, Bookmark } from "lucide-react";
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

export default function TwitterPage() {
  const [profile, setProfile] = useState<any>(null);
  const [tweets, setTweets] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = getApiUrl();
    Promise.all([
      fetch(`${base}twitter/profile`).then((r) => r.json()),
      fetch(`${base}twitter/tweets?limit=20`).then((r) => r.json()),
      fetch(`${base}twitter/analytics`).then((r) => r.json()),
    ]).then(([p, t, a]) => {
      setProfile(p);
      setTweets(t);
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
              {profile.profileImageUrl && <img src={profile.profileImageUrl} alt={profile.name} className="w-16 h-16 rounded-full object-cover" />}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{profile.name}</h2>
                  <Badge variant="outline">X / Twitter</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>
                {profile.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{profile.description}</p>}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Seguidores", value: fmt(profile?.followersCount), icon: Users },
          { label: "Impressões", value: fmt(analytics?.totalViews), icon: Eye },
          { label: "Curtidas", value: fmt(analytics?.totalLikes), icon: Heart },
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
        <CardHeader><CardTitle className="text-base">Tweets</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conteúdo</TableHead>
                <TableHead className="text-right"><Eye className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><Heart className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><Repeat className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><MessageCircle className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right"><Bookmark className="w-3.5 h-3.5 inline" /></TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>))}</TableRow>
                  ))
                : tweets?.items.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium max-w-xs truncate">{t.text}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(t.impressionCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(t.likeCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(t.retweetCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(t.replyCount)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{fmt(t.bookmarkCount)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString("pt-BR") : "—"}
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
