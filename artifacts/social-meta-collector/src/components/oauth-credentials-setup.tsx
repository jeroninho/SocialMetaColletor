import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Youtube,
  Instagram,
  Facebook,
  Music,
  Twitter,
  ExternalLink,
  Copy,
  Check,
  KeyRound,
  Trash2,
  Loader2,
  ShieldCheck,
  BarChart3,
  AtSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetch, getApiUrl } from "@/lib/api-url";

type Platform = "youtube" | "instagram" | "facebook" | "tiktok" | "twitter" | "ga4" | "threads";
type Source = "db" | "env" | "none";

interface CredEntry {
  platform: Platform;
  source: Source;
  clientIdPreview: string | null;
  updatedAt: string | null;
}

interface AuthConfigEntry {
  callbackUrl: string;
  configured: boolean;
}

const PLATFORM_META: Record<Platform, {
  label: string;
  color: string;
  icon: React.ReactNode;
  portalUrl: string;
  portalName: string;
  idLabel: string;
  secretLabel: string;
  helpText: string;
}> = {
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    icon: <Youtube className="w-5 h-5" style={{ color: "#FF0000" }} />,
    portalUrl: "https://console.cloud.google.com/apis/credentials",
    portalName: "Google Cloud Console",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    helpText: "Em APIs & Services → Credentials, crie um OAuth 2.0 Client ID do tipo Web application e adicione a URI de redirecionamento abaixo.",
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    icon: <Instagram className="w-5 h-5" style={{ color: "#E1306C" }} />,
    portalUrl: "https://developers.facebook.com/apps/",
    portalName: "Meta for Developers",
    idLabel: "Instagram App ID",
    secretLabel: "Instagram App Secret",
    helpText: "Crie um app do tipo Business, adicione o produto Instagram Basic Display, e copie o App ID e App Secret. Cole a URI abaixo em Valid OAuth Redirect URIs.",
  },
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    icon: <Facebook className="w-5 h-5" style={{ color: "#1877F2" }} />,
    portalUrl: "https://developers.facebook.com/apps/",
    portalName: "Meta for Developers",
    idLabel: "App ID",
    secretLabel: "App Secret",
    helpText: "No mesmo app Meta, adicione o produto Facebook Login. Copie o App ID e o App Secret e cole a URI abaixo em Valid OAuth Redirect URIs.",
  },
  tiktok: {
    label: "TikTok",
    color: "#000000",
    icon: <Music className="w-5 h-5" />,
    portalUrl: "https://developers.tiktok.com/apps/",
    portalName: "TikTok for Developers",
    idLabel: "Client Key",
    secretLabel: "Client Secret",
    helpText: "Crie um app, adicione o produto Login Kit e a URI abaixo em Redirect URI. Use o Client Key (não o App ID) no primeiro campo.",
  },
  twitter: {
    label: "X / Twitter",
    color: "#1DA1F2",
    icon: <Twitter className="w-5 h-5" style={{ color: "#1DA1F2" }} />,
    portalUrl: "https://developer.twitter.com/en/portal/dashboard",
    portalName: "Twitter Developer Portal",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    helpText: "Em User authentication settings, ative OAuth 2.0, defina Type como Confidential client, e cole a URI abaixo em Callback URI.",
  },
  ga4: {
    label: "Google Analytics 4",
    color: "#F9AB00",
    icon: <BarChart3 className="w-5 h-5" style={{ color: "#F9AB00" }} />,
    portalUrl: "https://console.cloud.google.com/apis/credentials",
    portalName: "Google Cloud Console",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    helpText: "Reusa o mesmo OAuth Client do YouTube. Habilite Google Analytics Admin API e Data API no projeto, adicione a URI abaixo em Authorized redirect URIs. Se já configurou o YouTube, deixe estes campos vazios.",
  },
  threads: {
    label: "Threads",
    color: "#000000",
    icon: <AtSign className="w-5 h-5" />,
    portalUrl: "https://developers.facebook.com/apps/",
    portalName: "Meta for Developers",
    idLabel: "Threads App ID",
    secretLabel: "Threads App Secret",
    helpText: "No painel Meta, adicione o produto Threads API (não confundir com Instagram). Configure Redirect Callback URLs com a URI abaixo, e copie o App ID e App Secret específicos do produto Threads.",
  },
};

