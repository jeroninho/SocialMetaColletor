import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

type Mode = "login" | "register";

function getApiBase() {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api`;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { refetch } = useAuth();

  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiBase()}/auth/google/config`)
      .then((r) => r.json())
      .then((data: { clientId: string; enabled: boolean }) => {
        if (!cancelled && data.enabled && data.clientId) setGoogleClientId(data.clientId);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    const SCRIPT_ID = "google-gsi-script";
    const setup = () => {
      const g = window.google;
      if (!g || !googleBtnRef.current) return;
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      });
      googleBtnRef.current.innerHTML = "";
      g.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 336,
      });
    };

    if (document.getElementById(SCRIPT_ID)) { setup(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.id = SCRIPT_ID;
    s.onload = setup;
    document.head.appendChild(s);
  }, [googleClientId]);

  async function handleGoogleResponse(response: { credential: string }) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = (await res.json()) as { token?: string; message?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.message ?? "Não foi possível entrar com Google.");
        return;
      }
      localStorage.setItem("smc_token", data.token);
      await refetch();
      toast({ title: "Bem-vindo!", description: "Login com Google realizado com sucesso." });
      navigate("/dashboard");
    } catch {
      setError("Erro de conexão ao autenticar com Google.");
    } finally {
      setLoading(false);
    }
  }

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

      const data = (await res.json()) as {
        token?: string;
        message?: string;
        error?: string;
        issues?: Array<{ message: string }>;
      };

      if (!res.ok) {
        setError(data.issues?.[0]?.message ?? data.message ?? "Ocorreu um erro. Tente novamente.");
        return;
      }
      if (data.token) {
        localStorage.setItem("smc_token", data.token);
        await refetch();
      }
      toast({
        title: mode === "login" ? "Bem-vindo de volta!" : "Conta criada!",
        description: mode === "login" ? "Login realizado com sucesso." : "Sua conta foi criada com sucesso.",
      });
      navigate("/dashboard");
    } catch {
      setError("Erro de conexão. Verifique sua rede e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes login-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-fade   { animation: login-fade 0.5s ease-out both; }
        .login-fade-1 { animation: login-fade 0.5s ease-out 0.06s both; }
        .login-fade-2 { animation: login-fade 0.5s ease-out 0.12s both; }
        .login-fade-3 { animation: login-fade 0.5s ease-out 0.18s both; }
        .login-fade-4 { animation: login-fade 0.5s ease-out 0.24s both; }

        .login-input {
          width: 100%;
          padding: 12px 14px 12px 40px;
          border-radius: 6px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          font-size: 14.5px;
          color: hsl(var(--foreground));
          outline: none;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.18s ease;
        }
        .login-input:focus {
          border-color: hsl(var(--foreground));
        }
        .login-input:focus-visible {
          outline: 2px solid hsl(var(--foreground) / 0.18);
          outline-offset: 1px;
        }
        .login-input::placeholder { color: hsl(var(--muted-foreground)); }
        .login-tab:focus-visible {
          outline: 2px solid hsl(var(--foreground) / 0.25);
          outline-offset: 2px;
        }

        .login-submit {
          width: 100%;
          padding: 12px;
          border-radius: 999px;
          border: 1px solid hsl(var(--foreground));
          background: hsl(var(--foreground));
          color: hsl(var(--background));
          font-size: 14.5px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.18s ease, transform 0.12s ease;
        }
        .login-submit:hover:not(:disabled) { background: hsl(var(--foreground) / 0.88); }
        .login-submit:active:not(:disabled) { transform: scale(0.985); }
        .login-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .login-tab {
          flex: 1;
          padding: 9px;
          font-size: 13.5px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: transparent;
          color: hsl(var(--muted-foreground));
          transition: all 0.18s ease;
        }
        .login-tab.active {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
      `}</style>

      <div className="min-h-[100dvh] flex bg-background">

        {/* ── Left panel: editorial branding (desktop) ─────── */}
        <div className="hidden lg:flex w-1/2 bg-cream border-r border-border relative overflow-hidden">
          <div className="flex flex-col justify-between p-12 xl:p-16 w-full">
            {/* Brand mark */}
            <Link href="/">
              <span className="flex items-center gap-2.5 cursor-pointer select-none">
                <span className="w-6 h-6 rounded-sm bg-foreground flex items-center justify-center">
                  <span className="block w-2 h-2 bg-background rounded-[1px]" />
                </span>
                <span
                  className="text-[16px] text-foreground font-medium"
                  style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}
                >
                  MetaCollector
                </span>
              </span>
            </Link>

            {/* Center quote */}
            <div className="max-w-md">
              <p className="eyebrow mb-5">Análise social</p>
              <h2 className="font-display text-foreground" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.1 }}>
                Centralize suas<br />
                <span className="text-muted-foreground">métricas sociais.</span>
              </h2>
              <p className="mt-6 text-[15px] text-muted-foreground leading-[1.6] max-w-sm">
                YouTube, Instagram, Facebook, TikTok e X — em um único
                painel calmo, feito para foco.
              </p>
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-5 text-[12px] text-muted-foreground tracking-wide uppercase">
              <span>YouTube</span>
              <span className="w-1 h-1 rounded-full bg-foreground/20" />
              <span>Instagram</span>
              <span className="w-1 h-1 rounded-full bg-foreground/20" />
              <span>Facebook</span>
              <span className="w-1 h-1 rounded-full bg-foreground/20" />
              <span>TikTok</span>
              <span className="w-1 h-1 rounded-full bg-foreground/20" />
              <span>X</span>
            </div>
          </div>
        </div>

        {/* ── Right panel: form ────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">

          {/* Mobile brand */}
          <div className="lg:hidden mb-10 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-sm bg-foreground flex items-center justify-center">
              <span className="block w-2 h-2 bg-background rounded-[1px]" />
            </span>
            <span
              className="text-[16px] text-foreground font-medium"
              style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}
            >
              MetaCollector
            </span>
          </div>

          <div className="w-full max-w-[400px]">

            {/* Heading */}
            <div className="login-fade mb-9">
              <h1
                className="text-foreground font-display"
                style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: 1.1 }}
              >
                {mode === "login" ? "Bem-vindo de volta." : "Criar conta."}
              </h1>
              <p className="mt-3 text-[14.5px] text-muted-foreground">
                {mode === "login"
                  ? "Entre para acessar seu painel."
                  : "Centralize suas redes sociais em minutos."}
              </p>
            </div>

            {/* Google sign-in */}
            {googleClientId && (
              <div className="login-fade-1 mb-5">
                <div
                  ref={googleBtnRef}
                  style={{ display: "flex", justifyContent: "center", minHeight: 44 }}
                />
                <div className="flex items-center gap-3 mt-5">
                  <div className="flex-1 h-px bg-border" />
                  <span className="eyebrow text-[11px] tracking-[0.16em]">ou</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </div>
            )}

            {/* Tab switcher */}
            <div className="login-fade-2 flex gap-1 p-1 bg-muted rounded-md mb-7">
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`login-tab${mode === m ? " active" : ""}`}
                  data-testid={`tab-${m}`}
                  onClick={() => { setMode(m); setError(null); }}
                >
                  {m === "login" ? "Entrar" : "Cadastrar"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="login-fade-3 flex flex-col gap-4 mb-5">

                {mode === "register" && (
                  <div>
                    <label className="block mb-1.5 text-[12.5px] font-medium text-foreground/75">
                      Nome
                    </label>
                    <div className="relative">
                      <User
                        size={14}
                        strokeWidth={1.5}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                      <input
                        className="login-input"
                        type="text"
                        placeholder="Seu nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        minLength={2}
                        autoComplete="name"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-[12.5px] font-medium text-foreground/75">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail
                      size={14}
                      strokeWidth={1.5}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                      className="login-input"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-[12.5px] font-medium text-foreground/75">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock
                      size={14}
                      strokeWidth={1.5}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                      className="login-input"
                      type={showSenha ? "text" : "password"}
                      placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Sua senha"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      minLength={mode === "register" ? 8 : 1}
                      style={{ paddingRight: 40 }}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSenha ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 px-3.5 py-2.5 rounded-md border border-destructive/30 bg-destructive/[0.04] text-destructive text-[13px]">
                  {error}
                </div>
              )}

              <div className="login-fade-4">
                <button type="submit" className="login-submit" data-testid="button-submit" disabled={loading}>
                  {loading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <>
                        {mode === "login" ? "Entrar" : "Criar conta"}
                        <ArrowRight size={14} strokeWidth={1.75} />
                      </>
                  }
                </button>
              </div>
            </form>

            {/* Switch mode */}
            <p className="mt-6 text-center text-[13px] text-muted-foreground">
              {mode === "login" ? "Ainda não tem conta? " : "Já tem uma conta? "}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                className="text-foreground font-medium underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors"
              >
                {mode === "login" ? "Cadastre-se" : "Entrar"}
              </button>
            </p>
          </div>

          <p className="mt-10 text-[11px] text-muted-foreground tracking-wide uppercase">
            Protegido com criptografia AES-256-GCM
          </p>
        </div>
      </div>
    </>
  );
}
