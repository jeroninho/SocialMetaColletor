import React, { useEffect, useRef } from "react";
import { useSearch } from "wouter";
import {
  useGetAuthStatus,
  getGetAuthStatusQueryKey,
  useDisconnectPlatform,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Youtube,
  Instagram,
  Facebook,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn,
  Unlink,
  AlertCircle,
  Music,
  Twitter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OAuthCredentialsSetup } from "@/components/oauth-credentials-setup";

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  twitter: "X / Twitter",
};

interface PlatformCardProps {
  platform: "youtube" | "instagram" | "facebook" | "tiktok" | "twitter";
  connected: boolean;
  accountName?: string;
  connectedAt?: string;
  expiresAt?: string | null;
  needsReconnect?: boolean;
  missingScopes?: string[];
  icon: React.ReactNode;
  label: string;
  onDisconnected: () => void;
}

function PlatformCard({
  platform,
  connected,
  accountName,
  connectedAt,
  expiresAt,
  needsReconnect,
  missingScopes,
  icon,
  label,
  onDisconnected,
}: PlatformCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const disconnect = useDisconnectPlatform();

  const handleConnect = () => {
    window.location.href = `/api/auth/${platform}/connect`;
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync({ platform: platform as "youtube" | "instagram" | "facebook" });
      toast({
        title: `${label} desconectado`,
        description: "Plataforma desconectada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
      onDisconnected();
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao desconectar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const requiresReconnect = connected && !isExpired && !!needsReconnect;
  const missingAnalytics =
    platform === "youtube" &&
    requiresReconnect &&
    (missingScopes ?? []).some((s) => s.includes("yt-analytics.readonly"));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md flex items-center justify-center bg-muted">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              {connected && accountName && (
                <CardDescription className="text-xs mt-0.5">
                  @{accountName}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge
            variant={
              requiresReconnect
                ? "destructive"
                : connected && !isExpired
                  ? "default"
                  : "secondary"
            }
            className="flex items-center gap-1"
            data-testid={`badge-${platform}-status`}
          >
            {requiresReconnect ? (
              <>
                <AlertCircle className="w-3 h-3" /> Reconexão necessária
              </>
            ) : connected && !isExpired ? (
              <>
                <CheckCircle className="w-3 h-3" /> Conectado
              </>
            ) : connected && isExpired ? (
              <>
                <AlertCircle className="w-3 h-3" /> Expirado
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" /> Desconectado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected && !isExpired ? (
          <div className="space-y-3">
            {requiresReconnect && (
              <div
                className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2"
                data-testid={`alert-${platform}-reconnect`}
              >
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {missingAnalytics
                      ? "Esta conexão foi feita antes da inclusão de YouTube Analytics. Reconecte para liberar as métricas avançadas (visualizações, watch time, CTR)."
                      : "Permissões adicionais são necessárias. Reconecte para continuar usando esta integração."}
                  </span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                  onClick={handleConnect}
                  data-testid={`button-${platform}-reconnect`}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Reconectar {label}
                </Button>
              </div>
            )}
            {connectedAt && (
              <p className="text-xs text-muted-foreground">
                Conectado em{" "}
                {new Date(connectedAt).toLocaleDateString("pt-BR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                Expira em{" "}
                {new Date(expiresAt).toLocaleDateString("pt-BR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/5 w-full"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4 mr-2" />
              )}
              Desconectar {label}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connected && isExpired && (
              <p className="text-xs text-amber-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Token expirado. Reconecte para continuar usando.
              </p>
            )}
            <Button
              size="sm"
              className="w-full font-medium"
              onClick={handleConnect}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Conectar com {label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Connections() {
  const queryClient = useQueryClient();
  const { data: authStatus, isLoading } = useGetAuthStatus({
    query: { queryKey: getGetAuthStatusQueryKey() },
  });
  const { toast } = useToast();
  const search = useSearch();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (notifiedRef.current) return;
    const params = new URLSearchParams(search);
    const status = params.get("oauth_status");
    const platform = params.get("platform");
    const message = params.get("message");

    if (!status || !platform) return;
    notifiedRef.current = true;

    const platformLabel = PLATFORM_LABELS[platform] ?? platform;

    if (status === "success") {
      toast({
        title: `${platformLabel} conectado com sucesso!`,
        description: `Sua conta foi vinculada ao SocialMetaCollector.`,
      });
      queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
    } else if (status === "error") {
      toast({
        title: `Erro ao conectar ${platformLabel}`,
        description: message ?? "Ocorreu um erro durante a autenticação. Tente novamente.",
        variant: "destructive",
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("oauth_status");
    url.searchParams.delete("platform");
    url.searchParams.delete("message");
    window.history.replaceState({}, "", url.toString());
  }, [search, toast, queryClient]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
  };

  const platforms = [
    {
      platform: "youtube" as const,
      label: "YouTube",
      icon: <Youtube className="w-5 h-5 text-foreground" />,
    },
    {
      platform: "instagram" as const,
      label: "Instagram",
      icon: <Instagram className="w-5 h-5 text-foreground" />,
    },
    {
      platform: "facebook" as const,
      label: "Facebook",
      icon: <Facebook className="w-5 h-5 text-foreground" />,
    },
    {
      platform: "tiktok" as const,
      label: "TikTok",
      icon: <Music className="w-5 h-5 text-foreground" />,
    },
    {
      platform: "twitter" as const,
      label: "X / Twitter",
      icon: <Twitter className="w-5 h-5 text-foreground" />,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Conexões de Plataformas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte suas redes sociais para começar a coletar métricas.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-lg font-semibold">Conexões de Plataformas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte suas redes sociais via OAuth 2.0 para começar a coletar
          métricas automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
        {platforms.map(({ platform, label, icon }) => {
          const status = (authStatus as Record<string, {
            connected?: boolean;
            accountName?: string;
            connectedAt?: string;
            expiresAt?: string | null;
            needsReconnect?: boolean;
            missingScopes?: string[];
          } | undefined> | undefined)?.[platform];
          return (
            <PlatformCard
              key={platform}
              platform={platform}
              label={label}
              icon={icon}
              connected={status?.connected ?? false}
              accountName={status?.accountName}
              connectedAt={status?.connectedAt as string | undefined}
              expiresAt={status?.expiresAt as string | null | undefined}
              needsReconnect={status?.needsReconnect}
              missingScopes={status?.missingScopes}
              onDisconnected={refresh}
            />
          );
        })}
      </div>

      <OAuthCredentialsSetup />
    </div>
  );
}
