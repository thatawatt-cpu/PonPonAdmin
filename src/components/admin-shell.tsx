"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/orders", label: "ออเดอร์", icon: ShoppingCart },
  { href: "/products", label: "สินค้า", icon: Package },
  { href: "/reviews", label: "รีวิว", icon: MessageSquareText },
  { href: "/integrations/zort", label: "ซิงก์ ZORT", icon: RefreshCw },
  { href: "/home-slides", label: "สไลด์หน้าแรก", icon: SlidersHorizontal },
  { href: "/customers", label: "ลูกค้า", icon: Users },
];

const marketingItems = [
  { href: "/promotions", label: "Promotions" },
  { href: "/coupons", label: "คูปองส่วนลด" },
  { href: "/coupon-campaigns", label: "Coupon Campaigns" },
  { href: "/flash-sale", label: "Flash Sale" },
];

const breadcrumbLabels: Record<string, string> = {
  customers: "ลูกค้า",
  coupons: "คูปองส่วนลด",
  "coupon-campaigns": "Coupon Campaigns",
  "bulk-generate-jobs": "ประวัติการสร้างคูปอง",
  edit: "แก้ไข",
  "flash-sale": "Flash Sale",
  "home-slides": "สไลด์หน้าแรก",
  integrations: "การเชื่อมต่อ",
  new: "สร้างใหม่",
  orders: "ออเดอร์",
  products: "สินค้า",
  promotions: "Promotions",
  reviews: "รีวิว",
  settings: "ตั้งค่า",
  zort: "ZORT",
};

const linkableBreadcrumbHrefs = new Set([
  "/",
  "/coupon-campaigns",
  "/coupons",
  "/coupons/bulk-generate-jobs",
  "/customers",
  "/flash-sale",
  "/home-slides",
  "/integrations/zort",
  "/orders",
  "/products",
  "/promotions",
  "/reviews",
  "/settings",
]);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuRect, setUserMenuRect] = useState<DOMRect | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const fullBleed = pathname === "/integrations/zort";
  const marketingActive = marketingItems.some((item) =>
    pathname.startsWith(item.href),
  );

  if (pathname === "/login") {
    return <>{children}</>;
  }

  async function logout() {
    setUserMenuOpen(false);
    setUserMenuRect(null);
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
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-foreground text-xs font-black text-background shadow-sm">
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
                          <item.icon strokeWidth={1.5} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
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
                      <Megaphone strokeWidth={1.5} />
                      <span>การตลาด</span>
                      <ChevronUp
                        strokeWidth={1.5}
                        className={`ml-auto size-4 transition-transform ${
                          marketingOpen ? "" : "rotate-180"
                        }`}
                      />
                    </SidebarMenuButton>

                    {marketingOpen ? (
                      <SidebarMenuSub>
                        {marketingItems.map((item) => {
                          const active = pathname.startsWith(item.href);

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

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href="/settings" />}
                      isActive={pathname.startsWith("/settings")}
                      tooltip="ตั้งค่า"
                    >
                      <Settings strokeWidth={1.5} />
                      <span>ตั้งค่า</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <div>
                  {userMenuOpen && userMenuRect && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div
                        className="fixed z-50 min-w-48 overflow-hidden rounded-lg border border-border bg-popover shadow-md"
                        style={{
                          bottom: window.innerHeight - userMenuRect.top + 6,
                          left: userMenuRect.left,
                          width: userMenuRect.width,
                        }}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
                            A
                          </div>
                          <div className="grid text-sm leading-tight">
                            <span className="font-semibold">ผู้ดูแล</span>
                            <span className="text-xs text-muted-foreground">ผู้ดูแลระบบ</span>
                          </div>
                        </div>
                        <div className="h-px bg-border" />
                        <button
                          type="button"
                          disabled={loggingOut}
                          onClick={logout}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <LogOut strokeWidth={1.5} className="size-4" />
                          {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
                        </button>
                      </div>
                    </>
                  )}
                  <div ref={footerRef}>
                  <SidebarMenuButton
                    size="lg"
                    tooltip="Admin"
                    onClick={() => {
                      const rect = footerRef.current?.getBoundingClientRect() ?? null;
                      setUserMenuRect(rect);
                      setUserMenuOpen((v) => !v);
                    }}
                  >
                    <div className="relative size-8 shrink-0">
                      <div className="grid size-8 place-items-center rounded-full bg-foreground text-xs font-bold text-background shadow-sm">
                        A
                      </div>
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sidebar bg-emerald-400" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">ผู้ดูแล</span>
                      <span className="truncate text-xs text-sidebar-foreground/60">ผู้ดูแลระบบ</span>
                    </div>
                    <ChevronUp
                      strokeWidth={1.5}
                      className={`ml-auto size-4 shrink-0 text-sidebar-foreground/60 transition-transform ${userMenuOpen ? "" : "rotate-180"}`}
                    />
                  </SidebarMenuButton>
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-end gap-2">
              <span className="hidden rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex dark:bg-emerald-950 dark:text-emerald-300">
                ร้านเปิดรับออเดอร์
              </span>
              <ThemeToggle />
            </div>
          </header>

          <div className={fullBleed ? "flex-1" : "p-4 sm:p-6"}>
            <div className={fullBleed ? "border-b border-border px-4 py-3 sm:px-6" : "mb-5"}>
              <AdminBreadcrumb pathname={pathname} />
            </div>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function AdminBreadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  const items =
    segments.length === 0
      ? [{ href: "/", label: "แดชบอร์ด", linkable: false }]
      : segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          return {
            href,
            label: getBreadcrumbLabel(segment, segments, index),
            linkable: linkableBreadcrumbHrefs.has(href),
          };
        });

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs">
        {items[0]?.href !== "/" ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">แดชบอร์ด</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        ) : null}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <div className="contents" key={item.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : !item.linkable ? (
                  <span className="font-medium text-muted-foreground">{item.label}</span>
                ) : (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function getBreadcrumbLabel(segment: string, segments: string[], index: number) {
  if (segment === "edit") return "แก้ไข";
  if (segment === "bulk-generate-jobs") return "ประวัติการสร้างคูปอง";
  if (index > 0 && segments[index - 1] === "orders") return "รายละเอียดออเดอร์";
  if (index > 0 && segment !== "new" && segment !== "edit") return "รายละเอียด";
  return breadcrumbLabels[segment] ?? decodeURIComponent(segment);
}
