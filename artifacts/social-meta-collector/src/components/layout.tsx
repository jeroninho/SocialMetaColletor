import React from "react";
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
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme";

const pageLabels: Record<string, string> = {
  "/": "Dashboard",
  "/youtube": "YouTube",
  "/instagram": "Instagram",
  "/facebook": "Facebook",
  "/reports": "Relatórios",
  "/fetch": "Buscar Metadados",
  "/connections": "Conexões",
  "/login": "Entrar",
};

const navMain = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/youtube", icon: Youtube, label: "YouTube", color: "#FF0000" },
  { href: "/instagram", icon: Instagram, label: "Instagram", color: "#FF6F91" },
  { href: "/facebook", icon: Facebook, label: "Facebook", color: "#1877F2" },
  { href: "/reports", icon: TrendingUp, label: "Relatórios" },
  { href: "/fetch", icon: Link2, label: "Buscar Metadados" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const pageTitle = pageLabels[location] ?? location.slice(1);
  const dark = theme === "dark";

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full bg-background">
        <Sidebar
          className="border-r border-border"
          style={{ backgroundColor: dark ? "#1E2A38" : undefined }}
        >
          <SidebarHeader
            className="h-16 flex items-center px-5 border-b border-border/40"
            style={{ backgroundColor: dark ? "#1E2A38" : undefined }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg, #6C63FF, #FF6F91)" }}
              >
                <BarChart2 className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-lg tracking-tight"
                style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}
              >
                <span style={{ color: "#6C63FF" }}>Meta</span>
                <span className="text-foreground/90">Collector</span>
              </span>
            </div>
          </SidebarHeader>

          <SidebarContent
            className="py-4 px-2"
            style={{ backgroundColor: dark ? "#1E2A38" : undefined }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2"
              style={{ color: dark ? "rgba(224,224,224,0.45)" : undefined }}>
              Navegação
            </p>
            <SidebarMenu>
              {navMain.map(({ href, icon: Icon, label, color }) => {
                const active = location === href;
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        "rounded-lg transition-all duration-200",
                        active
                          ? "font-medium"
                          : "hover:bg-white/8"
                      )}
                      style={active ? { backgroundColor: "rgba(108,99,255,0.18)", color: "#6C63FF" } : undefined}
                    >
                      <Link href={href}>
                        <Icon
                          className="w-4 h-4 flex-shrink-0"
                          style={active ? { color: "#6C63FF" } : color ? { color } : undefined}
                        />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            <div className="mt-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2"
                style={{ color: dark ? "rgba(224,224,224,0.45)" : undefined }}>
                Configurações
              </p>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/connections"}
                    className={cn(
                      "rounded-lg transition-all duration-200",
                      location === "/connections" ? "font-medium" : "hover:bg-white/8"
                    )}
                    style={location === "/connections" ? { backgroundColor: "rgba(108,99,255,0.18)", color: "#6C63FF" } : undefined}
                  >
                    <Link href="/connections">
                      <Settings className="w-4 h-4" style={location === "/connections" ? { color: "#6C63FF" } : undefined} />
                      <span>Conexões</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/login"}
                    className="rounded-lg transition-all duration-200 hover:bg-white/8"
                  >
                    <Link href="/login">
                      <LogIn className="w-4 h-4" />
                      <span>Entrar / Conta</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarContent>

          <div
            className="p-4 border-t border-border/30 mt-auto"
            style={{ backgroundColor: dark ? "#1E2A38" : undefined }}
          >
            <div className="flex items-center gap-2.5 px-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(108,99,255,0.22)" }}
              >
                <BarChart2 className="w-3.5 h-3.5" style={{ color: "#6C63FF" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ fontFamily: "var(--app-font-heading)" }}>
                  Social Analytics
                </p>
                <p className="text-[10px] text-muted-foreground">Plano gratuito</p>
              </div>
            </div>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "var(--app-font-heading)" }}
              >
                {pageTitle}
              </h1>
              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-md px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ao vivo
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full w-9 h-9 hover:bg-muted/60"
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                className="rounded-full text-xs font-semibold text-white border-0"
                style={{ background: "linear-gradient(135deg, #6C63FF, #FF6F91)", transition: "opacity 0.2s" }}
                asChild
              >
                <Link href="/connections">Gerenciar Conexões</Link>
              </Button>
            </div>
          </header>

          <div className="flex-1 p-6 md:p-8 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
