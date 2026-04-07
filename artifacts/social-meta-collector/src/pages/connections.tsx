import React, { useState } from "react";
import {
  useGetAuthStatus,
  getGetAuthStatusQueryKey,
  useConnectYoutube,
  useConnectInstagram,
  useConnectFacebook,
  useDisconnectPlatform,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Youtube, Instagram, Facebook, CheckCircle, XCircle, Loader2, Link, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlatformConnectFormProps {
  platform: "youtube" | "instagram" | "facebook";
  connected: boolean;
  accountName?: string;
  connectedAt?: string;
  icon: React.ReactNode;
  color: string;
  label: string;
  onConnected: () => void;
}

function PlatformConnectForm({
  platform,
  connected,
  accountName,
  connectedAt,
  icon,
  color,
  label,
  onConnected,
}: PlatformConnectFormProps) {
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectYoutube = useConnectYoutube();
  const connectInstagram = useConnectInstagram();
  const connectFacebook = useConnectFacebook();
  const disconnect = useDisconnectPlatform();

  const isConnecting =
    connectYoutube.isPending || connectInstagram.isPending || connectFacebook.isPending;
  const isDisconnecting = disconnect.isPending;

  const handleConnect = async () => {
    if (!token.trim() || !name.trim()) {
      toast({ title: "Missing fields", description: "Please enter both an account name and access token.", variant: "destructive" });
      return;
    }
    try {
      const body = { accessToken: token.trim(), accountName: name.trim() };
      if (platform === "youtube") await connectYoutube.mutateAsync({ data: body });
      else if (platform === "instagram") await connectInstagram.mutateAsync({ data: body });
      else await connectFacebook.mutateAsync({ data: body });

      toast({ title: `${label} connected`, description: `Successfully connected as ${name.trim()}.` });
      setToken("");
      setName("");
      queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
      onConnected();
    } catch {
      toast({ title: "Connection failed", description: "Please check your access token and try again.", variant: "destructive" });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync({ platform });
      toast({ title: `${label} disconnected`, description: "Platform disconnected successfully." });
      queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
      onConnected();
    } catch {
      toast({ title: "Error", description: "Failed to disconnect. Please try again.", variant: "destructive" });
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className={`h-1.5 w-full`} style={{ backgroundColor: color }} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              {connected && accountName && (
                <CardDescription className="text-xs mt-0.5">@{accountName}</CardDescription>
              )}
            </div>
          </div>
          <Badge
            variant={connected ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {connected ? (
              <><CheckCircle className="w-3 h-3" /> Connected</>
            ) : (
              <><XCircle className="w-3 h-3" /> Disconnected</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <div className="space-y-3">
            {connectedAt && (
              <p className="text-xs text-muted-foreground">
                Connected on {new Date(connectedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/5 w-full"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unlink className="w-4 h-4 mr-2" />}
              Disconnect {label}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Account name</Label>
              <Input
                placeholder={`Your ${label} handle or page name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Access token</Label>
              <Input
                placeholder="Paste your OAuth2 access token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                className="text-sm font-mono"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              style={{ backgroundColor: color }}
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
              Connect {label}
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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
  };

  const platforms = [
    {
      platform: "youtube" as const,
      label: "YouTube",
      color: "#FF0000",
      icon: <Youtube className="w-5 h-5" style={{ color: "#FF0000" }} />,
    },
    {
      platform: "instagram" as const,
      label: "Instagram",
      color: "#E1306C",
      icon: <Instagram className="w-5 h-5" style={{ color: "#E1306C" }} />,
    },
    {
      platform: "facebook" as const,
      label: "Facebook",
      color: "#1877F2",
      icon: <Facebook className="w-5 h-5" style={{ color: "#1877F2" }} />,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Platform Connections</h2>
          <p className="text-sm text-muted-foreground mt-1">Connect your social media accounts to start collecting metadata.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-56 animate-pulse bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-lg font-semibold">Platform Connections</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your social media accounts with an OAuth2 access token to start collecting metadata.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {platforms.map(({ platform, label, color, icon }) => {
          const status = authStatus?.[platform];
          return (
            <PlatformConnectForm
              key={platform}
              platform={platform}
              label={label}
              color={color}
              icon={icon}
              connected={status?.connected ?? false}
              accountName={status?.accountName}
              connectedAt={status?.connectedAt as string | undefined}
              onConnected={refresh}
            />
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>How to get an access token:</strong> For YouTube, use the Google Cloud Console with the YouTube Data API v3 scope.
            For Instagram and Facebook, use the Meta Developer Portal to generate a long-lived access token for your page or business account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
