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
  Twitter,
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
  "/reports": "Reports",
  "/fetch": "Buscar Metadata",
  "/connections": "Connections",
};

const navMain = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/youtube", icon: Youtube, label: "YouTube", color: "#FF0000" },
  { href: "/instagram", icon: Instagram, label: "Instagram", color: "#E1306C" },
  { href: "/facebook", icon: Facebook, label: "Facebook", color: "#1877F2" },
  { href: "/reports", icon: TrendingUp, label: "Reports" },
  { href: "/fetch", icon: Link2, label: "Buscar Metadata" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const pageTitle = pageLabels[location] ?? location.slice(1);

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full bg-background">
        <Sidebar className="border-r border-border bg-sidebar">
          <SidebarHeader className="h-16 flex items-center px-5 border-b border-border">
            <div className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <BarChart2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="gradient-text">MetaCollector</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="py-4 px-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
              Navigation
            </p>
            <SidebarMenu>
              {navMain.map(({ href, icon: Icon, label, color }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === href}
                    className={cn(
                      "rounded-lg transition-all",
                      location === href
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <Link href={href}>
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={color ? { color } : undefined}
                      />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            <div className="mt-6">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
                Settings
              </p>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/connections"}
                    className={cn(
                      "rounded-lg transition-all",
                      location === "/connections"
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <Link href="/connections">
                      <Settings className="w-4 h-4" />
                      <span>Connections</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarContent>

          <div className="p-4 border-t border-border mt-auto">
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">Social Analytics</p>
                <p className="text-[10px] text-muted-foreground">Free plan</p>
              </div>
            </div>
          </div>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-md px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full w-9 h-9 hover:bg-muted/60"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" className="rounded-full text-xs" asChild>
                <Link href="/connections">Manage Connections</Link>
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
