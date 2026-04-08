import React, { useState } from "react";
import {
  useFetchMetadataFromUrl,
  useListFetchHistory,
  getListFetchHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Loader2,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Clock,
  User,
  Calendar,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useToast } from "@/hooks/use-toast";

function fmt(n?: number | null) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const platformConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  youtube: { color: "#FF0000", icon: <Youtube className="w-4 h-4" />, label: "YouTube" },
  tiktok: { color: "#000000", icon: <span className="text-xs font-bold">TT</span>, label: "TikTok" },
  instagram: { color: "#E1306C", icon: <Instagram className="w-4 h-4" />, label: "Instagram" },
  facebook: { color: "#1877F2", icon: <Facebook className="w-4 h-4" />, label: "Facebook" },
  twitter: { color: "#1DA1F2", icon: <Twitter className="w-4 h-4" />, label: "X / Twitter" },
};

interface FetchResult {
  platform: string;
  url: string;
  title: string;
  author: string;
  description?: string;
  thumbnailUrl?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  publishedAt?: string;
  duration?: string;
  tags?: string[];
}

function MetadataCard({ data }: { data: FetchResult }) {
  const pc = platformConfig[data.platform] ?? { color: "#888", icon: null, label: data.platform };

  const chartData = [
    { name: "Views", value: data.views ?? 0 },
    { name: "Likes", value: data.likes ?? 0 },
    { name: "Comments", value: data.comments ?? 0 },
    { name: "Shares", value: data.shares ?? 0 },
  ].filter((d) => d.value > 0);

  return (
    <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-400">
      <div className="h-1.5 w-full" style={{ backgroundColor: pc.color }} />
      <CardContent className="pt-5 space-y-5">
        <div className="flex items-start gap-4">
          {data.thumbnailUrl && (
            <img
              src={data.thumbnailUrl}
              alt={data.title}
              className="w-32 h-20 object-cover rounded-md flex-shrink-0 bg-muted"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
                style={{ color: pc.color, borderColor: `${pc.color}40` }}
              >
                {pc.icon}
                {pc.label}
              </Badge>
            </div>
            <h3 className="font-semibold text-base leading-snug line-clamp-2">{data.title}</h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {data.author}</span>
              {data.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(data.publishedAt).toLocaleDateString()}
                </span>
              )}
              {data.duration && (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {data.duration}</span>
              )}
            </div>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Ver original
            </a>
          </div>
        </div>

        {data.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{data.description}</p>
        )}

        {/* Metric chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Eye, label: "Views", value: fmt(data.views) },
            { icon: ThumbsUp, label: "Likes", value: fmt(data.likes) },
            { icon: MessageCircle, label: "Comments", value: fmt(data.comments) },
            { icon: Share2, label: "Shares", value: fmt(data.shares) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-muted/40 rounded-lg px-3 py-2 text-center">
              <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-sm font-semibold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        {chartData.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Distribuição de métricas</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), ""]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={pc.color} fillOpacity={0.75 - i * 0.12} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.slice(0, 8).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FetchPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<FetchResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fetchMutation = useFetchMetadataFromUrl();

  const { data: history, isLoading: loadingHistory } = useListFetchHistory(
    { limit: 10, offset: 0 },
    { query: { queryKey: getListFetchHistoryQueryKey({ limit: 10, offset: 0 }) } }
  );

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetchError(null);
    setResult(null);
    try {
      const data = await fetchMutation.mutateAsync({ data: { url: url.trim() } });
      setResult(data as FetchResult);
      queryClient.invalidateQueries({ queryKey: getListFetchHistoryQueryKey({ limit: 10, offset: 0 }) });
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const msg = errData?.message ?? "Não foi possível buscar a metadata. Verifique o link e tente novamente.";
      setFetchError(msg);
      toast({ title: "Erro ao buscar metadata", description: msg, variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFetch();
  };

  const handleHistoryClick = (item: { url: string }) => {
    setUrl(item.url);
  };

  const supportedPlatforms = [
    { icon: <Youtube className="w-4 h-4" />, color: "#FF0000", label: "YouTube" },
    { icon: <span className="text-xs font-bold px-0.5">TT</span>, color: "#000", label: "TikTok" },
    { icon: <Instagram className="w-4 h-4" />, color: "#E1306C", label: "Instagram" },
    { icon: <Facebook className="w-4 h-4" />, color: "#1877F2", label: "Facebook" },
    { icon: <Twitter className="w-4 h-4" />, color: "#1DA1F2", label: "X / Twitter" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
      <div>
        <h2 className="text-lg font-semibold">Buscar Metadata</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Cole qualquer link de post ou vídeo para extrair suas métricas
        </p>
      </div>

      {/* Supported platforms chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Suporta:</span>
        {supportedPlatforms.map(({ icon, color, label }) => (
          <Badge key={label} variant="outline" className="flex items-center gap-1 text-xs" style={{ color, borderColor: `${color}40` }}>
            {icon} {label}
          </Badge>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://youtube.com/watch?v=... ou qualquer link social"
            className="pl-9 font-mono text-sm"
          />
        </div>
        <Button onClick={handleFetch} disabled={fetchMutation.isPending || !url.trim()}>
          {fetchMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buscando...</>
          ) : (
            "Buscar Metadata"
          )}
        </Button>
      </div>

      {/* Error */}
      {fetchError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {fetchMutation.isPending && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start gap-4">
              <Skeleton className="w-32 h-20 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          </CardContent>
        </Card>
      )}

      {result && !fetchMutation.isPending && <MetadataCard data={result} />}

      {/* History */}
      {(history?.items?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Consultas recentes</h3>
          <div className="space-y-2">
            {loadingHistory
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
              : history?.items.map((item) => {
                  const pc = platformConfig[item.platform] ?? { color: "#888", icon: null, label: item.platform };
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleHistoryClick(item)}
                      className="w-full text-left"
                    >
                      <Card className="hover:bg-muted/40 transition-colors cursor-pointer">
                        <CardContent className="pt-3 pb-3 flex items-center gap-3">
                          {item.thumbnailUrl && (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-12 h-8 object-cover rounded flex-shrink-0 bg-muted"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{ color: pc.color }}>{pc.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.fetchedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">@{item.author} · {fmt(item.views ?? 0)} views · {fmt(item.likes ?? 0)} likes</p>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}
