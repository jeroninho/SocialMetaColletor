import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
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
  Music,
  Twitter,
  GitCompare,
  Bell,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme";
import { useAuth } from "@/context/auth";

/* ── Nav items ─────────────────────────────────────────── */
const navMain = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { href: "/youtube",     icon: Youtube,         label: "YouTube" },
  { href: "/instagram",   icon: Instagram,       label: "Instagram" },
  { href: "/facebook",    icon: Facebook,        label: "Facebook" },
  { href: "/tiktok",      icon: Music,           label: "TikTok" },
  { href: "/twitter",     icon: Twitter,         label: "X / Twitter" },
  { href: "/reports",     icon: TrendingUp,      label: "Relatórios" },
  { href: "/comparator",  icon: GitCompare,      label: "Comparador" },
  { href: "/alerts",      icon: Bell,            label: "Alertas" },
  { href: "/scheduler",   icon: Clock,           label: "Agendamento" },
  { href: "/fetch",       icon: Link2,           label: "Buscar Metadados" },
];

const navLearn = [
  { href: "/articles",  icon: BookOpen, label: "Artigos" },
  { href: "/videos",    icon: Play,     label: "Vídeos" },
  { href: "/guide",     icon: Map,      label: "Guia" },
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
  "/tiktok":      "TikTok",
  "/twitter":     "X / Twitter",
  "/reports":     "Relatórios",
  "/comparator":  "Comparador",
  "/alerts":      "Alertas",
  "/scheduler":   "Agendamento",
  "/fetch":       "Buscar Metadados",
  "/connections": "Conexões",
  "/articles":    "Artigos",
  "/videos":      "Vídeos",
  "/guide":       "Guia",
  "/glossary":    "Glossário",
};

/* ── NavLink ────────────────────────────────────────────── */
function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <span className={cn("nav-item", active && "active")}>
        <Icon className="w-[15px] h-[15px] flex-shrink-0 opacity-80" strokeWidth={1.5} />
        <span>{label}</span>
      </span>
    </Link>
  );
}

/* ── Section heading ────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/55 mt-6 mb-2 px-3">
      {children}
    </p>
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
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 flex-shrink-0 border-b border-sidebar-border">
        <Link href="/dashboard">
          <span className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="w-6 h-6 rounded-sm bg-foreground flex items-center justify-center">
              <span className="block w-2 h-2 bg-background rounded-[1px]" />
            </span>
            <span
              className="text-[15px] tracking-tight font-medium"
              style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}
            >
              MetaCollector
            </span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        <SectionLabel>Navegação</SectionLabel>
        <div className="space-y-0.5">
          {navMain.map(({ href, icon, label }) => (
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

        <SectionLabel>Aprender</SectionLabel>
        <div className="space-y-0.5">
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

        <SectionLabel>Configurações</SectionLabel>
        <div className="space-y-0.5">
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
      <div className="p-3 flex-shrink-0 border-t border-sidebar-border">
        {user ? (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center flex-shrink-0 text-[11px] font-medium uppercase">
              {user.nome.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate text-sidebar-foreground">
                {user.nome}
              </p>
              <p className="text-[11px] truncate text-sidebar-foreground/70">
                {user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Sair"
              aria-label="Sair"
              className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 transition-colors hover:bg-sidebar-foreground/8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
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

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="min-h-[100dvh] flex w-full bg-background">

      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 sticky top-0 h-screen bg-sidebar border-r border-sidebar-border">
        <SidebarContent location={location} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile overlay ──────────────────────────── */}
      {mobileOpen && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile sidebar drawer ───────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden bg-sidebar border-r border-sidebar-border",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-md flex items-center justify-center z-50 hover:bg-sidebar-foreground/8 text-sidebar-foreground/65"
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <SidebarContent location={location} onNav={() => setMobileOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header — minimal */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden w-11 h-11 -ml-2 rounded-md flex items-center justify-center hover:bg-foreground/5 text-foreground"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <h1
              className="text-[18px] tracking-tight font-medium text-foreground"
              style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}
            >
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Status pill */}
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/70" />
              Ao vivo
            </span>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-11 h-11 rounded-md flex items-center justify-center hover:bg-foreground/5 text-foreground transition-colors"
              title={dark ? "Modo claro" : "Modo escuro"}
              aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
              {dark ? (
                <Sun className="w-4 h-4 icon-enter" strokeWidth={1.5} />
              ) : (
                <Moon className="w-4 h-4 icon-enter" strokeWidth={1.5} />
              )}
            </button>

            {/* Primary CTA */}
            <Link href="/connections">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer bg-foreground text-background hover:bg-foreground/88 transition-colors">
                Conexões
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
