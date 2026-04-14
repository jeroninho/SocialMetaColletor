import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart2,
  LayoutDashboard,
  Settings,
  Youtube,
  Instagram,
  Facebook,
  Link2,
  Sun,
  Moon,
  TrendingUp,
  LogOut,
  Menu,
  X,
  BookOpen,
  Play,
  Map,
  BookA,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme";
import { useAuth } from "@/context/auth";

/* ── Design tokens ─────────────────────────────────────── */
const PETROLEUM = "#1E2A38";
const PURPLE    = "#6C63FF";
const ROSE      = "#FF6F91";

/* ── Nav items ─────────────────────────────────────────── */
const navMain = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { href: "/youtube",     icon: Youtube,         label: "YouTube",         color: "#FF0000" },
  { href: "/instagram",   icon: Instagram,       label: "Instagram",       color: "#FF6F91" },
  { href: "/facebook",    icon: Facebook,        label: "Facebook",        color: "#1877F2" },
  { href: "/reports",     icon: TrendingUp,      label: "Relatórios" },
  { href: "/fetch",       icon: Link2,           label: "Buscar Metadados" },
];

const navLearn = [
  { href: "/articles",  icon: BookOpen, label: "Artigos" },
  { href: "/videos",    icon: Play,     label: "Vídeos" },
  { href: "/guide",     icon: Map,      label: "Guia Interativo" },
  { href: "/glossary",  icon: BookA,    label: "Glossário" },
];

const navSettings = [
  { href: "/connections", icon: Settings, label: "Conexões" },
];

const pageLabels: Record<string, string> = {
  "/dashboard":   "Dashboard",
  "/youtube":     "YouTube",
  "/instagram":   "Instagram",
  "/facebook":    "Facebook",
  "/reports":     "Relatórios",
  "/fetch":       "Buscar Metadados",
  "/connections": "Conexões",
  "/articles":    "Artigos Técnicos",
  "/videos":      "Tutoriais em Vídeo",
  "/guide":       "Guia Interativo",
  "/glossary":    "Glossário",
};

/* ── NavLink ────────────────────────────────────────────── */
function NavLink({
  href,
  icon: Icon,
  label,
  color,
  active,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color?: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <span
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer",
          "transition-all duration-200 ease-in-out",
          active
            ? "font-semibold"
            : "hover:bg-white/10 text-white/70 hover:text-white"
        )}
        style={
          active
            ? {
                backgroundColor: "rgba(108,99,255,0.22)",
                color: PURPLE,
                boxShadow: "inset 0 0 0 1px rgba(108,99,255,0.30)",
              }
            : undefined
        }
      >
        <Icon
          className="w-4 h-4 flex-shrink-0"
          style={
            active ? { color: PURPLE } : color ? { color } : { color: "rgba(255,255,255,0.65)" }
          }
        />
        <span style={active ? { color: PURPLE } : { color: "rgba(255,255,255,0.85)" }}>
          {label}
        </span>
        {active && (
          <span
            className="ml-auto w-1.5 h-1.5 rounded-full"
            style={{ background: PURPLE }}
          />
        )}
      </span>
    </Link>
  );
}

/* ── Sidebar content ────────────────────────────────────── */
function SidebarContent({
  location,
  onNav,
  onLogout,
}: {
  location: string;
  onNav?: () => void;
  onLogout: () => void;
}) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: PETROLEUM }}>
      {/* Brand */}
      <div
        className="h-16 flex items-center px-5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})` }}
          >
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <span
            className="text-white font-bold text-[17px] tracking-tight select-none"
            style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.025em" }}
          >
            <span style={{ color: PURPLE }}>Meta</span>
            <span style={{ color: "rgba(255,255,255,0.90)" }}>Collector</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1"
          style={{ color: "rgba(224,224,224,0.38)" }}
        >
          Navegação
        </p>
        {navMain.map(({ href, icon, label, color }) => (
          <NavLink
            key={href}
            href={href}
            icon={icon}
            label={label}
            color={color}
            active={location === href}
            onClick={onNav}
          />
        ))}

        <div className="pt-5">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1"
            style={{ color: "rgba(224,224,224,0.38)" }}
          >
            Aprender
          </p>
          {navLearn.map(({ href, icon, label }) => (
            <NavLink
              key={href}
              href={href}
              icon={icon}
              label={label}
              active={location === href || location.startsWith(href + "/")}
              onClick={onNav}
            />
          ))}
        </div>

        <div className="pt-5">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-1"
            style={{ color: "rgba(224,224,224,0.38)" }}
          >
            Configurações
          </p>
          {navSettings.map(({ href, icon, label }) => (
            <NavLink
              key={href}
              href={href}
              icon={icon}
              label={label}
              active={location === href}
              onClick={onNav}
            />
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div
        className="p-4 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {user ? (
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white uppercase"
              style={{ background: `linear-gradient(135deg, ${PURPLE}, ${ROSE})` }}
            >
              {user.nome.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-semibold text-white/90 truncate"
                style={{ fontFamily: "var(--app-font-heading)" }}
              >
                {user.nome}
              </p>
              <p className="text-[10px] truncate" style={{ color: "rgba(224,224,224,0.55)" }}>
                {user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Sair"
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 hover:bg-white/15"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Layout ─────────────────────────────────────────────── */
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, navigate] = useLocation();

  const dark = theme === "dark";
  const pageTitle = pageLabels[location] ?? (location.startsWith("/articles/") ? "Artigo" : location.replace("/", ""));

  function handleLogout() {
    logout();
    navigate("/login");
  }

  /* Close sidebar when route changes */
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  /* Prevent scroll when mobile sidebar is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="min-h-[100dvh] flex w-full bg-background">

      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 sticky top-0 h-screen"
        style={{ backgroundColor: PETROLEUM }}
      >
        <SidebarContent location={location} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile overlay ──────────────────────────── */}
      {mobileOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar drawer ───────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: PETROLEUM }}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-50"
          style={{ background: "rgba(255,255,255,0.12)" }}
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>
        <SidebarContent location={location} onNav={() => setMobileOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header
          className="h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 backdrop-blur-md"
          style={{
            backgroundColor: dark
              ? "rgba(44,44,44,0.88)"
              : "rgba(255,255,255,0.92)",
            borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.10)"}`,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200"
              style={{ background: "rgba(108,99,255,0.12)" }}
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" style={{ color: PURPLE }} />
            </button>

            <div className="flex items-center gap-2.5">
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.025em" }}
              >
                {pageTitle}
              </h1>
              <span
                className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{
                  background: dark ? "rgba(74,207,80,0.15)" : "rgba(74,207,80,0.12)",
                  color: "#4CAF50",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ao vivo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: dark ? "rgba(255,255,255,0.10)" : "rgba(30,42,56,0.08)",
              }}
              title={dark ? "Modo claro" : "Modo escuro"}
            >
              {dark ? (
                <Sun className="w-4 h-4 icon-enter" style={{ color: "#FBBF24" }} />
              ) : (
                <Moon className="w-4 h-4 icon-enter" style={{ color: PETROLEUM }} />
              )}
            </button>

            {/* Primary CTA */}
            <Link href="/connections">
              <span
                className="btn-gradient hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold cursor-pointer"
                style={{ fontFamily: "var(--app-font-heading)" }}
              >
                Gerenciar Conexões
              </span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
