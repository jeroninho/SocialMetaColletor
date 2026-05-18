import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Menu, X, ArrowUpRight, ArrowRight, Check, Lock, KeyRound, ShieldCheck } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import dashboardShot from "@assets/image_1779116755506.png";
import reportsShot from "@assets/image_1779116783054.png";
import comparatorShot from "@assets/image_1779116810072.png";

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
const demoLineData = [
  { mes: "Set", engaj: 28000 },
  { mes: "Out", engaj: 34500 },
  { mes: "Nov", engaj: 38200 },
  { mes: "Dez", engaj: 44100 },
  { mes: "Jan", engaj: 57400 },
  { mes: "Fev", engaj: 72300 },
  { mes: "Mar", engaj: 89600 },
];

/* ─── Showcase images ────────────────────────────────────── */
const showcaseImages = [
  { src: dashboardShot,  label: "Dashboard",  desc: "Visão geral unificada das 5 plataformas" },
  { src: reportsShot,    label: "Relatórios", desc: "Tendências de engajamento ao longo do tempo" },
  { src: comparatorShot, label: "Comparador", desc: "Compare campanhas entre plataformas e períodos" },
];

/* ─── Platform coverage rows ─────────────────────────────── */
const coverage = [
  { name: "YouTube",   endpoints: "channel · videos · analytics" },
  { name: "Instagram", endpoints: "profile · media · analytics" },
  { name: "Facebook",  endpoints: "page · posts · analytics" },
  { name: "TikTok",    endpoints: "profile · videos · analytics" },
  { name: "X / Twitter", endpoints: "profile · tweets · analytics" },
];

/* ─── Security pillars ───────────────────────────────────── */
const securityPillars = [
  {
    num: "01",
    icon: KeyRound,
    title: "OAuth 2.0 server-side",
    desc: "Troca de código no servidor — tokens nunca passam pelo navegador.",
  },
  {
    num: "02",
    icon: Lock,
    title: "AES-256-GCM em repouso",
    desc: "encryptToken() embrulha cada access e refresh token antes do banco.",
  },
  {
    num: "03",
    icon: ShieldCheck,
    title: "Sessões JWT com TTL curto",
    desc: "Bearer middleware, expiração configurável, senhas com bcrypt.",
  },
];

/* ─── How it works steps ─────────────────────────────────── */
const steps = [
  { num: "01", title: "Crie sua conta",          desc: "Workspace pronto em segundos. Sem cartão de crédito." },
  { num: "02", title: "Conecte uma plataforma",  desc: "Um round-trip OAuth por conta. As outras seguem o mesmo padrão." },
  { num: "03", title: "Leia o cenário",          desc: "Dashboard, comparador e alertas já populados com seus dados." },
];

const clients = ["Nexio", "Brandify", "Cortex", "Lumora", "Aurora"];

