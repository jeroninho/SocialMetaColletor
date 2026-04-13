import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  BarChart2,
  LayoutDashboard,
  Zap,
  GitMerge,
  Menu,
  X,
  Sun,
  Moon,
  ArrowRight,
  TrendingUp,
  ChevronRight,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import { useTheme } from "@/context/theme";

/* ─── Design tokens ──────────────────────────────────────── */
const PETROLEUM = "#1E2A38";
const BLUE      = "#4F6BF4";
const SUCCESS   = "#4CAF50";

/* ─── Scroll reveal hook ─────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.10 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── Chart data ─────────────────────────────────────────── */
const heroBarData = [
  { name: "Jan", YT: 48, IG: 32, FB: 21 },
  { name: "Fev", YT: 55, IG: 38, FB: 28 },
  { name: "Mar", YT: 62, IG: 45, FB: 31 },
  { name: "Abr", YT: 70, IG: 52, FB: 36 },
  { name: "Mai", YT: 81, IG: 61, FB: 43 },
  { name: "Jun", YT: 95, IG: 74, FB: 55 },
];

const demoLineData = [
  { mes: "Set", engaj: 28000 },
  { mes: "Out", engaj: 34500 },
  { mes: "Nov", engaj: 38200 },
  { mes: "Dez", engaj: 44100 },
  { mes: "Jan", engaj: 57400 },
  { mes: "Fev", engaj: 72300 },
  { mes: "Mar", engaj: 89600 },
];

/* ─── Problem cards ──────────────────────────────────────── */
const problems = [
  {
    icon: GitMerge,
    title: "Fragmentação de dados",
    desc: "Centralize suas métricas de YouTube, Instagram e Facebook em um único painel intuitivo.",
  },
  {
    icon: LayoutDashboard,
    title: "Comparação difícil",
    desc: "Compare engajamento cross-platform com clareza. Veja quem performa melhor e por quê.",
  },
  {
    icon: Zap,
    title: "Automação limitada",
    desc: "Automatize coleta e relatórios sem esforço. Seu tempo é melhor gasto em estratégia.",
  },
];

/* ─── Client logos (fictitious) ─────────────────────────── */
const clients = ["Nexio", "Brandify", "Cortex", "Lumora"];

