"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronUp,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/orders", label: "ออเดอร์", icon: ShoppingCart, badge: "8" },
  { href: "/products", label: "สินค้า", icon: Package },
  { href: "/integrations/zort", label: "ซิงก์ ZORT", icon: RefreshCw },
  { href: "/home-slides", label: "สไลด์หน้าแรก", icon: SlidersHorizontal },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

const marketingItems = [
  { href: "/coupons", label: "คูปองส่วนลด" },
  { href: "/coupons", label: "โปรโมชั่น" },
  { href: "/flash-sale", label: "แฟลชเซล" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(true);
  const fullBleed = pathname === "/integrations/zort";
  const marketingActive = marketingItems.some((item) =>
    pathname.startsWith(item.href),
  );

  if (pathname === "/login") {
    return <>{children}</>;
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/backend/auth/logout", { method: "POST" });
    } finally {
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  render={<Link href="/" />}
                  tooltip="PonPon Admin"
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/20 text-xs font-black text-white">
                    PP
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">PonPon Admin</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      จัดการร้านค้า
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={active}
                          tooltip={item.label}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {item.badge ? (
                          <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      onClick={() => setMarketingOpen((open) => !open)}
                      isActive={marketingActive}
                      tooltip="การตลาด"
                    >
                      <Megaphone />
                      <span>การตลาด</span>
                      <ChevronUp
                        className={`ml-auto size-4 transition-transform ${
                          marketingOpen ? "" : "rotate-180"
                        }`}
                      />
                    </SidebarMenuButton>

                    {marketingOpen ? (
                      <SidebarMenuSub>
                        {marketingItems.map((item) => {
                          const active =
                            item.label !== "โปรโมชั่น" &&
                            pathname.startsWith(item.href);

                          return (
                            <SidebarMenuSubItem key={`${item.href}-${item.label}`}>
                              <SidebarMenuSubButton
                                render={<Link href={item.href} />}
                                isActive={active}
                              >
                                <span>{item.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<a href="http://localhost:3100" target="_blank" rel="noreferrer" />}
                      tooltip="เปิดหน้าร้าน"
                    >
                      <ExternalLink />
                      <span>เปิดหน้าร้าน</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Admin"
                  onClick={logout}
                  disabled={loggingOut}
                >
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-black text-white">
                    A
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">ผู้ดูแล</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      ผู้ดูแลระบบ
                    </span>
                  </div>
                  <LogOut className="ml-auto size-4 shrink-0 text-sidebar-foreground/60" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-end gap-2">
              <span className="hidden rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 sm:inline-flex">
                ร้านเปิดรับออเดอร์
              </span>
              <ThemeToggle />
            </div>
          </header>

          <div className={fullBleed ? "flex-1" : "p-4 sm:p-6"}>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
