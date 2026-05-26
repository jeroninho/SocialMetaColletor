import React, { useEffect, useRef, useState } from "react";
import { useSearch } from "wouter";
import {
  useGetAuthStatus,
  getGetAuthStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Youtube,
  Instagram,
  Facebook,
  CheckCircle,
  Loader2,
  AlertCircle,
  Music,
  Twitter,
  BarChart3,
  AtSign,
  Info,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Megaphone,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OAuthCredentialsSetup } from "@/components/oauth-credentials-setup";
import { getToken } from "@/context/auth";
import { authFetch, getApiUrl } from "@/lib/api-url";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

async function fetchConnectNonce(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/auth/connect-nonce", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { nonce?: string };
    return data.nonce ?? null;
  } catch {
    return null;
  }
}

type ConnectablePlatform =
  | "youtube"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "twitter"
  | "ga4"
  | "threads";

type ComingSoonPlatform = "meta_ads" | "google_ads";

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  twitter: "X / Twitter",
  ga4: "Google Analytics 4",
  threads: "Threads",
};

interface PlatformDef {
  key: ConnectablePlatform;
  label: string;
  icon: React.ReactNode;
  brandColor: string;
  description: string;
  isNew?: boolean;
}

interface ComingSoonDef {
  key: ComingSoonPlatform;
  label: string;
  icon: React.ReactNode;
  brandColor: string;
  description: string;
}

const CONNECTABLE_PLATFORMS: PlatformDef[] = [
  {
    key: "youtube",
    label: "YouTube",
    icon: <Youtube className="w-6 h-6" />,
    brandColor: "#FF0000",
    description: "Métricas de canal, vídeos e analytics avançadas.",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: <Instagram className="w-6 h-6" />,
    brandColor: "#E1306C",
    description: "Perfil, posts e estatísticas de engajamento.",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: <Facebook className="w-6 h-6" />,
    brandColor: "#1877F2",
    description: "Páginas, publicações e métricas de engajamento.",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: <Music className="w-6 h-6" />,
    brandColor: "#000000",
    description: "Perfil, vídeos e analytics da conta TikTok.",
  },
  {
    key: "twitter",
    label: "X / Twitter",
    icon: <Twitter className="w-6 h-6" />,
    brandColor: "#1DA1F2",
    description: "Tweets, perfil e métricas de impressões.",
  },
  {
    key: "ga4",
    label: "Google Analytics",
    icon: <BarChart3 className="w-6 h-6" />,
    brandColor: "#F9AB00",
    description: "Sessões, usuários e funis de conversão do GA4.",
    isNew: true,
  },
  {
    key: "threads",
    label: "Threads",
    icon: <AtSign className="w-6 h-6" />,
    brandColor: "#000000",
    description: "Posts, replies e insights do Threads.",
    isNew: true,
  },
];

const COMING_SOON_PLATFORMS: ComingSoonDef[] = [
  {
    key: "meta_ads",
    label: "Meta Ads",
    icon: <Megaphone className="w-6 h-6" />,
    brandColor: "#1877F2",
    description: "Campanhas, gasto, CTR e ROAS do Facebook e Instagram Ads.",
  },
  {
    key: "google_ads",
    label: "Google Ads",
    icon: <TrendingUp className="w-6 h-6" />,
    brandColor: "#4285F4",
    description: "Campanhas, custo, conversões e palavras-chave do Google Ads.",
  },
];

interface PlatformStatus {
  connected?: boolean;
  accountName?: string;
  connectedAt?: string;
  expiresAt?: string | null;
  needsReconnect?: boolean;
  missingScopes?: string[];
}

interface CardPlatformProps {
  def: PlatformDef;
  status: PlatformStatus | undefined;
  onChanged: () => void;
}

