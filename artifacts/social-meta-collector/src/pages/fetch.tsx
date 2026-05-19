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
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Clock,
  User,
  Calendar,
  ExternalLink,
  AlertCircle,
  Sparkles,
  History,
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
import { useTheme } from "@/context/theme";
import { getTooltipStyle, getAxisStyle } from "@/lib/chart-theme";

function fmt(n?: number | null) {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const platformConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  youtube: {
    icon: <Youtube className="w-4 h-4" />,
    label: "YouTube",
  },
  tiktok: {
    icon: <span className="text-[10px] font-black tracking-tighter">TT</span>,
    label: "TikTok",
  },
  instagram: {
    icon: <Instagram className="w-4 h-4" />,
    label: "Instagram",
  },
  facebook: {
    icon: <Facebook className="w-4 h-4" />,
    label: "Facebook",
  },
  twitter: {
    icon: <span className="text-xs font-bold">X</span>,
    label: "X / Twitter",
  },
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

function MetricChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-muted/50 rounded-xl px-4 py-3 text-center border border-border/40">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-base font-bold tabular-nums leading-tight">{value}</span>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

function MetadataCard({ data }: { data: FetchResult }) {
  const pc = platformConfig[data.platform] ?? { icon: null, label: data.platform };
  const { theme } = useTheme();
  const dark = theme === "dark";
  const tooltipStyle = getTooltipStyle(dark);
  const axisStyle = getAxisStyle(dark);
  const barColor = dark ? "hsl(0 0% 88%)" : "hsl(0 0% 12%)";

  const chartData = [
    { name: "Views", value: data.views ?? 0 },
    { name: "Likes", value: data.likes ?? 0 },
    { name: "Comments", value: data.comments ?? 0 },
    { name: "Shares", value: data.shares ?? 0 },
  ].filter((d) => d.value > 0);

  return (
    <Card
      className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-400"
    >
      <CardContent className="pt-5 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          {data.thumbnailUrl && (
            <div className="relative flex-shrink-0">
              <img
                src={data.thumbnailUrl}
                alt={data.title}
                className="w-36 h-24 object-cover rounded-xl bg-muted shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <Badge
              variant="outline"
              className="flex items-center gap-1 text-xs mb-2 w-fit"
            >
              {pc.icon}
              {pc.label}
            </Badge>
            <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-2">{data.title}</h3>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3" />
                <span className="font-medium">{data.author}</span>
              </span>
              {data.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {new Date(data.publishedAt).toLocaleDateString("pt-BR")}
                </span>
              )}
              {data.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {data.duration}
                </span>
              )}
            </div>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary mt-2 hover:underline font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              Ver original
            </a>
          </div>
        </div>

        {data.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 bg-muted/30 rounded-lg px-3 py-2.5">
            {data.description}
          </p>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricChip icon={Eye} label="Views" value={fmt(data.views)} />
          <MetricChip icon={ThumbsUp} label="Likes" value={fmt(data.likes)} />
          <MetricChip icon={MessageCircle} label="Comments" value={fmt(data.comments)} />
          <MetricChip icon={Share2} label="Shares" value={fmt(data.shares)} />
        </div>

        {/* Bar chart */}
        {chartData.length > 0 && (
          <>
            <Separator className="opacity-40" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Distribuicao de metricas
              </p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={axisStyle.tick} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={axisStyle.tick}
                    tickFormatter={(v) => fmt(v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), ""]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={barColor} fillOpacity={0.9 - i * 0.18} />
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
              <Badge key={tag} variant="secondary" className="text-[10px] rounded-full px-2.5">
                #{tag}
              </Badge>
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
      queryClient.invalidateQueries({
        queryKey: getListFetchHistoryQueryKey({ limit: 10, offset: 0 }),
      });
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      const msg =
        errData?.message ?? "Nao foi possivel buscar a metadata. Verifique o link e tente novamente.";
      setFetchError(msg);
      toast({ title: "Erro ao buscar metadata", description: msg, variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFetch();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto">
      {/* Hero input area */}
      <div className="rounded-md border border-border bg-card p-6 md:p-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Metadata Fetcher</span>
          </div>
          <h2
            className="text-xl font-semibold tracking-tight mb-1"
            style={{ fontFamily: "var(--app-font-heading)" }}
          >
            Analise qualquer post
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Cole o link de qualquer video ou post para extrair titulo, autor, views, likes e mais.
          </p>

          {/* Platform chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(platformConfig).map(([key, cfg]) => (
              <Badge
                key={key}
                variant="outline"
                className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1"
              >
                {cfg.icon}
                {cfg.label}
              </Badge>
            ))}
          </div>

          {/* Input + button */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://youtube.com/watch?v=..."
                className="pl-10 h-11 font-mono text-sm rounded-xl border-border/60 bg-card/80"
              />
            </div>
            <Button
              onClick={handleFetch}
              disabled={fetchMutation.isPending || !url.trim()}
              className="h-11 px-5 rounded-xl font-medium"
            >
              {fetchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                "Buscar"
              )}
            </Button>
          </div>
        </div>
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

      {/* Loading skeleton */}
      {fetchMutation.isPending && (
        <Card className="border-border/60">
          <CardContent className="pt-5 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="w-36 h-24 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && !fetchMutation.isPending && <MetadataCard data={result} />}

      {/* History */}
      {((history?.items?.length ?? 0) > 0 || loadingHistory) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Consultas recentes</h3>
          </div>
          <div className="space-y-2">
            {loadingHistory
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))
              : (history?.items ?? []).map((item) => {
                  const pc = platformConfig[item.platform] ?? { color: "#888", icon: null, label: item.platform };
                  return (
                    <button
                      key={item.id}
                      onClick={() => setUrl(item.url)}
                      className="w-full text-left group"
                    >
                      <Card className="border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group-hover:shadow-sm">
                        <CardContent className="pt-3 pb-3 flex items-center gap-3">
                          {item.thumbnailUrl && (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-14 h-9 object-cover rounded-lg flex-shrink-0 bg-muted"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-foreground">
                                {pc.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(item.fetchedAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              @{item.author}
                              {item.views ? ` · ${fmt(item.views)} views` : ""}
                              {item.likes ? ` · ${fmt(item.likes)} likes` : ""}
                            </p>
                          </div>
                          <Search className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
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
