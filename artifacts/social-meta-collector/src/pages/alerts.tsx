import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell, Plus, Trash2, ToggleLeft, ToggleRight, Send, Clock, AlertTriangle,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, authFetch } from "@/lib/api-url";

const METRICS = [
  { value: "views", label: "Visualizações" },
  { value: "likes", label: "Curtidas" },
  { value: "comments", label: "Comentários" },
  { value: "shares", label: "Compartilhamentos" },
  { value: "engagementRate", label: "Taxa de Engajamento" },
  { value: "followers", label: "Seguidores" },
];

const CONDITIONS = [
  { value: "above", label: "Acima de" },
  { value: "below", label: "Abaixo de" },
];

const PLATFORMS = ["youtube", "instagram", "facebook", "tiktok", "twitter"];
const CHANNELS = [
  { value: "slack", label: "Slack" },
  { value: "email", label: "E-mail" },
];

interface AlertRule {
  id: number;
  name: string;
  platform: string;
  metric: string;
  condition: string;
  threshold: number;
  channel: string;
  webhookUrl?: string;
  email?: string;
  enabled: boolean;
  createdAt: string;
}

interface AlertHistoryItem {
  id: number;
  ruleName: string;
  platform: string;
  metric: string;
  currentValue: number;
  threshold: number;
  channel: string;
  status: string;
  sentAt: string;
}

export default function AlertsPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    platform: "youtube",
    metric: "views",
    condition: "above",
    threshold: 10000,
    channel: "slack",
    webhookUrl: "",
    email: "",
  });

  const base = getApiUrl();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, historyRes] = await Promise.all([
        authFetch(`${base}alerts/rules`).then((r) => r.json()),
        authFetch(`${base}alerts/history`).then((r) => r.json()),
      ]);
      setRules(rulesRes.items ?? []);
      setHistory(historyRes.items ?? []);
    } catch {
      setRules([]);
      setHistory([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    try {
      const res = await authFetch(`${base}alerts/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: "Alerta criado!", description: `Regra "${form.name}" configurada.` });
        setShowForm(false);
        setForm({ name: "", platform: "youtube", metric: "views", condition: "above", threshold: 10000, channel: "slack", webhookUrl: "", email: "" });
        fetchData();
      } else {
        toast({ title: "Erro", description: "Falha ao criar alerta.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha na conexão.", variant: "destructive" });
    }
  };

  const handleToggle = async (id: number) => {
    await authFetch(`${base}alerts/rules/${id}/toggle`, { method: "PATCH" });
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await authFetch(`${base}alerts/rules/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleTest = async () => {
    try {
      const res = await authFetch(`${base}alerts/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: form.channel,
          webhookUrl: form.webhookUrl,
          email: form.email,
        }),
      });
      const data = await res.json();
      toast({ title: res.ok ? "Teste enviado!" : "Erro no teste", description: data.message ?? data.error });
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar teste.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Alertas Inteligentes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure notificações automáticas sobre engajamento
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="rounded-full h-9">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancelar" : "Novo Alerta"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Nova Regra de Alerta</CardTitle>
            <CardDescription className="text-xs">Configure quando e como receber notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nome do Alerta</label>
                <input
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  placeholder="Ex: Alerta de views YouTube"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Plataforma</label>
                <select
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Métrica</label>
                <select
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  value={form.metric}
                  onChange={(e) => setForm({ ...form, metric: e.target.value })}
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Condição</label>
                <select
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Limite</label>
                <input
                  type="number"
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Canal de Notificação</label>
                <select
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  {CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.channel === "slack" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Webhook URL do Slack</label>
                <input
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  placeholder="https://hooks.slack.com/services/..."
                  value={form.webhookUrl}
                  onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                />
              </div>
            )}

            {form.channel === "email" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">E-mail</label>
                <input
                  type="email"
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={!form.name}>
                <Bell className="w-4 h-4 mr-2" />
                Criar Alerta
              </Button>
              <Button size="sm" variant="outline" onClick={handleTest}>
                <Send className="w-4 h-4 mr-2" />
                Enviar Teste
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Regras Ativas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {loading ? (
            <div className="p-6"><Skeleton className="h-24 w-full" /></div>
          ) : rules.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum alerta configurado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs pl-6">Nome</TableHead>
                  <TableHead className="text-xs">Plataforma</TableHead>
                  <TableHead className="text-xs">Métrica</TableHead>
                  <TableHead className="text-xs">Condição</TableHead>
                  <TableHead className="text-xs">Canal</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium text-sm">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{rule.platform}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{rule.metric}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {CONDITIONS.find((c) => c.value === rule.condition)?.label ?? rule.condition} {rule.threshold.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{rule.channel}</TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                        {rule.enabled ? "Ativo" : "Pausado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleToggle(rule.id)} className="p-1.5 rounded-md hover:bg-muted">
                          {rule.enabled
                            ? <ToggleRight className="w-4 h-4 text-green-500" />
                            : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-md hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Histórico de Alertas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {loading ? (
            <div className="p-6"><Skeleton className="h-24 w-full" /></div>
          ) : history.length === 0 ? (
            <div className="p-6 text-center">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum alerta enviado ainda</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs pl-6">Regra</TableHead>
                  <TableHead className="text-xs">Plataforma</TableHead>
                  <TableHead className="text-xs">Métrica</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">Limite</TableHead>
                  <TableHead className="text-xs">Canal</TableHead>
                  <TableHead className="text-xs text-right pr-6">Enviado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium text-sm">{item.ruleName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{item.platform}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{item.metric}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{item.currentValue.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{item.threshold.toLocaleString()}</TableCell>
                    <TableCell className="text-sm capitalize">{item.channel}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground pr-6">
                      {new Date(item.sentAt).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