/* ─── Navbar ─────────────────────────────────────────────── */
function Navbar({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navBg = scrolled
    ? dark
      ? "rgba(18,26,38,0.97)"
      : "rgba(255,255,255,0.97)"
    : "transparent";

  const linkColor = scrolled
    ? (dark ? "rgba(255,255,255,0.72)" : "rgba(30,42,56,0.70)")
    : "rgba(255,255,255,0.72)";
  const logoTextColor = scrolled
    ? (dark ? "white" : PETROLEUM)
    : "white";

  return (
    <>
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: navBg,
          borderBottom: scrolled
            ? `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(30,42,56,0.09)"}`
            : "none",
          transition: "background 0.25s, border-color 0.25s",
          padding: "0 clamp(20px, 5vw, 80px)",
          height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/">
          <span style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", textDecoration: "none" }}>
            <span style={{
              width: 32, height: 32, borderRadius: 6,
              background: BLUE,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <BarChart2 size={16} color="white" />
            </span>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 17, fontWeight: 700,
              letterSpacing: "-0.025em",
              color: logoTextColor,
            }}>
              MetaCollector
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="landing-desktop-nav">
          {["Soluções", "Clientes", "Contato"].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14, color: linkColor,
              textDecoration: "none", fontWeight: 500,
              transition: "color 0.15s",
            }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = BLUE; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = linkColor; }}
            >
              {l}
            </a>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: 34, height: 34, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: dark ? "rgba(255,255,255,0.08)" : "rgba(30,42,56,0.07)",
              border: "none", cursor: "pointer",
              transition: "background 0.15s",
            }}
            title={dark ? "Modo claro" : "Modo escuro"}
          >
            {dark
              ? <Sun size={15} style={{ color: "#FBBF24" }} />
              : <Moon size={15} style={{ color: PETROLEUM }} />
            }
          </button>

          {/* CTA */}
          <Link href="/login">
            <span className="landing-cta-btn" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 6,
              background: BLUE,
              color: "white",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14, fontWeight: 600,
              textDecoration: "none", cursor: "pointer",
              transition: "background 0.15s",
            }}>
              Começar agora
            </span>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="landing-hamburger"
            style={{
              display: "none", width: 34, height: 34, borderRadius: 6,
              alignItems: "center", justifyContent: "center",
              background: dark ? "rgba(255,255,255,0.08)" : "rgba(30,42,56,0.07)",
              border: "none", cursor: "pointer",
            }}
          >
            {open
              ? <X size={16} style={{ color: dark ? "white" : PETROLEUM }} />
              : <Menu size={16} style={{ color: dark ? "white" : PETROLEUM }} />
            }
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: "fixed", top: 60, left: 0, right: 0, zIndex: 99,
          background: dark ? PETROLEUM : "white",
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
          padding: "16px clamp(20px, 5vw, 40px)",
          display: "flex", flexDirection: "column", gap: 2,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}>
          {["Soluções", "Clientes", "Contato"].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`}
              onClick={() => setOpen(false)}
              style={{
                padding: "11px 0",
                fontFamily: "'Inter', sans-serif",
                fontSize: 15, fontWeight: 500,
                color: dark ? "rgba(255,255,255,0.82)" : PETROLEUM,
                textDecoration: "none",
                borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              }}
            >
              {l}
            </a>
          ))}
          <Link href="/login">
            <span onClick={() => setOpen(false)} style={{
              display: "block", marginTop: 12,
              padding: "11px", borderRadius: 6, textAlign: "center",
              background: BLUE,
              color: "white",
              fontFamily: "'Inter', sans-serif",
              fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}>
              Começar agora
            </span>
          </Link>
        </div>
      )}
    </>
  );
}

/* ─── Hero chart (mini, decorative) ─────────────────────── */
function HeroChart({ dark }: { dark: boolean }) {
  return (
    <div style={{
      background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.10)",
      borderRadius: 8,
      border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.20)"}`,
      padding: "20px 18px 14px",
      boxShadow: "0 16px 48px rgba(0,0,0,0.20)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13, fontWeight: 600,
            color: "white", marginBottom: 2,
          }}>
            Crescimento de Seguidores
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
            Últimos 6 meses · Todas as plataformas
          </p>
        </div>
        <span style={{
          display: "flex", alignItems: "center", gap: 4, padding: "3px 9px",
          borderRadius: 4, background: "rgba(76,175,80,0.16)",
          color: SUCCESS, fontSize: 11, fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}>
          <TrendingUp size={10} /> +97.9%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={heroBarData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.40)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.40)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(18,26,38,0.95)", border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 6, fontSize: 12, color: "white",
            }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="YT" fill="#FF4444" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="IG" fill="#E1306C" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="FB" fill="#1877F2" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", gap: 14, marginTop: 8, justifyContent: "center" }}>
        {[{ label: "YouTube", color: "#FF4444" }, { label: "Instagram", color: "#E1306C" }, { label: "Facebook", color: "#1877F2" }].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: color, display: "inline-block" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.48)", fontFamily: "'Inter', sans-serif" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Landing page ───────────────────────────────────────── */
