import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  BarChart2,
  LayoutDashboard,
  Zap,
  GitMerge,
  Shield,
  Menu,
  X,
  Sun,
  Moon,
  ArrowRight,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { useTheme } from "@/context/theme";

/* ─── Design tokens ──────────────────────────────────────── */
const PETROLEUM  = "#1E2A38";
const PURPLE     = "#6C63FF";
const ROSE       = "#FF6F91";
const SUCCESS    = "#4CAF50";

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
      { threshold: 0.12 }
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
    color: PURPLE,
  },
  {
    icon: LayoutDashboard,
    title: "Comparação difícil",
    desc: "Compare engajamento cross-platform com clareza. Veja quem performa melhor e por quê.",
    color: ROSE,
  },
  {
    icon: Zap,
    title: "Automação limitada",
    desc: "Automatize coleta e relatórios sem esforço. Seu tempo é melhor gasto em estratégia.",
    color: SUCCESS,
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
      ? "rgba(30,42,56,0.97)"
      : "rgba(255,255,255,0.97)"
    : "transparent";

  /* Navbar is always over the dark hero section when transparent,
     so force white text until the user scrolls and the solid bg appears */
  const linkColor = scrolled
    ? (dark ? "rgba(255,255,255,0.80)" : "rgba(30,42,56,0.78)")
    : "rgba(255,255,255,0.80)";
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
            ? `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(30,42,56,0.08)"}`
            : "none",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
          padding: "0 clamp(20px, 5vw, 80px)",
          height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/">
          <span style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textDecoration: "none" }}>
            <span style={{
              width: 36, height: 36, borderRadius: "var(--radius)",
              background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-sm)",
              flexShrink: 0,
            }}>
              <BarChart2 size={18} color="white" />
            </span>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18, fontWeight: 700,
              letterSpacing: "-0.025em",
              color: logoTextColor,
            }}>
              <span style={{ color: PURPLE }}>Meta</span>Collector
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }} className="landing-desktop-nav">
          {["Soluções", "Clientes", "Contato"].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15, color: linkColor,
              textDecoration: "none", fontWeight: 500,
              transition: "color 0.2s",
            }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = PURPLE; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = linkColor; }}
            >
              {l}
            </a>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: dark ? "rgba(255,255,255,0.10)" : "rgba(30,42,56,0.08)",
              border: "none", cursor: "pointer",
              transition: "background 0.2s",
            }}
            title={dark ? "Modo claro" : "Modo escuro"}
          >
            {dark
              ? <Sun size={16} style={{ color: "#FBBF24" }} />
              : <Moon size={16} style={{ color: PETROLEUM }} />
            }
          </button>

          {/* CTA */}
          <Link href="/login">
            <span className="landing-cta-btn" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 20px", borderRadius: 999,
              background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE})`,
              color: "white",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: 600,
              textDecoration: "none", cursor: "pointer",
              boxShadow: "0 4px 14px rgba(108,99,255,0.35)",
              transition: "background 0.25s, box-shadow 0.2s, transform 0.15s",
            }}>
              Começar agora <ChevronRight size={14} />
            </span>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="landing-hamburger"
            style={{
              display: "none", width: 36, height: 36, borderRadius: 8,
              alignItems: "center", justifyContent: "center",
              background: dark ? "rgba(255,255,255,0.10)" : "rgba(30,42,56,0.08)",
              border: "none", cursor: "pointer",
            }}
          >
            {open
              ? <X size={18} style={{ color: dark ? "white" : PETROLEUM }} />
              : <Menu size={18} style={{ color: dark ? "white" : PETROLEUM }} />
            }
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: "fixed", top: 68, left: 0, right: 0, zIndex: 99,
          background: dark ? PETROLEUM : "white",
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          padding: "20px clamp(20px, 5vw, 40px)",
          display: "flex", flexDirection: "column", gap: 4,
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
        }}>
          {["Soluções", "Clientes", "Contato"].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`}
              onClick={() => setOpen(false)}
              style={{
                padding: "12px 0",
                fontFamily: "'Inter', sans-serif",
                fontSize: 16, fontWeight: 500,
                color: dark ? "rgba(255,255,255,0.85)" : PETROLEUM,
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
              padding: "12px", borderRadius: 10, textAlign: "center",
              background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})`,
              color: "white",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 15, fontWeight: 600,
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
      background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.12)",
      borderRadius: "var(--radius-xl)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.25)"}`,
      backdropFilter: "blur(12px)",
      padding: "24px 20px 16px",
      boxShadow: "var(--shadow-lg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14, fontWeight: 600,
            color: "white", marginBottom: 2,
          }}>
            Crescimento de Seguidores
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            Últimos 6 meses · Todas as plataformas
          </p>
        </div>
        <span style={{
          display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
          borderRadius: 999, background: "rgba(76,175,80,0.18)",
          color: SUCCESS, fontSize: 12, fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}>
          <TrendingUp size={11} /> +97.9%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={heroBarData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(30,42,56,0.95)", border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10, fontSize: 12, color: "white",
              backdropFilter: "blur(8px)",
            }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="YT" fill="#FF4444" radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="IG" fill="#E1306C" radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="FB" fill="#1877F2" radius={[4, 4, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
        {[{ label: "YouTube", color: "#FF4444" }, { label: "Instagram", color: "#E1306C" }, { label: "Facebook", color: "#1877F2" }].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Showcase images ────────────────────────────────────── */
const showcaseImages = [
  { src: "screenshots/dashboard.png", label: "Dashboard", desc: "Visão geral unificada" },
  { src: "screenshots/reports.png", label: "Relatórios", desc: "Análises detalhadas" },
  { src: "screenshots/tutorials.png", label: "Tutoriais", desc: "Aprenda passo a passo" },
  { src: "screenshots/connections.png", label: "Conexões", desc: "Integre suas contas" },
];

/* ─── Image showcase component ───────────────────────────── */
function ImageShowcase({
  dark,
  text,
  textMuted,
  cardBg,
  cardBorder,
}: {
  dark: boolean;
  text: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
}) {
  const [active, setActive] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const base = import.meta.env.BASE_URL;
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const clearTimers = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const startAutoplay = () => {
    clearTimers();
    if (prefersReducedMotion.current || paused) return;
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setIsTransitioning(true);
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setActive((prev) => (prev + 1) % showcaseImages.length);
        setIsTransitioning(false);
      }, 300);
    }, 4000);
  };

  useEffect(() => {
    mountedRef.current = true;
    startAutoplay();
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [paused]);

  const goTo = (idx: number) => {
    if (idx === active) return;
    clearTimers();
    setIsTransitioning(true);
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setActive(idx);
      setIsTransitioning(false);
      startAutoplay();
    }, 300);
  };

  return (
    <section
      aria-label="Showcase da plataforma"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        padding: "100px clamp(20px, 6vw, 100px) 80px",
        background: dark ? "#0F1923" : "#FAFBFC",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 500,
          background: `radial-gradient(ellipse, ${dark ? "rgba(108,99,255,0.08)" : "rgba(108,99,255,0.05)"} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <div data-reveal style={{ textAlign: "center", marginBottom: 56 }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: PURPLE,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 12,
            }}
          >
            Veja em ação
          </p>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 700,
              color: text,
              letterSpacing: "-0.03em",
              marginBottom: 16,
            }}
          >
            Conheça a{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              plataforma
            </span>
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 17,
              color: textMuted,
              maxWidth: 540,
              margin: "0 auto",
              lineHeight: 1.65,
            }}
          >
            Explore as principais telas do MetaCollector e descubra como simplificamos sua análise social.
          </p>
        </div>

        <div
          data-reveal
          style={{
            display: "flex",
            gap: 32,
            alignItems: "stretch",
          }}
          className="showcase-grid"
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 20,
              overflow: "hidden",
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: dark
                ? "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)"
                : "0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
              position: "relative",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: `1px solid ${cardBorder}`,
                background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57", display: "inline-block" }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28CA42", display: "inline-block" }} />
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: textMuted,
                  fontWeight: 500,
                }}
              >
                {showcaseImages[active].label}
              </span>
            </div>
            <div style={{ position: "relative", overflow: "hidden" }}>
              <img
                src={`${base}${showcaseImages[active].src}`}
                alt={showcaseImages[active].label}
                style={{
                  width: "100%",
                  display: "block",
                  opacity: isTransitioning ? 0 : 1,
                  transform: isTransitioning ? "scale(0.98)" : "scale(1)",
                  transition: "opacity 0.3s ease, transform 0.3s ease",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flexShrink: 0,
              width: 220,
            }}
            className="showcase-thumbs"
          >
            {showcaseImages.map((img, i) => (
              <button
                key={img.label}
                onClick={() => goTo(i)}
                aria-label={`Ver ${img.label}`}
                aria-pressed={i === active}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: 16,
                  borderRadius: 16,
                  border: `1.5px solid ${i === active
                    ? (dark ? "rgba(108,99,255,0.5)" : "rgba(108,99,255,0.4)")
                    : cardBorder}`,
                  background: i === active
                    ? (dark ? "rgba(108,99,255,0.1)" : "rgba(108,99,255,0.05)")
                    : cardBg,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  textAlign: "left",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {i === active && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: 3,
                      height: "100%",
                      background: `linear-gradient(180deg, ${PURPLE}, ${ROSE})`,
                      borderRadius: "0 2px 2px 0",
                    }}
                  />
                )}
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: i === active ? (dark ? "white" : PETROLEUM) : textMuted,
                    transition: "color 0.2s",
                  }}
                >
                  {img.label}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    color: textMuted,
                    lineHeight: 1.4,
                  }}
                >
                  {img.desc}
                </span>
                {i === active && (
                  <div
                    style={{
                      width: "100%",
                      height: 3,
                      borderRadius: 2,
                      background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      marginTop: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: `linear-gradient(90deg, ${PURPLE}, ${ROSE})`,
                        borderRadius: 2,
                        animation: "showcase-progress 4s linear",
                      }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          data-reveal
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 32,
          }}
          className="showcase-dots"
        >
          {showcaseImages.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Ir para ${img.label}`}
              aria-current={i === active ? "true" : undefined}
              style={{
                width: i === active ? 28 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                background: i === active
                  ? `linear-gradient(90deg, ${PURPLE}, ${ROSE})`
                  : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"),
                cursor: "pointer",
                transition: "all 0.3s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Landing page ───────────────────────────────────────── */
export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  useScrollReveal();

  const bg       = dark ? "#0F1923"  : "#FFFFFF";
  const text      = dark ? "#E0E0E0"  : PETROLEUM;
  const textMuted = dark ? "rgba(224,224,224,0.6)" : "rgba(30,42,56,0.55)";
  const cardBg    = dark ? "#1A2535"  : "white";
  const cardBorder = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.10)";

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatHero {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        [data-reveal] {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .problem-card:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.16) !important;
        }
        .landing-cta-btn:hover {
          background: linear-gradient(135deg, ${PURPLE}, ${ROSE}) !important;
          box-shadow: 0 6px 24px rgba(108,99,255,0.45) !important;
          transform: translateY(-1px);
        }
        .landing-cta-secondary:hover {
          background: rgba(108,99,255,0.15) !important;
          border-color: ${PURPLE} !important;
          color: ${PURPLE} !important;
        }
        @keyframes showcase-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @media (max-width: 900px) {
          .landing-desktop-nav { display: none !important; }
          .landing-hamburger { display: flex !important; }
          .hero-grid { flex-direction: column !important; }
          .hero-chart-col { display: none !important; }
          .problems-grid { grid-template-columns: 1fr !important; }
          .demo-grid { flex-direction: column !important; }
          .clients-row { gap: 20px !important; }
          .showcase-grid { flex-direction: column !important; }
          .showcase-thumbs { flex-direction: row !important; width: 100% !important; overflow-x: auto !important; }
          .showcase-thumbs button { min-width: 140px !important; flex: 0 0 auto !important; }
        }
        @media (min-width: 901px) {
          .showcase-dots { display: none !important; }
        }
      `}</style>

      <div style={{ background: bg, color: text, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
        <Navbar dark={dark} toggleTheme={toggleTheme} />

        {/* ── 1. HERO ──────────────────────────────────────── */}
        <section
          id="hero"
          style={{
            minHeight: "100vh",
            background: `linear-gradient(145deg, ${PETROLEUM} 0%, #243447 55%, #1a2535 100%)`,
            display: "flex", alignItems: "center",
            padding: "120px clamp(20px, 6vw, 100px) 80px",
          }}
        >
          <div className="hero-grid" style={{
            display: "flex", alignItems: "center",
            gap: 64, width: "100%", maxWidth: 1280, margin: "0 auto",
          }}>
            {/* Left text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 999,
                background: "rgba(108,99,255,0.18)",
                border: "1px solid rgba(108,99,255,0.28)",
                marginBottom: 28,
                animation: "fadeSlideUp 0.6s ease both",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: PURPLE, display: "inline-block" }} />
                <span style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
                  color: "rgba(255,255,255,0.85)",
                }}>
                  Analytics unificado
                </span>
              </div>

              <h1 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(36px, 5.5vw, 66px)",
                fontWeight: 700, color: "white",
                letterSpacing: "-0.035em", lineHeight: 1.1,
                marginBottom: 24,
                animation: "fadeSlideUp 0.65s ease 0.05s both",
              }}>
                Unifique suas<br />
                <span style={{
                  background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  métricas sociais
                </span><br />
                em um só lugar.
              </h1>

              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "clamp(16px, 2vw, 19px)",
                color: "rgba(224,224,224,0.70)", lineHeight: 1.65,
                maxWidth: 500, marginBottom: 40,
                animation: "fadeSlideUp 0.65s ease 0.1s both",
              }}>
                YouTube, Instagram e Facebook com insights reais e automação segura. Sem planilhas, sem esforço manual.
              </p>

              <div style={{
                display: "flex", flexWrap: "wrap", gap: 12,
                animation: "fadeSlideUp 0.65s ease 0.15s both",
              }}>
                <Link href="/login">
                  <span className="landing-cta-btn" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "14px 28px", borderRadius: 999,
                    background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE})`,
                    color: "white",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 16, fontWeight: 600, cursor: "pointer",
                    boxShadow: "0 6px 24px rgba(108,99,255,0.40)",
                    transition: "all 0.25s",
                    textDecoration: "none",
                  }}>
                    Solicitar demonstração <ArrowRight size={16} />
                  </span>
                </Link>
                <a href="#demo" className="landing-cta-secondary" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "14px 28px", borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  border: "1.5px solid rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.88)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 16, fontWeight: 500, cursor: "pointer",
                  transition: "all 0.2s", textDecoration: "none",
                }}>
                  Ver como funciona
                </a>
              </div>

              {/* Stats row */}
              <div style={{
                display: "flex", gap: 32, marginTop: 56, flexWrap: "wrap",
                animation: "fadeSlideUp 0.65s ease 0.2s both",
              }}>
                {[
                  { value: "3+", label: "Plataformas conectadas" },
                  { value: "98%", label: "Uptime garantido" },
                  { value: "AES-256", label: "Criptografia" },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 28, fontWeight: 700, color: "white",
                      letterSpacing: "-0.02em", marginBottom: 2,
                    }}>
                      {value}
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.48)" }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right chart */}
            <div className="hero-chart-col" style={{ flex: "0 0 440px", animation: "floatHero 5s ease-in-out infinite" }}>
              <HeroChart dark={dark} />
            </div>
          </div>
        </section>

        {/* ── 2. PROBLEM CARDS ─────────────────────────────── */}
        <section id="soluções" style={{ padding: "96px clamp(20px, 6vw, 100px)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div data-reveal style={{ textAlign: "center", marginBottom: 56 }}>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                color: PURPLE, textTransform: "uppercase", letterSpacing: "0.12em",
                marginBottom: 12,
              }}>
                Problemas que resolvemos
              </p>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700,
                color: text, letterSpacing: "-0.03em",
                marginBottom: 16,
              }}>
                Chega de análise fragmentada
              </h2>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 17,
                color: textMuted, maxWidth: 520, margin: "0 auto",
                lineHeight: 1.65,
              }}>
                Três dores que todo gestor de social media conhece — e que o MetaCollector resolve.
              </p>
            </div>

            <div className="problems-grid" data-reveal style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24,
            }}>
              {problems.map(({ icon: Icon, title, desc, color }, i) => (
                <div
                  key={title}
                  className="problem-card"
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: "var(--radius-xl)", padding: "32px 28px",
                    boxShadow: dark
                      ? "var(--shadow-lg)"
                      : "var(--shadow-sm)",
                    cursor: "default",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    animationDelay: `${i * 0.08}s`,
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: "var(--radius)",
                    background: `${color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 20,
                  }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 20, fontWeight: 700, color: text,
                    letterSpacing: "-0.02em", marginBottom: 10,
                  }}>
                    {title}
                  </h3>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 15, color: textMuted, lineHeight: 1.65,
                  }}>
                    {desc}
                  </p>
                  <div style={{
                    marginTop: 24, display: "flex", alignItems: "center", gap: 6,
                    color, fontFamily: "'Inter', sans-serif",
                    fontSize: 13, fontWeight: 600,
                  }}>
                    Saiba mais <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2.5. IMAGE SHOWCASE ────────────────────────────── */}
        <ImageShowcase dark={dark} text={text} textMuted={textMuted} cardBg={cardBg} cardBorder={cardBorder} />

        {/* ── 3. DEMO SECTION ──────────────────────────────── */}
        <section id="demo" style={{
          padding: "96px clamp(20px, 6vw, 100px)",
          background: dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
        }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="demo-grid" style={{ display: "flex", alignItems: "center", gap: 64 }}>

              {/* Chart */}
              <div data-reveal style={{ flex: "1 1 420px", minWidth: 0 }}>
                <div style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: "var(--radius-xl)", padding: "28px 24px",
                  boxShadow: dark
                    ? "var(--shadow-lg)"
                    : "var(--shadow-md)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <h3 style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 16, fontWeight: 700, color: text,
                    }}>
                      Tendência de Engajamento
                    </h3>
                    <span style={{
                      padding: "4px 10px", borderRadius: 999,
                      background: "rgba(76,175,80,0.14)", color: SUCCESS,
                      fontSize: 12, fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      +219.6%
                    </span>
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: textMuted, marginBottom: 20 }}>
                    Últimos 7 meses · Dados simulados
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={demoLineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="engajGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PURPLE} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="mes"
                        tick={{ fontSize: 11, fill: dark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.40)" }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: dark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.40)" }}
                        axisLine={false} tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                      />
                      <Tooltip
                        contentStyle={{
                          background: dark ? "rgba(30,42,56,0.95)" : "white",
                          border: `1px solid ${dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)"}`,
                          borderRadius: 10, fontSize: 12,
                          color: dark ? "white" : PETROLEUM,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        }}
                        formatter={(v: number) => [`${(v / 1000).toFixed(1)}K`, "Engajamento"]}
                      />
                      <Area
                        type="monotone" dataKey="engaj"
                        stroke={PURPLE} strokeWidth={3}
                        fill="url(#engajGrad)"
                        dot={{ r: 5, fill: PURPLE, strokeWidth: 2, stroke: cardBg }}
                        activeDot={{ r: 7, fill: ROSE }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Text */}
              <div data-reveal style={{ flex: "1 1 360px", minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                  color: PURPLE, textTransform: "uppercase", letterSpacing: "0.12em",
                  marginBottom: 16,
                }}>
                  Demonstração ao vivo
                </p>
                <h2 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700,
                  color: text, letterSpacing: "-0.03em", lineHeight: 1.2,
                  marginBottom: 20,
                }}>
                  Insights claros e acionáveis em segundos.
                </h2>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 16, color: textMuted, lineHeight: 1.65,
                  marginBottom: 32,
                }}>
                  Visualize tendências de engajamento, compare plataformas e identifique oportunidades de crescimento — tudo em tempo real.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
                  {[
                    "Gráficos interativos atualizados automaticamente",
                    "Comparação side-by-side entre plataformas",
                    "Exportação de relatórios com um clique",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: "rgba(76,175,80,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: SUCCESS, display: "block" }} />
                      </span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: textMuted, lineHeight: 1.5 }}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <Link href="/login">
                  <span className="landing-cta-secondary" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "12px 24px", borderRadius: 999,
                    background: "transparent",
                    border: `1.5px solid ${PURPLE}`,
                    color: PURPLE,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 15, fontWeight: 600, cursor: "pointer",
                    transition: "all 0.2s", textDecoration: "none",
                  }}>
                    Ver exemplo de relatório <ArrowRight size={15} />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. CLIENT LOGOS ──────────────────────────────── */}
        <section id="clientes" style={{ padding: "72px clamp(20px, 6vw, 100px)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div data-reveal style={{ textAlign: "center", marginBottom: 48 }}>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 14,
                color: textMuted, letterSpacing: "0.02em",
              }}>
                Empresas que já simplificaram suas análises sociais.
              </p>
            </div>
            <div data-reveal className="clients-row" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 48, flexWrap: "wrap",
            }}>
              {clients.map((name) => (
                <div key={name} style={{
                  padding: "14px 32px", borderRadius: "var(--radius)",
                  background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${cardBorder}`,
                  transition: "all 0.2s",
                }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = dark ? "rgba(255,255,255,0.08)" : "rgba(108,99,255,0.07)";
                    (e.currentTarget as HTMLElement).style.borderColor = `${PURPLE}40`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
                    (e.currentTarget as HTMLElement).style.borderColor = cardBorder;
                  }}
                >
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 20, fontWeight: 700,
                    color: dark ? "rgba(255,255,255,0.35)" : "rgba(30,42,56,0.30)",
                    letterSpacing: "-0.02em",
                  }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CENTRAL DE CONHECIMENTO ──────────────────────── */}
        <section style={{
          padding: "100px clamp(20px, 6vw, 100px)",
          background: dark ? "#0F1923" : "#FAFBFC",
          position: "relative",
        }}>
          <div data-reveal style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                color: PURPLE, textTransform: "uppercase",
                letterSpacing: "0.12em", marginBottom: 14,
              }}>
                Central de Conhecimento
              </p>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700,
                color: dark ? "white" : PETROLEUM,
                letterSpacing: "-0.035em", lineHeight: 1.15,
                marginBottom: 16,
              }}>
                Aprenda enquanto{" "}
                <span style={{
                  background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  constrói
                </span>
              </h2>
              <p style={{
                fontFamily: "'Inter', sans-serif", fontSize: 16,
                color: dark ? "rgba(224,224,224,0.55)" : "rgba(30,42,56,0.55)",
                lineHeight: 1.6, maxWidth: 560, margin: "0 auto",
              }}>
                Artigos, vídeos, guias interativos e glossário técnico para dominar APIs sociais, OAuth 2.0 e segurança.
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}>
              {[
                {
                  icon: "📚",
                  title: "Artigos Técnicos",
                  desc: "OAuth 2.0, segurança de tokens e boas práticas explicados em profundidade.",
                  color: PURPLE,
                },
                {
                  icon: "🎬",
                  title: "Tutoriais em Vídeo",
                  desc: "Assista passo-a-passo como integrar APIs do YouTube, Instagram e Facebook.",
                  color: ROSE,
                },
                {
                  icon: "🧭",
                  title: "Guia Interativo",
                  desc: "Exemplos de código em JavaScript, Python e cURL prontos para copiar e usar.",
                  color: "#4CAF50",
                },
                {
                  icon: "📖",
                  title: "Glossário",
                  desc: "Termos técnicos como API, Token, Webhook e Rate Limit explicados de forma clara.",
                  color: "#F59E0B",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: 28,
                    borderRadius: 20,
                    background: dark ? "rgba(255,255,255,0.04)" : "white",
                    border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                    transition: "all 0.25s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${card.color}15`;
                    (e.currentTarget as HTMLElement).style.borderColor = `${card.color}30`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLElement).style.borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${card.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, marginBottom: 18,
                  }}>
                    {card.icon}
                  </div>
                  <h3 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 18, fontWeight: 700,
                    color: dark ? "white" : PETROLEUM,
                    marginBottom: 8, letterSpacing: "-0.02em",
                  }}>
                    {card.title}
                  </h3>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 14,
                    color: dark ? "rgba(224,224,224,0.55)" : "rgba(30,42,56,0.55)",
                    lineHeight: 1.6,
                  }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 40 }}>
              <Link href="/login">
                <span className="landing-cta-btn" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "13px 28px", borderRadius: 999,
                  background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE})`,
                  color: "white",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 6px 24px rgba(108,99,255,0.35)",
                  transition: "all 0.25s", textDecoration: "none",
                }}>
                  Acessar conteúdo completo <ArrowRight size={15} />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 5. FINAL CTA ─────────────────────────────────── */}
        <section id="contato" style={{
          padding: "100px clamp(20px, 6vw, 100px)",
          background: `linear-gradient(145deg, ${PETROLEUM} 0%, #243447 60%, #1a2535 100%)`,
          position: "relative", overflow: "hidden",
        }}>
          {/* Background glow */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600, height: 400,
            background: "radial-gradient(ellipse, rgba(108,99,255,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div data-reveal style={{ textAlign: "center", maxWidth: 680, margin: "0 auto", position: "relative" }}>
            <p style={{
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
              color: "rgba(108,99,255,0.9)", textTransform: "uppercase",
              letterSpacing: "0.12em", marginBottom: 20,
            }}>
              Comece agora
            </p>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 700,
              color: "white", letterSpacing: "-0.035em", lineHeight: 1.15,
              marginBottom: 20,
            }}>
              Pronto para simplificar sua análise social?
            </h2>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18, color: "rgba(224,224,224,0.65)",
              lineHeight: 1.65, marginBottom: 40,
            }}>
              Conecte suas contas em minutos e comece a ver insights que realmente importam.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login">
                <span className="landing-cta-btn" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "15px 32px", borderRadius: 999,
                  background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE})`,
                  color: "white",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 17, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 8px 28px rgba(108,99,255,0.45)",
                  transition: "all 0.25s", textDecoration: "none",
                }}>
                  Conectar minhas contas <ArrowRight size={17} />
                </span>
              </Link>
            </div>
            <p style={{
              marginTop: 24, fontFamily: "'Inter', sans-serif",
              fontSize: 13, color: "rgba(255,255,255,0.35)",
            }}>
              Gratuito para começar · Sem cartão de crédito
            </p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer style={{
          padding: "32px clamp(20px, 6vw, 100px)",
          borderTop: `1px solid ${cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15, fontWeight: 700, color: textMuted,
          }}>
            <span style={{ color: PURPLE }}>Meta</span>Collector
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: textMuted }}>
            © 2026 · Todos os direitos reservados
          </span>
          <Link href="/login">
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: PURPLE, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Acessar painel
            </span>
          </Link>
        </footer>
      </div>
    </>
  );
}