const PLATFORMS: Platform[] = ["youtube", "instagram", "facebook", "tiktok", "twitter", "ga4", "threads"];

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 break-all">{url}</code>
      <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="ml-1.5 text-xs">{copied ? "Copiado" : "Copiar"}</span>
      </Button>
    </div>
  );
}

interface PlatformFormProps {
  platform: Platform;
  cred: CredEntry | undefined;
  callbackUrl: string;
  onSaved: () => void;
}

function PlatformForm({ platform, cred, callbackUrl, onSaved }: PlatformFormProps) {
  const meta = PLATFORM_META[platform];
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast({ title: "Campos obrigatórios", description: "Informe Client ID e Client Secret.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${getApiUrl()}oauth-credentials/${platform}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Falha ao salvar");
      }
      toast({ title: `${meta.label} configurado`, description: "Credenciais salvas com segurança. Agora você pode conectar a plataforma." });
      setClientId("");
      setClientSecret("");
      onSaved();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha ao salvar credenciais.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const res = await authFetch(`${getApiUrl()}oauth-credentials/${platform}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao remover");
      toast({ title: "Credenciais removidas", description: `${meta.label} voltou ao estado padrão.` });
      onSaved();
    } catch {
      toast({ title: "Erro", description: "Falha ao remover credenciais.", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  const sourceBadge =
    cred?.source === "db" ? (
      <Badge variant="default" className="gap-1"><ShieldCheck className="w-3 h-3" /> Configurado</Badge>
    ) : cred?.source === "env" ? (
      <Badge variant="secondary" className="gap-1">Configurado via servidor</Badge>
    ) : (
      <Badge variant="outline">Não configurado</Badge>
    );

  return (
    <AccordionItem value={platform} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center justify-between w-full pr-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${meta.color}18` }}
            >
              {meta.icon}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{meta.label}</p>
              {cred?.clientIdPreview && (
                <p className="text-xs text-muted-foreground font-mono">{cred.clientIdPreview}</p>
              )}
            </div>
          </div>
          {sourceBadge}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2 pb-1">
          <p className="text-xs text-muted-foreground">{meta.helpText}</p>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">URI de redirecionamento (cole no portal)</Label>
            <CopyableUrl url={callbackUrl} />
          </div>

          <a
            href={meta.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Abrir {meta.portalName}
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${platform}-id`} className="text-xs">{meta.idLabel}</Label>
              <Input
                id={`${platform}-id`}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={cred?.source === "db" ? "Substituir credenciais atuais…" : "Cole o valor aqui"}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${platform}-secret`} className="text-xs">{meta.secretLabel}</Label>
              <Input
                id={`${platform}-secret`}
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              {cred?.source === "db" ? "Atualizar credenciais" : "Salvar credenciais"}
            </Button>
            {cred?.source === "db" && (
              <Button size="sm" variant="outline" onClick={remove} disabled={removing} className="text-destructive border-destructive/30 hover:bg-destructive/5">
                {removing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Remover
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            As credenciais são criptografadas (AES-256-GCM) antes de serem salvas no banco. Nunca são exibidas após o salvamento.
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function OAuthCredentialsSetup() {
  const [creds, setCreds] = useState<CredEntry[]>([]);
  const [callbackUrls, setCallbackUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [credsRes, configRes] = await Promise.all([
        authFetch(`${getApiUrl()}oauth-credentials`),
        fetch(`${getApiUrl()}auth/config`),
      ]);
      if (credsRes.ok) {
        const data = await credsRes.json();
        setCreds(data.credentials ?? []);
      }
      if (configRes.ok) {
        const data: Record<string, AuthConfigEntry> = await configRes.json();
        const urls: Record<string, string> = {};
        for (const p of PLATFORMS) {
          if (data[p]) urls[p] = data[p].callbackUrl;
        }
        setCallbackUrls(urls);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Credenciais OAuth 2.0
        </CardTitle>
        <CardDescription>
          Adicione suas próprias credenciais de cada plataforma para que o app possa conectar contas reais. Você cria o app no portal de desenvolvedor de cada serviço, copia Client ID e Client Secret, e cola aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {PLATFORMS.map((p) => (
              <PlatformForm
                key={p}
                platform={p}
                cred={creds.find((c) => c.platform === p)}
                callbackUrl={callbackUrls[p] ?? ""}
                onSaved={load}
              />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
