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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme";
import { useAuth } from "@/context/auth";

/* ── Design tokens ─────────────────────────────────────── */
const PETROLEUM = "#1E2A38";
const BLUE      = "#4F6BF4";

/* ── Nav items ─────────────────────────────────────────── */
const navMain = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { href: "/youtube",     icon: Youtube,         label: "YouTube",         color: "#FF0000" },
  { href: "/instagram",   icon: Instagram,       label: "Instagram",       color: "#E1306C" },
  { href: "/facebook",    icon: Facebook,        label: "Facebook",        color: "#1877F2" },
  { href: "/reports",     icon: TrendingUp,      label: "Relatórios" },
  { href: "/fetch",       icon: Link2,           label: "Buscar Metadados" },
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
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer",
          "transition-colors duration-150",
          active
            ? "font-semibold"
            : "hover:bg-white/8 text-white/65 hover:text-white/90"
        )}
        style={
          active
            ? {
                backgroundColor: "rgba(79,107,244,0.18)",
                color: "#94AAFC",
                borderLeft: `2px solid ${BLUE}`,
                paddingLeft: 10,
              }
            : { borderLeft: "2px solid transparent", paddingLeft: 10 }
        }
      >
        <Icon
          className="w-4 h-4 flex-shrink-0"
          style={
            active ? { color: "#94AAFC" } : color ? { color } : { color: "rgba(255,255,255,0.50)" }
          }
        />
        <span style={active ? { color: "#94AAFC" } : { color: "rgba(255,255,255,0.78)" }}>
          {label}
        </span>
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
        className="h-14 flex items-center px-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: BLUE }}
          >
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-white font-bold text-[16px] tracking-tight select-none"
            style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.025em" }}
          >
            MetaCollector
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2"
          style={{ color: "rgba(224,224,224,0.32)" }}
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
            className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2"
            style={{ color: "rgba(224,224,224,0.32)" }}
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
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        {user ? (
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold text-white uppercase"
              style={{ background: BLUE }}
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
              <p className="text-[10px] truncate" style={{ color: "rgba(224,224,224,0.48)" }}>
                {user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Sair"
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors duration-150 hover:bg-white/12"
              style={{ color: "rgba(255,255,255,0.48)" }}
            >
              <LogOut className="w-3.5 h-3.5" />
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
  const pageTitle = pageLabels[location] ?? location.replace("/", "");

  function handleLogout() {
    logout();
    navigate("/login");
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

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
        className="hidden lg:flex flex-col w-56 xl:w-60 flex-shrink-0 sticky top-0 h-screen"
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
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col lg:hidden",
          "transition-transform duration-250 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: PETROLEUM }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-md flex items-center justify-center z-50"
          style={{ background: "rgba(255,255,255,0.10)" }}
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
        <SidebarContent location={location} onNav={() => setMobileOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header
          className="h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30"
          style={{
            backgroundColor: dark
              ? "rgba(25,25,38,0.88)"
              : "rgba(255,255,255,0.90)",
            borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150"
              style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }}
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-4 h-4" style={{ color: dark ? "rgba(255,255,255,0.75)" : PETROLEUM }} />
            </button>

            <div className="flex items-center gap-2.5">
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}
              >
                {pageTitle}
              </h1>
              <span
                className="hidden sm:flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-sm"
                style={{
                  background: dark ? "rgba(74,207,80,0.12)" : "rgba(74,207,80,0.10)",
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
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150"
              style={{
                background: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold cursor-pointer text-white btn-primary"
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
