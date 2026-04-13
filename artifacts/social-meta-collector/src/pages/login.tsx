import React, { useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, User, Eye, EyeOff, Loader2, BarChart2, ArrowRight, TrendingUp, Users, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";

/* ─── Design tokens ─────────────────────────────────────── */
const PETROLEUM = "#1E2A38";
const BLUE      = "#4F6BF4";

type Mode = "login" | "register";

function getApiBase() {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api`;
}

/* ─── Mock dashboard preview panel ──────────────────────── */
function DashboardPreview() {
  const statRows = [
    { label: "Total de Seguidores", value: "248.3K", icon: Users, trend: "+12.4%", color: BLUE },
    { label: "Visualizações", value: "1.82M", icon: TrendingUp, trend: "+8.1%", color: "#1877F2" },
    { label: "Taxa de Engajamento", value: "4.72%", icon: Activity, trend: "+1.7%", color: "#4CAF50" },
  ];

  const barData = [
    { label: "YT", val: 72, color: "#FF4444" },
    { label: "IG", val: 55, color: "#E1306C" },
    { label: "FB", val: 33, color: "#1877F2" },
  ];

  const maxVal = Math.max(...barData.map((b) => b.val));

  return (
    <div style={{
      width: "100%",
      background: "rgba(255,255,255,0.05)",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.10)",
      padding: "20px",
      maxWidth: 380,
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, paddingBottom: 14,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13, fontWeight: 700, color: "white",
          letterSpacing: "-0.01em",
        }}>
          Dashboard
        </span>
        <span style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 11,
          color: "#4CAF50", fontFamily: "'Inter', sans-serif", fontWeight: 500,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }} />
          Ao vivo
        </span>
      </div>

      {/* Stat rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {statRows.map(({ label, value, icon: Icon, trend, color }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 5,
                background: `${color}20`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={13} style={{ color }} />
              </div>
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 1 }}>{label}</p>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>{value}</p>
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
              color: "#4CAF50", padding: "2px 7px", borderRadius: 3,
              background: "rgba(76,175,80,0.14)",
            }}>
              {trend}
            </span>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.40)", marginBottom: 10 }}>
          Seguidores por plataforma
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 64 }}>
          {barData.map(({ label, val, color }) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%",
                  height: `${(val / maxVal) * 100}%`,
                  background: color,
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.85,
                }} />
              </div>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.40)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-slide   { animation: fadeSlideUp 0.4s ease-out both; }
        .fade-slide-1 { animation: fadeSlideUp 0.4s ease-out 0.04s both; }
        .fade-slide-2 { animation: fadeSlideUp 0.4s ease-out 0.08s both; }
        .fade-slide-3 { animation: fadeSlideUp 0.4s ease-out 0.12s both; }
        .fade-slide-4 { animation: fadeSlideUp 0.4s ease-out 0.16s both; }
        .login-input {
          width: 100%;
          padding: 11px 14px 11px 40px;
          border-radius: 0.625rem;
          border: 1px solid rgba(0,0,0,0.12);
          background: #ffffff;
          font-size: 14px;
          color: #030213;
          outline: none;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: rgba(0,0,0,0.30);
          box-shadow: 0 0 0 3px rgba(3,2,19,0.08);
          background: #fff;
        }
        .login-input::placeholder { color: #9CA3AF; }
        .login-btn {
          width: 100%;
          padding: 12px;
          border-radius: 0.625rem;
          border: none;
          background: #030213;
          color: white;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 2px 8px rgba(3,2,19,0.18);
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.88;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(3,2,19,0.22);
        }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .tab-btn {
          flex: 1;
          padding: 8px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          border: none;
          border-radius: calc(0.625rem - 2px);
          cursor: pointer;
          transition: all 0.15s;
          background: transparent;
          color: #6B7280;
        }
        .tab-btn.active {
          background: #030213;
          color: white;
          box-shadow: 0 2px 8px rgba(3,2,19,0.18);
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100dvh", background: "#ffffff" }}>

        {/* ── Left panel: form ──────────────────────────── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: "#ffffff",
        }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ marginBottom: 28, textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              marginBottom: 0,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "0.625rem",
                background: BLUE,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <BarChart2 size={15} color="white" />
              </div>
              <p style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 19, fontWeight: 700, color: PETROLEUM,
                letterSpacing: "-0.02em",
              }}>
                MetaCollector
              </p>
            </div>
          </div>

          {/* Form card */}
          <div
            className="fade-slide"
            style={{
              width: "100%", maxWidth: 400,
              background: "white",
              borderRadius: 20,
              padding: "36px 32px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            {/* Heading */}
            <div className="fade-slide-1" style={{ marginBottom: 24 }}>
              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 22, fontWeight: 700,
                color: PETROLEUM, letterSpacing: "-0.025em",
                marginBottom: 5,
              }}>
                {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
              </h1>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13, color: "#6B7280", lineHeight: 1.5,
              }}>
                {mode === "login"
                  ? "Entre para acessar seu painel"
                  : "Centralize suas redes sociais"}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="fade-slide-2" style={{
              display: "flex", gap: 3, padding: 3,
              background: "#F3F4F6", borderRadius: 7,
              marginBottom: 22,
            }}>
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`tab-btn${mode === m ? " active" : ""}`}
                  onClick={() => { setMode(m); setError(null); }}
                >
                  {m === "login" ? "Entrar" : "Cadastrar"}
                </button>
              ))}
            </div>

            {/* Form fields */}
            <form onSubmit={handleSubmit}>
              <div className="fade-slide-3" style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>

                {mode === "register" && (
                  <div>
                    <label style={{
                      display: "block", marginBottom: 5,
                      fontSize: 13, fontWeight: 500,
                      color: "#374151", fontFamily: "'Inter', sans-serif",
                    }}>
                      Nome completo
                    </label>
                    <div style={{ position: "relative" }}>
                      <User
                        size={14}
                        style={{
                          position: "absolute", left: 12,
                          top: "50%", transform: "translateY(-50%)",
                          color: "#9CA3AF", pointerEvents: "none",
                        }}
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
                  <label style={{
                    display: "block", marginBottom: 5,
                    fontSize: 13, fontWeight: 500,
                    color: "#374151", fontFamily: "'Inter', sans-serif",
                  }}>
                    E-mail
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail
                      size={14}
                      style={{
                        position: "absolute", left: 12,
                        top: "50%", transform: "translateY(-50%)",
                        color: "#9CA3AF", pointerEvents: "none",
                      }}
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
                  <label style={{
                    display: "block", marginBottom: 5,
                    fontSize: 13, fontWeight: 500,
                    color: "#374151", fontFamily: "'Inter', sans-serif",
                  }}>
                    Senha
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={14}
                      style={{
                        position: "absolute", left: 12,
                        top: "50%", transform: "translateY(-50%)",
                        color: "#9CA3AF", pointerEvents: "none",
                      }}
                    />
                    <input
                      className="login-input"
                      type={showSenha ? "text" : "password"}
                      placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Sua senha"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      minLength={mode === "register" ? 8 : 1}
                      style={{ paddingRight: 38 }}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha((v) => !v)}
                      style={{
                        position: "absolute", right: 11,
                        top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none",
                        color: "#9CA3AF", cursor: "pointer",
                        padding: 2, display: "flex",
                      }}
                    >
                      {showSenha
                        ? <EyeOff size={15} />
                        : <Eye size={15} />
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  marginBottom: 14, padding: "9px 12px",
                  background: "#FEF2F2", borderRadius: 6,
                  border: "1px solid #FECACA",
                  color: "#B91C1C",
                  fontSize: 13, fontFamily: "'Inter', sans-serif",
                }}>
                  {error}
                </div>
              )}

              <div className="fade-slide-4">
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <>
                        {mode === "login" ? "Entrar" : "Criar conta"}
                        <ArrowRight size={14} />
                      </>
                  }
                </button>
              </div>
            </form>

            {/* Switch mode */}
            <p style={{
              marginTop: 18, textAlign: "center",
              fontSize: 13, color: "#6B7280",
              fontFamily: "'Inter', sans-serif",
            }}>
              {mode === "login" ? "Ainda não tem conta? " : "Já tem uma conta? "}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                style={{
                  background: "none", border: "none",
                  color: BLUE, fontWeight: 600,
                  cursor: "pointer", fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                {mode === "login" ? "Cadastre-se" : "Entrar"}
              </button>
            </p>
          </div>

          {/* Security note */}
          <p style={{
            marginTop: 16, fontSize: 12,
            color: "#9CA3AF", textAlign: "center",
            fontFamily: "'Inter', sans-serif",
          }}>
            Protegido com criptografia AES-256-GCM
          </p>
        </div>

        {/* ── Right panel: branding + dashboard preview ── */}
        <div
          style={{
            display: "none",
            width: "50%",
            background: `linear-gradient(155deg, ${PETROLEUM} 0%, #1A2840 55%, #0F1824 100%)`,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px",
          }}
          className="lg:!flex"
        >
          {/* Logo + copy */}
          <div style={{ marginBottom: 40, width: "100%", maxWidth: 380 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              marginBottom: 20,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: BLUE,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <BarChart2 size={18} color="white" />
              </div>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20, fontWeight: 700, color: "white",
                letterSpacing: "-0.025em",
              }}>
                MetaCollector
              </span>
            </div>

            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(22px, 2.5vw, 30px)",
              fontWeight: 700, color: "white",
              letterSpacing: "-0.03em", lineHeight: 1.25,
              marginBottom: 12,
            }}>
              Unifique suas métricas sociais em um só painel.
            </h2>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14, color: "rgba(232,234,240,0.60)",
              lineHeight: 1.65,
            }}>
              YouTube, Instagram e Facebook com insights reais. Dados atualizados automaticamente.
            </p>
          </div>

          {/* Dashboard preview widget */}
          <div style={{ width: "100%", maxWidth: 380 }}>
            <DashboardPreview />
          </div>
        </div>
      </div>
    </>
  );
}
