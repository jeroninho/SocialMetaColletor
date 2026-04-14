import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Calendar,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { PLATFORM_COLORS } from "@/lib/chart-theme";
import { getApiUrl, authFetch } from "@/lib/api-url";

const ALL_PLATFORMS = ["youtube", "instagram", "facebook", "tiktok", "twitter"];

const INTERVALS = [
  { value: 5, label: "5 minutos" },
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 360, label: "6 horas" },
  { value: 720, label: "12 horas" },
  { value: 1440, label: "24 horas" },
];

interface Schedule {
  id: number;
  platforms: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

export default function SchedulerPage() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube", "instagram"]);
  const [interval, setInterval] = useState(60);

  const base = getApiUrl();

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${base}scheduler/schedules`);
      const data = await res.json();
      setSchedules(data.items ?? []);
    } catch {
      setSchedules([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSchedules(); }, []);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleCreate = async () => {
    if (selectedPlatforms.length === 0) return;
    try {
      const res = await authFetch(`${base}scheduler/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: selectedPlatforms, intervalMinutes: interval }),
      });
      if (res.ok) {
        toast({ title: "Agendamento criado!", description: `Sincronização a cada ${INTERVALS.find((i) => i.value === interval)?.label}.` });
        setShowForm(false);
        fetchSchedules();
      } else {
        toast({ title: "Erro", description: "Falha ao criar agendamento.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha na conexão.", variant: "destructive" });
    }
  };

  const handleToggle = async (id: number) => {
    await authFetch(`${base}scheduler/schedules/${id}/toggle`, { method: "PATCH" });
    fetchSchedules();
  };

  const handleDelete = async (id: number) => {
    await authFetch(`${base}scheduler/schedules/${id}`, { method: "DELETE" });
    fetchSchedules();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agendamento de Sincronizações</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure sincronizações automáticas de métricas
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="rounded-full h-9">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancelar" : "Novo Agendamento"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Novo Agendamento</CardTitle>
            <CardDescription className="text-xs">Escolha as plataformas e o intervalo de sincronização</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Plataformas</p>
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      selectedPlatforms.includes(p)
                        ? "text-white border-transparent"
                        : "text-muted-foreground border-border hover:border-foreground/30"
                    }`}
                    style={
                      selectedPlatforms.includes(p)
                        ? { backgroundColor: PLATFORM_COLORS[p as keyof typeof PLATFORM_COLORS] }
                        : {}
                    }
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Intervalo</label>
              <select
                className="text-sm border rounded-lg px-3 py-2 bg-background"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value))}
              >
                {INTERVALS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>

            <Button size="sm" onClick={handleCreate} disabled={selectedPlatforms.length === 0}>
              <Clock className="w-4 h-4 mr-2" />
              Criar Agendamento
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Agendamentos Ativos</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {loading ? (
            <div className="p-6"><Skeleton className="h-24 w-full" /></div>
          ) : schedules.length === 0 ? (
            <div className="p-6 text-center">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum agendamento configurado</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Agendamento" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs pl-6">Plataformas</TableHead>
                  <TableHead className="text-xs">Intervalo</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Última Execução</TableHead>
                  <TableHead className="text-xs">Criado em</TableHead>
                  <TableHead className="text-xs text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const platforms = schedule.platforms.split(",");
                  const intervalLabel = INTERVALS.find((i) => i.value === schedule.intervalMinutes)?.label ?? `${schedule.intervalMinutes} min`;
                  return (
                    <TableRow key={schedule.id} className="hover:bg-muted/30">
                      <TableCell className="pl-6">
                        <div className="flex flex-wrap gap-1">
                          {platforms.map((p) => (
                            <Badge
                              key={p}
                              variant="outline"
                              className="text-xs capitalize"
                              style={{ borderColor: `${PLATFORM_COLORS[p.trim() as keyof typeof PLATFORM_COLORS]}40` }}
                            >
                              {p.trim()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                          {intervalLabel}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={schedule.enabled ? "default" : "secondary"} className="text-xs">
                          {schedule.enabled ? "Ativo" : "Pausado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {schedule.lastRunAt
                          ? new Date(schedule.lastRunAt).toLocaleString("pt-BR")
                          : "Nunca"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(schedule.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleToggle(schedule.id)} className="p-1.5 rounded-md hover:bg-muted">
                            {schedule.enabled
                              ? <ToggleRight className="w-4 h-4 text-green-500" />
                              : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          <button onClick={() => handleDelete(schedule.id)} className="p-1.5 rounded-md hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
