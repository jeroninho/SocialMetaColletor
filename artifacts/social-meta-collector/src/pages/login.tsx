import React, { useState } from "react";
import { useLocation } from "wouter";
import { BarChart2, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "register";

function getApiBase() {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api`;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body: Record<string, string> = { email, senha };
      if (mode === "register") body["nome"] = nome;

      const res = await fetch(`${getApiBase()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { token?: string; message?: string; error?: string; issues?: Array<{ message: string }> };

      if (!res.ok) {
        const msg = data.issues?.[0]?.message ?? data.message ?? "Ocorreu um erro. Tente novamente.";
        setError(msg);
        return;
      }

      if (data.token) {
        localStorage.setItem("smc_token", data.token);
      }

      toast({
        title: mode === "login" ? "Bem-vindo de volta!" : "Conta criada!",
        description: data.message ?? (mode === "login" ? "Login realizado com sucesso." : "Sua conta foi criada com sucesso."),
      });

      navigate("/");
    } catch {
      setError("Erro de conexão. Verifique sua rede e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mb-4"
            style={{ background: "linear-gradient(135deg, #6C63FF, #FF6F91)" }}
          >
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight mb-1"
            style={{ fontFamily: "var(--app-font-heading)" }}
          >
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {mode === "login"
              ? "Entre para acessar seu painel de métricas sociais"
              : "Centralize as métricas das suas redes sociais em um só lugar"}
          </p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="pt-6 pb-6 px-6">
            <div className="flex rounded-xl bg-muted/50 p-1 mb-6">
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); }}
                  className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                  style={{
                    fontFamily: "var(--app-font-heading)",
                    background: mode === m ? "linear-gradient(135deg, #6C63FF, #FF6F91)" : "transparent",
                    color: mode === m ? "#fff" : undefined,
                  }}
                >
                  {m === "login" ? "Entrar" : "Cadastrar"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-sm font-medium">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="pl-9"
                      required
                      minLength={2}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Sua senha"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    minLength={mode === "register" ? 8 : 1}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm rounded-lg px-3 py-2 bg-destructive/10" style={{ color: "#F44336" }}>
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full font-semibold text-white border-0 mt-2"
                style={{
                  fontFamily: "var(--app-font-heading)",
                  background: "linear-gradient(135deg, #6C63FF, #FF6F91)",
                  transition: "opacity 0.2s",
                }}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-4">
              {mode === "login" ? "Ainda não tem conta? " : "Já tem uma conta? "}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                style={{ color: "#6C63FF" }}
              >
                {mode === "login" ? "Cadastre-se" : "Entrar"}
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Seus dados são protegidos com criptografia AES-256-GCM
        </p>
      </div>
    </div>
  );
}
