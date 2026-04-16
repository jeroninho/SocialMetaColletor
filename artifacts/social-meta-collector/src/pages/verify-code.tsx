import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Mail, Loader2, BarChart2, RefreshCw, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";

const PETROLEUM = "#1E2A38";
const PURPLE = "#6C63FF";
const ROSE = "#FF6F91";
const CODE_LENGTH = 6;
const EXPIRY_SECONDS = 600;

function getApiBase() {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api`;
}

export default function VerifyCodePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { refetch } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const emailParam = params.get("email") ?? "";
  const typeParam = (params.get("type") ?? "register") as "register" | "login";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    if (value.length > 1) {
      const chars = value.slice(0, CODE_LENGTH).split("");
      chars.forEach((ch, i) => {
        if (index + i < CODE_LENGTH) newDigits[index + i] = ch;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(index + chars.length, CODE_LENGTH - 1);
      inputRefs.current[nextIdx]?.focus();
      return;
    }
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = useCallback(async (codeStr?: string) => {
    const code = codeStr ?? digits.join("");
    if (code.length !== CODE_LENGTH) {
      setError("Digite o código completo de 6 dígitos.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, code, type: typeParam }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Código inválido ou expirado.");
        return;
      }
      setSuccess(true);
      if (data.token) {
        localStorage.setItem("smc_token", data.token);
        await refetch();
      }
      toast({
        title: "Verificação concluída!",
        description: typeParam === "register" ? "Sua conta foi ativada com sucesso." : "Login realizado com sucesso.",
      });
      setTimeout(() => navigate("/dashboard"), 800);
    } catch {
      setError("Erro de conexão. Verifique sua rede.");
    } finally {
      setLoading(false);
    }
  }, [digits, emailParam, typeParam, navigate, refetch, toast]);

  useEffect(() => {
    const code = digits.join("");
    if (code.length === CODE_LENGTH && !loading && !success) {
      handleSubmit(code);
    }
  }, [digits, loading, success, handleSubmit]);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, type: typeParam }),
      });
      const data = await res.json();
      if (res.ok) {
        setSecondsLeft(EXPIRY_SECONDS);
        setDigits(Array(CODE_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        toast({ title: "Código reenviado", description: data.message ?? "Verifique seu e-mail." });
      } else {
        setError(data.message ?? "Erro ao reenviar código.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-slide { animation: fadeSlideUp 0.5s ease-out both; }
        .fade-slide-1 { animation: fadeSlideUp 0.5s ease-out 0.05s both; }
        .fade-slide-2 { animation: fadeSlideUp 0.5s ease-out 0.1s both; }
        .fade-slide-3 { animation: fadeSlideUp 0.5s ease-out 0.15s both; }
        .code-input {
          width: 48px;
          height: 56px;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          font-family: 'Space Grotesk', monospace;
          border-radius: var(--radius);
          border: 1.5px solid rgba(0,0,0,0.10);
          background: #F8FAFC;
          color: #111;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .code-input:focus {
          border-color: #6C63FF;
          box-shadow: 0 0 0 3px rgba(108,99,255,0.14);
          background: #fff;
        }
        .code-input.filled {
          border-color: #6C63FF;
          background: #F0EEFF;
        }
        .verify-btn {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius);
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
        .verify-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(108,99,255,0.45);
        }
        .verify-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .resend-btn {
          background: none;
          border: none;
          color: #6C63FF;
          font-weight: 600;
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100dvh", background: "#FFFFFF", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div className="fade-slide" style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: "var(--radius-xl)", padding: "40px 32px", boxShadow: "var(--shadow-md)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "var(--radius-xl)", background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})`, marginBottom: 16, boxShadow: "var(--shadow-md)" }}>
              {success ? <CheckCircle2 size={28} color="white" /> : <Mail size={28} color="white" />}
            </div>
            <h1 className="fade-slide-1" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: PETROLEUM, letterSpacing: "-0.03em", marginBottom: 8 }}>
              {success ? "Verificado!" : "Verificar e-mail"}
            </h1>
            <p className="fade-slide-2" style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#6B7280", lineHeight: 1.5 }}>
              {success
                ? "Redirecionando para o dashboard..."
                : <>Enviamos um código de 6 dígitos para<br /><strong style={{ color: PETROLEUM }}>{emailParam}</strong></>
              }
            </p>
          </div>

          {!success && (
            <>
              <div className="fade-slide-2" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    className={`code-input${d ? " filled" : ""}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={CODE_LENGTH}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
                      if (pasted.length > 0) {
                        e.preventDefault();
                        const newDigits = [...digits];
                        pasted.split("").forEach((ch, idx) => {
                          if (idx < CODE_LENGTH) newDigits[idx] = ch;
                        });
                        setDigits(newDigits);
                        inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
                      }
                    }}
                    disabled={loading}
                  />
                ))}
              </div>

              {secondsLeft > 0 && (
                <div className="fade-slide-2" style={{ textAlign: "center", marginBottom: 16, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#6B7280" }}>
                  Código expira em <strong style={{ color: secondsLeft <= 60 ? "#EF4444" : PURPLE }}>{formatTime(secondsLeft)}</strong>
                </div>
              )}

              {secondsLeft <= 0 && (
                <div style={{ textAlign: "center", marginBottom: 16, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#EF4444" }}>
                  Código expirado.
                </div>
              )}

              {error && (
                <div style={{ marginBottom: 16, padding: "10px 14px", background: "#FEF2F2", borderRadius: 10, border: "1px solid #FECACA", color: "#B91C1C", fontSize: 13, fontFamily: "'Inter', sans-serif", textAlign: "center" }}>
                  {error}
                </div>
              )}

              <div className="fade-slide-3" style={{ marginBottom: 20 }}>
                <button
                  className="verify-btn"
                  onClick={() => handleSubmit()}
                  disabled={loading || digits.join("").length !== CODE_LENGTH}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Verificar"}
                </button>
              </div>

              <div style={{ textAlign: "center" }}>
                <button className="resend-btn" onClick={handleResend} disabled={resending}>
                  {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Reenviar código
                </button>
              </div>

              <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#6B7280", fontFamily: "'Inter', sans-serif" }}>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  style={{ background: "none", border: "none", color: PURPLE, fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "'Inter', sans-serif", textDecoration: "underline", textUnderlineOffset: 2 }}
                >
                  Voltar ao login
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
