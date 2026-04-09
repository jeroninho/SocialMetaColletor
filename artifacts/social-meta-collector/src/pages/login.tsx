import React, { useState } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, User, Eye, EyeOff, Loader2, BarChart2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";

/* ─── Design tokens ─────────────────────────────────────── */
const PETROLEUM = "#1E2A38";
const PURPLE    = "#6C63FF";
const ROSE      = "#FF6F91";

/* ─── Inline SVG platform logos ─────────────────────────── */
function YouTubeLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#FF0000" />
      <path d="M25.8 11.4C25.6 10.6 24.9 10 24.1 9.8C22.5 9.4 16 9.4 16 9.4C16 9.4 9.5 9.4 7.9 9.8C7.1 10 6.4 10.7 6.2 11.4C5.8 13 5.8 16 5.8 16C5.8 16 5.8 19 6.2 20.6C6.4 21.4 7.1 22 7.9 22.2C9.5 22.6 16 22.6 16 22.6C16 22.6 22.5 22.6 24.1 22.2C24.9 22 25.6 21.3 25.8 20.6C26.2 19 26.2 16 26.2 16C26.2 16 26.2 13 25.8 11.4Z" fill="white" />
      <path d="M13.6 19.4L19.6 16L13.6 12.6V19.4Z" fill="#FF0000" />
    </svg>
  );
}

function InstagramLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="igGrad" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F9A825" />
          <stop offset="0.4" stopColor="#E1306C" />
          <stop offset="1" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#igGrad)" />
      <rect x="10" y="10" width="12" height="12" rx="3.5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="16" cy="16" r="3.2" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="22" cy="10.5" r="1.1" fill="white" />
    </svg>
  );
}

function FacebookLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#1877F2" />
      <path d="M20.5 10H18C17 10 16 11 16 12V14H13.5V17H16V26H19V17H21.5L22 14H19V12.5C19 12.2 19.2 12 19.5 12H22V10H20.5Z" fill="white" />
    </svg>
  );
}

function TikTokLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#010101" />
      <path d="M21.5 7H18.8C18.8 7 19.2 10.6 23 11.1V13.7C23 13.7 21.2 13.6 19.5 12.7V19.5C19.5 22.5 17.2 25 14 25C10.7 25 8 22.3 8 19C8 15.7 10.7 13 14 13V15.7C12.2 15.7 10.7 17.2 10.7 19C10.7 20.8 12.2 22.3 14 22.3C15.8 22.3 17.3 20.8 17.3 19V7H21.5Z" fill="white" />
      <path d="M20.5 6H22.5C22.5 6 23 9.8 27 10V12C27 12 25 11.8 23 10.5V19C23 22.9 19.9 26 16 26C12.1 26 9 22.9 9 19C9 15.1 12.1 12 16 12V14.2C13.3 14.2 11.2 16.3 11.2 19C11.2 21.7 13.3 23.8 16 23.8C18.7 23.8 20.8 21.7 20.8 19V6H20.5Z" fill="#25F4EE" opacity="0.7" />
    </svg>
  );
}

/* ─── Floating bubble ────────────────────────────────────── */
interface BubbleProps {
  style: React.CSSProperties;
  animClass: string;
  children: React.ReactNode;
}