/* ─── Navbar ─────────────────────────────────────────────── */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all"
        style={{
          background: scrolled ? "hsl(var(--background) / 0.88)" : "transparent",
          borderBottom: scrolled ? "1px solid hsl(var(--border))" : "1px solid transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
        }}
      >
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between">
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

          <div className="hidden md:flex items-center gap-9 text-[14px] text-foreground/70">
            <a href="#solucoes" className="hover:text-foreground transition-colors">Soluções</a>
            <a href="#showcase" className="hover:text-foreground transition-colors">Plataforma</a>
            <a href="#clientes" className="hover:text-foreground transition-colors">Clientes</a>
            <a href="#contato" className="hover:text-foreground transition-colors">Contato</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <span className="hidden sm:inline-flex text-[14px] text-foreground/75 hover:text-foreground transition-colors cursor-pointer">
                Entrar
              </span>
            </Link>
            <Link href="/login">
              <span className="btn-primary text-[14px] py-2.5 px-5">
                Começar
                <ArrowRight size={14} strokeWidth={1.75} />
              </span>
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden w-9 h-9 rounded-md flex items-center justify-center hover:bg-foreground/5 text-foreground"
              aria-label="Menu"
            >
              {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div className="fixed top-[72px] inset-x-0 z-40 bg-background border-b border-border md:hidden">
          <div className="px-6 py-4 flex flex-col">
            {[
              ["Soluções", "#solucoes"],
              ["Plataforma", "#showcase"],
              ["Clientes", "#clientes"],
              ["Contato", "#contato"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="py-3 text-[15px] text-foreground border-b border-border/60 last:border-0"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Image showcase ─────────────────────────────────────── */
function ImageShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setActive((p) => (p + 1) % showcaseImages.length);
    }, 4500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused]);

  return (
    <section
      id="showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="py-24 md:py-32 px-6 lg:px-10 bg-cream"
    >
      <div className="max-w-[1240px] mx-auto">
        <div data-reveal className="max-w-2xl mb-16">
          <p className="eyebrow mb-4">Plataforma</p>
          <h2 className="text-foreground font-display">
            Tudo o que você precisa, nada que você não precise.
          </h2>
        </div>

        <div data-reveal className="grid md:grid-cols-[1fr_280px] gap-8 md:gap-12 items-start">
          <div className="rounded-lg overflow-hidden border border-border bg-background">
            <div className="px-4 py-3 border-b border-border flex items-center gap-1.5 bg-foreground/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-foreground/15" />
              <span className="ml-auto text-[12px] text-muted-foreground tracking-wide">
                {showcaseImages[active].label}
              </span>
            </div>
            <img
              key={showcaseImages[active].src}
              src={showcaseImages[active].src}
              alt={showcaseImages[active].label}
              className="w-full block animate-[lp-fade_0.6s_ease-out_both]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {showcaseImages.map((img, i) => (
              <button
                key={img.label}
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={`text-left px-4 py-3.5 rounded-md border transition-colors ${
                  i === active
                    ? "border-foreground bg-foreground/[0.03]"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                <p className="text-[14px] font-medium text-foreground mb-0.5">
                  {img.label}
                </p>
                <p className="text-[12.5px] text-muted-foreground leading-snug">
                  {img.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function LandingPage() {
  useScrollReveal();

  return (
    <>
      <style>{`
        @keyframes lp-fade {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-fade-1 { animation: lp-fade 0.7s ease-out 0.05s both; }
        .lp-fade-2 { animation: lp-fade 0.7s ease-out 0.18s both; }
        .lp-fade-3 { animation: lp-fade 0.7s ease-out 0.30s both; }
        .lp-fade-4 { animation: lp-fade 0.7s ease-out 0.42s both; }
      `}</style>

      <div className="min-h-[100dvh] bg-background text-foreground">
        <Navbar />

        {/* ── HERO ─────────────────────────────────────── */}
        <section className="pt-[120px] md:pt-[140px] pb-20 md:pb-28 px-6 lg:px-10">
          <div className="max-w-[1240px] mx-auto">
            <p className="eyebrow lp-fade-1 mb-6">Análise social, simplificada</p>
            <h1 className="lp-fade-2 font-display max-w-4xl text-foreground">
              Suas métricas sociais,<br />
              <span className="text-muted-foreground">reunidas com clareza.</span>
            </h1>
            <p className="lp-fade-3 mt-7 max-w-xl text-[17px] md:text-[18px] text-muted-foreground leading-[1.55]">
              YouTube, Instagram, Facebook, TikTok e X — em um único painel calmo,
              feito para quem prefere foco a barulho.
            </p>
            <div className="lp-fade-4 mt-10 flex flex-wrap items-center gap-3">
              <Link href="/login">
                <span className="btn-primary">
                  Começar agora
                  <ArrowRight size={15} strokeWidth={1.75} />
                </span>
              </Link>
              <a href="#showcase" className="btn-outline">
                Ver plataforma
              </a>
            </div>

            {/* Meta line */}
            <div className="lp-fade-4 mt-12 flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check size={13} strokeWidth={2} /> 5 plataformas integradas</span>
              <span className="flex items-center gap-1.5"><Check size={13} strokeWidth={2} /> OAuth 2.0 seguro</span>
              <span className="flex items-center gap-1.5"><Check size={13} strokeWidth={2} /> Sem cartão de crédito</span>
            </div>
          </div>
        </section>

        {/* ── PROBLEM / VALUE ──────────────────────────── */}
        <section id="solucoes" className="py-20 md:py-28 px-6 lg:px-10 border-t border-border">
          <div className="max-w-[1240px] mx-auto">
            <div data-reveal className="max-w-2xl mb-16 md:mb-20">
              <p className="eyebrow mb-4">Por quê</p>
              <h2 className="font-display text-foreground">
                Três fricções que tiramos do seu caminho.
              </h2>
            </div>

            <div data-reveal className="grid md:grid-cols-3 gap-10 md:gap-14">
              {[
                {
                  num: "01",
                  title: "Dados fragmentados",
                  desc: "Centralize métricas de cinco plataformas em uma visão única, sem alternar abas.",
                },
                {
                  num: "02",
                  title: "Comparação difícil",
                  desc: "Compare engajamento cross-platform lado a lado, com a mesma régua para todas.",
                },
                {
                  num: "03",
                  title: "Coleta manual",
                  desc: "Agende sincronizações automáticas. Seu tempo volta para a estratégia.",
                },
              ].map((p) => (
                <div key={p.num}>
                  <p className="text-[12.5px] font-mono text-muted-foreground mb-4 tracking-wider">
                    {p.num}
                  </p>
                  <h3 className="text-[17px] font-medium text-foreground mb-2.5">
                    {p.title}
                  </h3>
                  <p className="text-[14.5px] text-muted-foreground leading-[1.6]">
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COVERAGE (5 platforms) ───────────────────── */}
        <section className="py-20 md:py-28 px-6 lg:px-10 border-t border-border">
          <div className="max-w-[1240px] mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-start">
            <div data-reveal>
              <p className="eyebrow mb-4">Cobertura</p>
              <h2 className="font-display text-foreground">
                Cada canal<br />
                <span className="text-muted-foreground italic">que importa.</span>
              </h2>
              <p className="mt-6 text-[16px] text-muted-foreground leading-[1.65] max-w-md">
                Perfil, listagem de conteúdo e analytics para cada plataforma,
                normalizados em um schema único — para que dashboard, comparador
                e alertas falem a mesma língua.
              </p>
              <div className="mt-10 flex items-baseline gap-4">
                <span
                  className="text-[64px] md:text-[80px] leading-none text-foreground"
                  style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.04em" }}
                >
                  5
                </span>
                <span className="text-[13.5px] text-muted-foreground leading-[1.4]">
                  plataformas unificadas<br />sob um único schema
                </span>
              </div>
            </div>

            <div data-reveal className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-foreground/[0.02]">
                <span className="eyebrow text-[11px]">Fontes conectadas</span>
                <span className="font-mono text-[11.5px] text-muted-foreground">/auth/status</span>
              </div>
              {coverage.map((row, i) => (
                <div
                  key={row.name}
                  className={`px-5 py-4 flex items-baseline justify-between ${
                    i < coverage.length - 1 ? "border-b border-border/60" : ""
                  }`}
                >
                  <span
                    className="text-[18px] md:text-[20px] text-foreground"
                    style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.015em" }}
                  >
                    {row.name}
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {row.endpoints}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── IMAGE SHOWCASE ───────────────────────────── */}
        <ImageShowcase />

        {/* ── LIVE DEMO CHART ──────────────────────────── */}
        <section className="py-20 md:py-28 px-6 lg:px-10 border-t border-border">
          <div className="max-w-[1240px] mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <div data-reveal>
              <p className="eyebrow mb-4">Insights</p>
              <h2 className="font-display text-foreground mb-6">
                Tendências claras, em segundos.
              </h2>
              <p className="text-[16px] text-muted-foreground leading-[1.65] mb-8 max-w-md">
                Visualize crescimento, compare períodos e identifique
                oportunidades — sem planilhas, sem espera.
              </p>
              <ul className="space-y-3.5 mb-10">
                {[
                  "Gráficos atualizados automaticamente",
                  "Comparação side-by-side entre plataformas",
                  "Exportação de relatórios em um clique",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14.5px] text-foreground/80">
                    <span className="mt-[7px] w-1 h-1 rounded-full bg-foreground flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login">
                <span className="btn-outline">
                  Ver exemplo
                  <ArrowUpRight size={14} strokeWidth={1.75} />
                </span>
              </Link>
            </div>

            <div data-reveal className="rounded-lg border border-border p-6 bg-background">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-medium text-foreground">Engajamento mensal</p>
                <span className="text-[12px] text-muted-foreground tabular-nums">+219%</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground mb-5">7 meses · todas as plataformas</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={demoLineData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="engajGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "hsl(var(--foreground))",
                      boxShadow: "var(--shadow-md)",
                    }}
                    formatter={(v: number) => [`${(v / 1000).toFixed(1)}K`, "Engajamento"]}
                  />
                  <Area
                    type="monotone" dataKey="engaj"
                    stroke="hsl(var(--foreground))" strokeWidth={1.5}
                    fill="url(#engajGrad)"
                    dot={{ r: 3, fill: "hsl(var(--foreground))", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "hsl(var(--foreground))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── SECURITY ─────────────────────────────────── */}
        <section className="py-20 md:py-28 px-6 lg:px-10 border-t border-border bg-cream">
          <div className="max-w-[1240px] mx-auto">
            <div data-reveal className="max-w-2xl mb-16 md:mb-20">
              <p className="eyebrow mb-4">Confiança</p>
              <h2 className="font-display text-foreground">
                Seus tokens não saem<br />
                <span className="text-muted-foreground italic">do seu perímetro.</span>
              </h2>
              <p className="mt-6 text-[16px] text-muted-foreground leading-[1.65] max-w-xl">
                OAuth 2.0 server-side para todas as cinco plataformas. Access e
                refresh tokens criptografados com AES-256-GCM antes de tocarem o
                banco. Sessões em JWT com expirações curtas e rotacionáveis.
              </p>
            </div>

            <div data-reveal className="grid md:grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden">
              {securityPillars.map(({ num, icon: Icon, title, desc }) => (
                <div key={num} className="bg-background p-7 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <span className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                      <Icon size={16} strokeWidth={1.5} className="text-foreground" />
                    </span>
                    <span className="text-[11.5px] font-mono text-muted-foreground tracking-wider">
                      {num}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    {title}
                  </h3>
                  <p className="text-[13.5px] text-muted-foreground leading-[1.6]">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────── */}
        <section className="py-20 md:py-28 px-6 lg:px-10 border-t border-border">
          <div className="max-w-[1240px] mx-auto">
            <div data-reveal className="max-w-2xl mb-16">
              <p className="eyebrow mb-4">Como funciona</p>
              <h2 className="font-display text-foreground">
                Conecte uma conta.<br />
                <span className="text-muted-foreground italic">As outras seguem.</span>
              </h2>
            </div>

            <div data-reveal className="grid md:grid-cols-3 gap-10 md:gap-14 relative">
              {steps.map((step, i) => (
                <div key={step.num} className="relative">
                  <p className="text-[12px] font-mono text-muted-foreground tracking-wider mb-5">
                    Passo {step.num}
                  </p>
                  <h3
                    className="text-[22px] md:text-[24px] text-foreground mb-3"
                    style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[14.5px] text-muted-foreground leading-[1.6] max-w-xs">
                    {step.desc}
                  </p>
                  {i < steps.length - 1 && (
                    <span className="hidden md:block absolute top-[6px] right-0 translate-x-1/2 text-muted-foreground/40">
                      <ArrowRight size={14} strokeWidth={1.5} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLIENTS ──────────────────────────────────── */}
        <section id="clientes" className="py-20 px-6 lg:px-10 border-t border-border bg-cream">
          <div className="max-w-[1240px] mx-auto">
            <p data-reveal className="eyebrow text-center mb-10">
              Confiado por equipes que valorizam clareza
            </p>
            <div data-reveal className="flex flex-wrap items-center justify-center gap-x-14 gap-y-6">
              {clients.map((name) => (
                <span
                  key={name}
                  className="text-[20px] md:text-[22px] text-foreground/35 hover:text-foreground/65 transition-colors"
                  style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── KNOWLEDGE ────────────────────────────────── */}
        <section className="py-24 md:py-32 px-6 lg:px-10 border-t border-border">
          <div className="max-w-[1240px] mx-auto">
            <div data-reveal className="max-w-2xl mb-16">
              <p className="eyebrow mb-4">Central de conhecimento</p>
              <h2 className="font-display text-foreground">
                Aprenda enquanto constrói.
              </h2>
              <p className="mt-5 text-[16px] text-muted-foreground max-w-lg leading-[1.6]">
                Artigos, vídeos, guia interativo e glossário técnico —
                feitos para quem leva analytics a sério.
              </p>
            </div>

            <div data-reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-border">
              {[
                { title: "Artigos técnicos",  desc: "OAuth 2.0, segurança de tokens, boas práticas." },
                { title: "Tutoriais em vídeo", desc: "Integre APIs sociais passo a passo." },
                { title: "Guia interativo",    desc: "JavaScript, Python e cURL prontos para usar." },
                { title: "Glossário",          desc: "Termos como Token, Webhook e Rate Limit." },
              ].map((card, i, arr) => (
                <div
                  key={card.title}
                  className={`p-8 border-b border-border ${i < arr.length - 1 ? "lg:border-r" : ""} ${i % 2 === 0 ? "sm:border-r lg:border-r" : ""}`}
                >
                  <p className="text-[12px] font-mono text-muted-foreground mb-5">
                    0{i + 1}
                  </p>
                  <h3 className="text-[16px] font-medium text-foreground mb-2">
                    {card.title}
                  </h3>
                  <p className="text-[13.5px] text-muted-foreground leading-[1.6]">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────── */}
        <section id="contato" className="px-6 lg:px-10 border-t border-border">
          <div className="max-w-[1240px] mx-auto py-24 md:py-36">
            <div data-reveal className="max-w-3xl">
              <h2 className="font-display text-foreground">
                Pronto para simplificar<br />sua análise social?
              </h2>
              <p className="mt-6 text-[17px] text-muted-foreground max-w-xl leading-[1.6]">
                Conecte suas contas em minutos. Sem cartão de crédito.
                Sem compromisso.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/login">
                  <span className="btn-primary">
                    Conectar minhas contas
                    <ArrowRight size={15} strokeWidth={1.75} />
                  </span>
                </Link>
                <a href="#showcase" className="btn-outline">
                  Ver demonstração
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────── */}
        <footer className="border-t border-border px-6 lg:px-10">
          <div className="max-w-[1240px] mx-auto py-10 flex flex-wrap items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-[14px] text-foreground/65">
              <span className="w-5 h-5 rounded-sm bg-foreground flex items-center justify-center">
                <span className="block w-1.5 h-1.5 bg-background rounded-[1px]" />
              </span>
              <span style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}>
                MetaCollector
              </span>
            </span>
            <span className="text-[13px] text-muted-foreground">
              © 2026 · Todos os direitos reservados
            </span>
            <Link href="/login">
              <span className="text-[13px] text-foreground/75 hover:text-foreground transition-colors cursor-pointer underline underline-offset-4 decoration-foreground/30">
                Acessar painel
              </span>
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