function ConnectableCard({ def, status, onChanged }: CardPlatformProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);

  const connected = !!status?.connected;
  const isExpired = status?.expiresAt ? new Date(status.expiresAt) < new Date() : false;
  const needsReconnect = connected && !isExpired && !!status?.needsReconnect;
  const validConnection = connected && !isExpired && !needsReconnect;

  const handleConnect = async () => {
    setBusy("connect");
    const nonce = await fetchConnectNonce();
    if (!nonce) {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conexão. Verifique se você está autenticado.",
        variant: "destructive",
      });
      setBusy(null);
      return;
    }
    window.location.href = `/api/auth/${def.key}/connect?nonce=${encodeURIComponent(nonce)}`;
  };

  const handleDisconnect = async () => {
    setBusy("disconnect");
    try {
      const res = await authFetch(`${getApiUrl()}auth/${def.key}/disconnect`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast({
        title: `${def.label} desconectado`,
        description: "Plataforma desconectada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
      onChanged();
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao desconectar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      className="relative flex flex-col items-center text-center p-4 pt-5 transition-all hover:shadow-md min-h-[200px]"
      data-testid={`card-platform-${def.key}`}
      style={
        validConnection
          ? {
              backgroundColor: def.brandColor,
              borderColor: def.brandColor,
              color: "white",
            }
          : undefined
      }
    >
      {/* Info tooltip top-left */}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`absolute top-2 left-2 rounded-full p-1 transition-opacity ${
                validConnection ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Mais informações"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            {def.description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* NOVO badge top-right */}
      {def.isNew && !validConnection && (
        <Badge
          className="absolute top-2 right-2 bg-amber-400 text-amber-950 hover:bg-amber-400 border-0 text-[10px] font-bold px-1.5 py-0 h-4"
        >
          NOVO
        </Badge>
      )}

      {/* Settings icon top-right when connected */}
      {validConnection && (
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={busy === "disconnect"}
          className="absolute top-2 right-2 rounded-full p-1 text-white/80 hover:text-white hover:bg-white/10"
          aria-label="Desconectar"
          title="Desconectar"
        >
          {busy === "disconnect" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Settings className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
          validConnection ? "bg-white/15 text-white" : ""
        }`}
        style={
          !validConnection
            ? { backgroundColor: `${def.brandColor}15`, color: def.brandColor }
            : undefined
        }
      >
        {def.icon}
      </div>

      {/* Label / account name */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-w-0">
        {validConnection ? (
          <>
            <p
              className="text-sm font-semibold truncate w-full"
              data-testid={`text-account-${def.key}`}
              title={status?.accountName ?? def.label}
            >
              {status?.accountName ?? def.label}
            </p>
            <Badge
              variant="secondary"
              className="mt-2 bg-white/20 text-white border-0 text-[10px] font-bold tracking-wide gap-1"
              data-testid={`badge-${def.key}-status`}
            >
              <CheckCircle className="w-3 h-3" />
              CONECTADO
            </Badge>
          </>
        ) : (
          <>
            <p className="text-sm font-medium mt-1">{def.label}</p>
            {needsReconnect && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Reconexão necessária
              </p>
            )}
            {connected && isExpired && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Token expirado
              </p>
            )}
          </>
        )}
      </div>

      {/* Action button */}
      {!validConnection && (
        <Button
          size="sm"
          className="mt-3 w-full font-semibold"
          onClick={handleConnect}
          disabled={busy === "connect"}
          data-testid={`button-connect-${def.key}`}
        >
          {busy === "connect" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : needsReconnect || isExpired ? (
            "Reconectar"
          ) : (
            "Conectar"
          )}
        </Button>
      )}
    </Card>
  );
}

function ComingSoonCard({ def }: { def: ComingSoonDef }) {
  return (
    <Card
      className="relative flex flex-col items-center text-center p-4 pt-5 min-h-[200px] bg-muted/20"
      data-testid={`card-coming-soon-${def.key}`}
    >
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="absolute top-2 left-2 rounded-full p-1 text-muted-foreground hover:text-foreground"
              aria-label="Mais informações"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            {def.description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Badge
        className="absolute top-2 right-2 bg-amber-400 text-amber-950 hover:bg-amber-400 border-0 text-[10px] font-bold px-1.5 py-0 h-4 gap-1"
      >
        <Sparkles className="w-2.5 h-2.5" /> EM BREVE
      </Badge>

      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
        style={{ backgroundColor: `${def.brandColor}15`, color: def.brandColor }}
      >
        {def.icon}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-sm font-medium">{def.label}</p>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full font-medium"
        disabled
        data-testid={`button-coming-soon-${def.key}`}
      >
        Saiba mais
      </Button>
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const statusFor = (key: ConnectablePlatform): PlatformStatus | undefined => {
    const map = authStatus as Record<string, PlatformStatus | undefined> | undefined;
    return map?.[key];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Conexões de Plataformas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte suas redes sociais para começar a coletar métricas.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="h-[200px] animate-pulse bg-muted/40" />
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
          Clique em "Conectar" para vincular sua conta via OAuth 2.0. As credenciais OAuth ficam pré-configuradas;
          se quiser usar suas próprias, abra "Configuração avançada" no final da página.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {CONNECTABLE_PLATFORMS.map((def) => (
          <ConnectableCard
            key={def.key}
            def={def}
            status={statusFor(def.key)}
            onChanged={refresh}
          />
        ))}
        {COMING_SOON_PLATFORMS.map((def) => (
          <ComingSoonCard key={def.key} def={def} />
        ))}
      </div>

      <div className="pt-4 border-t border-border/60">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-toggle-advanced"
        >
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Configuração avançada — usar minhas próprias credenciais OAuth
        </button>
        {showAdvanced && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <OAuthCredentialsSetup />
          </div>
        )}
      </div>
    </div>
  );
}