function FloatingBubble({ style, animClass, children }: BubbleProps) {
  return (
    <div
      className={animClass}
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "16px",
        padding: "12px",
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        ...style,
      }}
    >
      {children}
    </div>
  );
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
      navigate("/");
    } catch {
      setError("Erro de conexão. Verifique sua rede e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Keyframe animations injected via style tag ── */}
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-18px) rotate(4deg); }
          66%       { transform: translateY(-8px) rotate(-3deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40%       { transform: translateY(-22px) rotate(-5deg); }
          75%       { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50%       { transform: translateY(-14px) rotate(6deg) scale(1.04); }
        }
        @keyframes floatD {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          30%       { transform: translateY(-20px) rotate(-4deg); }
          70%       { transform: translateY(-6px) rotate(5deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 0 rgba(108,99,255,0); }
          50%       { box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 20px 4px rgba(108,99,255,0.25); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lineGrow {
          from { width: 0; }
          to   { width: 48px; }
        }
        .float-a { animation: floatA 6s ease-in-out infinite; }
        .float-b { animation: floatB 7.5s ease-in-out infinite 0.8s; }
        .float-c { animation: floatC 5.5s ease-in-out infinite 1.5s; }
        .float-d { animation: floatD 8s ease-in-out infinite 0.4s; }
        .pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
        .fade-slide { animation: fadeSlideUp 0.5s ease-out both; }
        .fade-slide-1 { animation: fadeSlideUp 0.5s ease-out 0.05s both; }
        .fade-slide-2 { animation: fadeSlideUp 0.5s ease-out 0.1s both; }
        .fade-slide-3 { animation: fadeSlideUp 0.5s ease-out 0.15s both; }
        .fade-slide-4 { animation: fadeSlideUp 0.5s ease-out 0.2s both; }
        .login-input {
          width: 100%;
          padding: 11px 14px 11px 40px;
          border-radius: 10px;
          border: 1.5px solid rgba(30,42,56,0.15);
          background: #F8FAFC;
          font-size: 15px;
          color: #111;
          outline: none;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-input:focus {
          border-color: #6C63FF;
          box-shadow: 0 0 0 3px rgba(108,99,255,0.14);
          background: #fff;
        }
        .login-input::placeholder { color: #9CA3AF; }
        .login-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6C63FF 0%, #FF6F91 100%);
          color: white;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Space Grotesk', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(108,99,255,0.35);
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(108,99,255,0.45);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .tab-btn {
          flex: 1;
          padding: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Space Grotesk', sans-serif;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #6B7280;
        }
        .tab-btn.active {
          background: #6C63FF;
          color: white;
          box-shadow: 0 2px 8px rgba(108,99,255,0.3);
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100dvh", background: "#F0F2F5" }}>

        {/* ── Left panel: animated branding ──────────────── */}
        <div
          style={{
            display: "none",
            width: "50%",
            background: `linear-gradient(145deg, ${PETROLEUM} 0%, #243447 60%, #1a2535 100%)`,
            position: "relative",
            overflow: "hidden",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="lg:!flex"
        >
          {/* Background glow orbs */}
          <div style={{
            position: "absolute", top: "20%", left: "30%",
            width: 300, height: 300,
            background: "radial-gradient(circle, rgba(108,99,255,0.18) 0%, transparent 70%)",
            borderRadius: "50%", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "25%", right: "20%",
            width: 200, height: 200,
            background: "radial-gradient(circle, rgba(255,111,145,0.12) 0%, transparent 70%)",
            borderRadius: "50%", pointerEvents: "none",
          }} />

          {/* Floating platform logos */}
          <FloatingBubble animClass="float-a pulse-glow" style={{ top: "18%", left: "12%" }}>
            <YouTubeLogo size={42} />
          </FloatingBubble>

          <FloatingBubble animClass="float-b" style={{ top: "14%", right: "16%" }}>
            <InstagramLogo size={42} />
          </FloatingBubble>

          <FloatingBubble animClass="float-c" style={{ bottom: "22%", left: "10%" }}>
            <FacebookLogo size={42} />
          </FloatingBubble>

          <FloatingBubble animClass="float-d pulse-glow" style={{ bottom: "18%", right: "12%" }}>
            <TikTokLogo size={42} />
          </FloatingBubble>

          {/* Small decorative dots */}
          <div style={{
            position: "absolute", top: "40%", left: "6%",
            width: 8, height: 8, borderRadius: "50%",
            background: "rgba(108,99,255,0.5)",
            animation: "floatC 4s ease-in-out infinite 0.2s",
          }} />
          <div style={{
            position: "absolute", top: "62%", right: "8%",
            width: 6, height: 6, borderRadius: "50%",
            background: "rgba(255,111,145,0.5)",
            animation: "floatA 5s ease-in-out infinite 1s",
          }} />
          <div style={{
            position: "absolute", top: "30%", right: "35%",
            width: 5, height: 5, borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            animation: "floatB 6s ease-in-out infinite 0.5s",
          }} />

          {/* Center text */}
          <div style={{ textAlign: "center", padding: "0 48px", position: "relative", zIndex: 1 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 64, height: 64, borderRadius: 20,
              background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})`,
              marginBottom: 28,
              boxShadow: "0 8px 32px rgba(108,99,255,0.4)",
            }}>
              <BarChart2 size={32} color="white" />
            </div>

            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 32, fontWeight: 700,
              color: "white", letterSpacing: "-0.03em",
              lineHeight: 1.15, marginBottom: 16,
            }}>
              Centralize suas<br />métricas sociais
            </h2>

            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16, color: "rgba(224,224,224,0.72)",
              lineHeight: 1.6, maxWidth: 320, margin: "0 auto 28px",
            }}>
              YouTube, Instagram, Facebook e TikTok em um só painel inteligente.
            </p>

            {/* Platform stat pills */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { label: "YouTube", color: "#FF4444" },
                { label: "Instagram", color: "#E1306C" },
                { label: "Facebook", color: "#1877F2" },
                { label: "TikTok", color: "#25F4EE" },
              ].map(({ label, color }) => (
                <span key={label} style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: `1px solid ${color}40`,
                  color, fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel: minimal form ─────────────────── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: "#F0F2F5",
        }}>

          {/* Mobile logo (only on small screens) */}
          <div className="lg:hidden" style={{ marginBottom: 32, textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 52, height: 52, borderRadius: 16,
              background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})`,
              marginBottom: 12,
              boxShadow: "0 6px 20px rgba(108,99,255,0.35)",
            }}>
              <BarChart2 size={26} color="white" />
            </div>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22, fontWeight: 700, color: PETROLEUM,
              letterSpacing: "-0.02em",
            }}>
              <span style={{ color: PURPLE }}>Meta</span>Collector
            </p>
          </div>

          {/* Mobile floating icons row */}
          <div
            className="lg:hidden"
            style={{
              display: "flex", gap: 16, marginBottom: 32,
              justifyContent: "center",
            }}
          >
            {[YouTubeLogo, InstagramLogo, FacebookLogo, TikTokLogo].map((Logo, i) => (
              <div key={i} style={{
                padding: 10, borderRadius: 12,
                background: "rgba(30,42,56,0.08)",
                border: "1px solid rgba(30,42,56,0.10)",
                animation: `floatA ${5 + i}s ease-in-out infinite ${i * 0.4}s`,
              }}>
                <Logo size={28} />
              </div>
            ))}
          </div>

          {/* Form card */}
          <div
            className="fade-slide"
            style={{
              width: "100%", maxWidth: 400,
              background: "white",
              borderRadius: 20,
              padding: "36px 32px",
              boxShadow: "0 4px 24px rgba(30,42,56,0.10), 0 1px 4px rgba(30,42,56,0.06)",
            }}
          >
            {/* Heading */}
            <div className="fade-slide-1" style={{ marginBottom: 28 }}>
              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 26, fontWeight: 700,
                color: PETROLEUM, letterSpacing: "-0.03em",
                marginBottom: 6,
              }}>
                {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
              </h1>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14, color: "#6B7280", lineHeight: 1.5,
              }}>
                {mode === "login"
                  ? "Entre para acessar seu painel"
                  : "Centralize suas redes sociais"}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="fade-slide-2" style={{
              display: "flex", gap: 4, padding: 4,
              background: "#F3F4F6", borderRadius: 12,
              marginBottom: 24,
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
              <div className="fade-slide-3" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>

                {mode === "register" && (
                  <div>
                    <label style={{
                      display: "block", marginBottom: 6,
                      fontSize: 13, fontWeight: 500,
                      color: "#374151", fontFamily: "'Inter', sans-serif",
                    }}>
                      Nome completo
                    </label>
                    <div style={{ position: "relative" }}>
                      <User
                        size={15}
                        style={{
                          position: "absolute", left: 13,
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
                    display: "block", marginBottom: 6,
                    fontSize: 13, fontWeight: 500,
                    color: "#374151", fontFamily: "'Inter', sans-serif",
                  }}>
                    E-mail
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail
                      size={15}
                      style={{
                        position: "absolute", left: 13,
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
                    display: "block", marginBottom: 6,
                    fontSize: 13, fontWeight: 500,
                    color: "#374151", fontFamily: "'Inter', sans-serif",
                  }}>
                    Senha
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={15}
                      style={{
                        position: "absolute", left: 13,
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
                      style={{ paddingRight: 40 }}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha((v) => !v)}
                      style={{
                        position: "absolute", right: 12,
                        top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none",
                        color: "#9CA3AF", cursor: "pointer",
                        padding: 2, display: "flex",
                      }}
                    >
                      {showSenha
                        ? <EyeOff size={16} />
                        : <Eye size={16} />
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  marginBottom: 16, padding: "10px 14px",
                  background: "#FEF2F2", borderRadius: 10,
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
                    ? <Loader2 size={18} className="animate-spin" />
                    : <>
                        {mode === "login" ? "Entrar" : "Criar conta"}
                        <ArrowRight size={16} />
                      </>
                  }
                </button>
              </div>
            </form>

            {/* Switch mode */}
            <p style={{
              marginTop: 20, textAlign: "center",
              fontSize: 13, color: "#6B7280",
              fontFamily: "'Inter', sans-serif",
            }}>
              {mode === "login" ? "Ainda não tem conta? " : "Já tem uma conta? "}
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                style={{
                  background: "none", border: "none",
                  color: PURPLE, fontWeight: 600,
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
            marginTop: 20, fontSize: 12,
            color: "#9CA3AF", textAlign: "center",
            fontFamily: "'Inter', sans-serif",
          }}>
            Protegido com criptografia AES-256-GCM
          </p>
        </div>
      </div>
    </>
  );
}