export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  useScrollReveal();

  const bg        = dark ? "#0D1520" : "#F2F4F7";
  const text      = dark ? "#E8EAF0" : PETROLEUM;
  const textMuted = dark ? "rgba(232,234,240,0.55)" : "rgba(30,42,56,0.55)";
  const cardBg    = dark ? "#151E2C" : "white";
  const cardBorder = dark ? "rgba(255,255,255,0.08)" : "rgba(30,42,56,0.10)";

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [data-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .problem-card:hover {
          background: ${dark ? "rgba(255,255,255,0.04)" : "rgba(30,42,56,0.03)"} !important;
        }
        .landing-cta-btn:hover {
          background: #3D59E8 !important;
        }
        .landing-cta-secondary:hover {
          background: rgba(79,107,244,0.10) !important;
          border-color: ${BLUE} !important;
          color: ${BLUE} !important;
        }
        @media (max-width: 900px) {
          .landing-desktop-nav { display: none !important; }
          .landing-hamburger { display: flex !important; }
          .hero-grid { flex-direction: column !important; }
          .hero-chart-col { display: none !important; }
          .problems-grid { grid-template-columns: 1fr !important; }
          .demo-grid { flex-direction: column !important; }
          .clients-row { gap: 16px !important; }
        }
      `}</style>

      <div style={{ background: bg, color: text, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
        <Navbar dark={dark} toggleTheme={toggleTheme} />

        {/* ── 1. HERO ──────────────────────────────────────── */}
        <section
          id="hero"
          style={{
            minHeight: "100vh",
            background: `linear-gradient(160deg, ${PETROLEUM} 0%, #1A2840 55%, #121A28 100%)`,
            display: "flex", alignItems: "center",
            padding: "100px clamp(20px, 6vw, 100px) 72px",
          }}
        >
          <div className="hero-grid" style={{
            display: "flex", alignItems: "center",
            gap: 56, width: "100%", maxWidth: 1240, margin: "0 auto",
          }}>
            {/* Left text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "5px 12px", borderRadius: 4,
                background: "rgba(79,107,244,0.14)",
                border: "1px solid rgba(79,107,244,0.24)",
                marginBottom: 24,
                animation: "fadeSlideUp 0.5s ease both",
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: BLUE, display: "inline-block" }} />
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
                  color: "rgba(255,255,255,0.80)",
                }}>
                  Analytics unificado
                </span>
              </div>

              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(32px, 5vw, 58px)",
                fontWeight: 700, color: "white",
                letterSpacing: "-0.035em", lineHeight: 1.15,
                marginBottom: 20,
                animation: "fadeSlideUp 0.55s ease 0.05s both",
              }}>
                Unifique suas métricas<br />
                <span style={{ color: BLUE }}>sociais</span> em um só lugar.
              </h1>

              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "clamp(15px, 1.8vw, 17px)",
                color: "rgba(232,234,240,0.65)", lineHeight: 1.7,
                maxWidth: 480, marginBottom: 36,
                animation: "fadeSlideUp 0.55s ease 0.10s both",
              }}>
                YouTube, Instagram e Facebook com insights reais e automação segura. Sem planilhas, sem esforço manual.
              </p>

              <div style={{
                display: "flex", flexWrap: "wrap", gap: 10,
                animation: "fadeSlideUp 0.55s ease 0.15s both",
              }}>
                <Link href="/login">
                  <span className="landing-cta-btn" style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "12px 24px", borderRadius: 6,
                    background: BLUE,
                    color: "white",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 15, fontWeight: 600, cursor: "pointer",
                    transition: "background 0.15s",
                    textDecoration: "none",
                  }}>
                    Solicitar demonstração <ArrowRight size={15} />
                  </span>
                </Link>
                <a href="#demo" className="landing-cta-secondary" style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "12px 24px", borderRadius: 6,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.16)",
                  color: "rgba(255,255,255,0.82)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15, fontWeight: 500, cursor: "pointer",
                  transition: "all 0.15s", textDecoration: "none",
                }}>
                  Ver como funciona
                </a>
              </div>

              {/* Stats row */}
              <div style={{
                display: "flex", gap: 36, marginTop: 48, flexWrap: "wrap",
                animation: "fadeSlideUp 0.55s ease 0.20s both",
                paddingTop: 40,
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}>
                {[
                  { value: "3+", label: "Plataformas conectadas" },
                  { value: "98%", label: "Uptime garantido" },
                  { value: "AES-256", label: "Criptografia" },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 22, fontWeight: 700, color: "white",
                      letterSpacing: "-0.02em", marginBottom: 2,
                    }}>
                      {value}
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.42)" }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right chart */}
            <div className="hero-chart-col" style={{ flex: "0 0 420px" }}>
              <HeroChart dark={dark} />
            </div>
          </div>
        </section>

        {/* ── 2. PROBLEM CARDS ─────────────────────────────── */}
        <section id="soluções" style={{ padding: "80px clamp(20px, 6vw, 100px)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div data-reveal style={{ marginBottom: 48 }}>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                color: BLUE, textTransform: "uppercase", letterSpacing: "0.10em",
                marginBottom: 10,
              }}>
                Problemas que resolvemos
              </p>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 700,
                color: text, letterSpacing: "-0.03em",
                marginBottom: 12, maxWidth: 520,
              }}>
                Chega de análise fragmentada
              </h2>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 16,
                color: textMuted, maxWidth: 480,
                lineHeight: 1.65,
              }}>
                Três dores que todo gestor de social media conhece — e que o MetaCollector resolve.
              </p>
            </div>

            <div className="problems-grid" data-reveal style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20,
            }}>
              {problems.map(({ icon: Icon, title, desc }, i) => (
                <div
                  key={title}
                  className="problem-card"
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 8, padding: "28px 24px",
                    cursor: "default",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 6,
                    background: dark ? "rgba(79,107,244,0.12)" : "rgba(79,107,244,0.09)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 18,
                  }}>
                    <Icon size={20} style={{ color: BLUE }} />
                  </div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 18, fontWeight: 700, color: text,
                    letterSpacing: "-0.02em", marginBottom: 8,
                    lineHeight: 1.3,
                  }}>
                    {title}
                  </h3>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14, color: textMuted, lineHeight: 1.65,
                    marginBottom: 20,
                  }}>
                    {desc}
                  </p>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    color: BLUE, fontFamily: "'Inter', sans-serif",
                    fontSize: 13, fontWeight: 500,
                  }}>
                    Saiba mais <ChevronRight size={13} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. DEMO SECTION ──────────────────────────────── */}
        <section id="demo" style={{
          padding: "80px clamp(20px, 6vw, 100px)",
          background: dark ? "rgba(255,255,255,0.02)" : "rgba(30,42,56,0.03)",
          borderTop: `1px solid ${cardBorder}`,
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div className="demo-grid" style={{ display: "flex", alignItems: "center", gap: 56 }}>

              {/* Chart */}
              <div data-reveal style={{ flex: "1 1 420px", minWidth: 0 }}>
                <div style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8, padding: "24px 20px",
                  boxShadow: dark
                    ? "0 4px 24px rgba(0,0,0,0.25)"
                    : "0 4px 20px rgba(30,42,56,0.07)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <h3 style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 14, fontWeight: 700, color: text,
                      letterSpacing: "-0.01em",
                    }}>
                      Tendência de Engajamento
                    </h3>
                    <span style={{
                      padding: "3px 9px", borderRadius: 4,
                      background: "rgba(76,175,80,0.12)", color: SUCCESS,
                      fontSize: 11, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      +219.6%
                    </span>
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: textMuted, marginBottom: 18 }}>
                    Últimos 7 meses · Dados simulados
                  </p>
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={demoLineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="engajGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BLUE} stopOpacity={0.20} />
                          <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(30,42,56,0.07)"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 11, fill: dark ? "rgba(255,255,255,0.36)" : "rgba(30,42,56,0.42)" }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: dark ? "rgba(255,255,255,0.36)" : "rgba(30,42,56,0.42)" }}
                        axisLine={false} tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                      />
                      <Tooltip
                        contentStyle={{
                          background: dark ? "rgba(18,26,38,0.97)" : "white",
                          border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(30,42,56,0.10)"}`,
                          borderRadius: 6, fontSize: 12,
                          color: dark ? "white" : PETROLEUM,
                          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                        }}
                        formatter={(v: number) => [`${(v / 1000).toFixed(1)}K`, "Engajamento"]}
                      />
                      <Area
                        type="monotone" dataKey="engaj"
                        stroke={BLUE} strokeWidth={2.5}
                        fill="url(#engajGrad)"
                        dot={{ r: 4, fill: BLUE, strokeWidth: 2, stroke: cardBg }}
                        activeDot={{ r: 6, fill: BLUE }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Text */}
              <div data-reveal style={{ flex: "1 1 340px", minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                  color: BLUE, textTransform: "uppercase", letterSpacing: "0.10em",
                  marginBottom: 14,
                }}>
                  Demonstração ao vivo
                </p>
                <h2 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 700,
                  color: text, letterSpacing: "-0.03em", lineHeight: 1.25,
                  marginBottom: 16,
                }}>
                  Insights claros e acionáveis em segundos.
                </h2>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15, color: textMuted, lineHeight: 1.65,
                  marginBottom: 28,
                }}>
                  Visualize tendências de engajamento, compare plataformas e identifique oportunidades de crescimento — tudo em tempo real.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {[
                    "Gráficos interativos atualizados automaticamente",
                    "Comparação side-by-side entre plataformas",
                    "Exportação de relatórios com um clique",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: "rgba(76,175,80,0.14)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                      }}>
                        <Check size={10} style={{ color: SUCCESS }} />
                      </span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: textMuted, lineHeight: 1.5 }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <Link href="/login">
                  <span className="landing-cta-secondary" style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "11px 22px", borderRadius: 6,
                    background: "transparent",
                    border: `1px solid ${BLUE}`,
                    color: BLUE,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s", textDecoration: "none",
                  }}>
                    Ver exemplo de relatório <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. CLIENT LOGOS ──────────────────────────────── */}
        <section id="clientes" style={{ padding: "64px clamp(20px, 6vw, 100px)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div data-reveal style={{ textAlign: "center", marginBottom: 40 }}>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13,
                color: textMuted, letterSpacing: "0.01em",
              }}>
                Empresas que já simplificaram suas análises sociais.
              </p>
            </div>
            <div data-reveal className="clients-row" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 40, flexWrap: "wrap",
            }}>
              {clients.map((name) => (
                <div key={name} style={{
                  padding: "12px 28px", borderRadius: 6,
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(30,42,56,0.04)",
                  border: `1px solid ${cardBorder}`,
                  transition: "all 0.15s",
                }}>
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 18, fontWeight: 700,
                    color: dark ? "rgba(255,255,255,0.30)" : "rgba(30,42,56,0.25)",
                    letterSpacing: "-0.02em",
                  }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. FINAL CTA ─────────────────────────────────── */}
        <section id="contato" style={{
          padding: "88px clamp(20px, 6vw, 100px)",
          background: `linear-gradient(160deg, ${PETROLEUM} 0%, #1A2840 60%, #0F1824 100%)`,
          borderTop: `1px solid rgba(255,255,255,0.06)`,
        }}>
          <div data-reveal style={{ textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
              color: "rgba(79,107,244,0.90)", textTransform: "uppercase",
              letterSpacing: "0.10em", marginBottom: 16,
            }}>
              Comece agora
            </p>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(26px, 4.5vw, 46px)", fontWeight: 700,
              color: "white", letterSpacing: "-0.035em", lineHeight: 1.2,
              marginBottom: 16,
            }}>
              Pronto para simplificar sua análise social?
            </h2>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16, color: "rgba(232,234,240,0.60)",
              lineHeight: 1.65, marginBottom: 36,
            }}>
              Conecte suas contas em minutos e comece a ver insights que realmente importam.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login">
                <span className="landing-cta-btn" style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "13px 28px", borderRadius: 6,
                  background: BLUE,
                  color: "white",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                  transition: "background 0.15s", textDecoration: "none",
                }}>
                  Conectar minhas contas <ArrowRight size={15} />
                </span>
              </Link>
            </div>
            <p style={{
              marginTop: 20, fontFamily: "'Inter', sans-serif",
              fontSize: 12, color: "rgba(255,255,255,0.28)",
            }}>
              Gratuito para começar · Sem cartão de crédito
            </p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer style={{
          padding: "28px clamp(20px, 6vw, 100px)",
          borderTop: `1px solid ${cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14, fontWeight: 700, color: textMuted,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 4,
              background: BLUE,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BarChart2 size={12} color="white" />
            </span>
            MetaCollector
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: textMuted }}>
            © 2026 · Todos os direitos reservados
          </span>
          <Link href="/login">
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: BLUE, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Acessar painel
            </span>
          </Link>
        </footer>
      </div>
    </>
  );
}
