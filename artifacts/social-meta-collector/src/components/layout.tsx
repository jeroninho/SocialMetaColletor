import React from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart, 
  LayoutDashboard, 
  Settings, 
  Youtube, 
  Instagram, 
  Facebook,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarProvider
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full bg-muted/30">
        <Sidebar className="border-r border-border bg-sidebar">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-border">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-sidebar-foreground">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground">
                <BarChart className="w-5 h-5" />
              </div>
              <span>MetaCollector</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/youtube"}>
                  <Link href="/youtube">
                    <Youtube className="w-4 h-4 text-[#FF0000]" />
                    <span>YouTube</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/instagram"}>
                  <Link href="/instagram">
                    <Instagram className="w-4 h-4 text-[#E1306C]" />
                    <span>Instagram</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/facebook"}>
                  <Link href="/facebook">
                    <Facebook className="w-4 h-4 text-[#1877F2]" />
                    <span>Facebook</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/reports"}>
                  <Link href="/reports">
                    <BarChart className="w-4 h-4" />
                    <span>Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <div className="mt-auto pt-8">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/login"}>
                    <Link href="/login">
                      <Settings className="w-4 h-4" />
                      <span>Connections</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card">
            <h1 className="text-xl font-semibold capitalize">
              {location === "/" ? "Dashboard" : location.slice(1)}
            </h1>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Manage Connections</Link>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-8 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
