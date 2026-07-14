"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  AdminSessionProvider,
  canAccessAdminPath,
  firstAccessiblePath,
  hasAnyPermission,
  hasPermission,
  type AdminPermission,
  type AdminSessionUser,
} from "@/components/admin-permissions";
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

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: AdminPermission;
}> = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard, permission: "dashboard.read" },
  { href: "/orders", label: "ออเดอร์", icon: ShoppingCart, permission: "orders.read" },
  { href: "/products", label: "สินค้า", icon: Package, permission: "products.read" },
  { href: "/reviews", label: "รีวิว", icon: MessageSquareText, permission: "reviews.manage" },
  { href: "/integrations/zort", label: "ซิงก์ ZORT", icon: RefreshCw, permission: "integrations.read" },
  { href: "/home-slides", label: "สไลด์หน้าแรก", icon: SlidersHorizontal, permission: "marketing.manage" },
  { href: "/customers", label: "ลูกค้า", icon: Users, permission: "customers.read" },
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
  const [currentAdmin, setCurrentAdmin] = useState<AdminSessionUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuRect, setUserMenuRect] = useState<DOMRect | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const fullBleed = pathname === "/integrations/zort";
  const marketingActive = marketingItems.some((item) =>
    pathname.startsWith(item.href),
  );
  const adminName = currentAdmin?.displayName?.trim() || "ผู้ดูแล";
  const adminRole = currentAdmin?.role || "ผู้ดูแลระบบ";
  const adminInitials = getInitials(adminName);

  useEffect(() => {
    if (pathname === "/login") return;
    const controller = new AbortController();

    async function loadCurrentAdmin() {
      try {
        const response = await fetch("/api/backend/admin/auth/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/login");
          router.refresh();
          return;
        }

        if (!response.ok) return;
        setCurrentAdmin((await response.json()) as AdminSessionUser);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setProfileLoading(false);
      }
    }

    void loadCurrentAdmin();
    window.addEventListener("admin-profile-updated", loadCurrentAdmin);

    return () => {
      controller.abort();
      window.removeEventListener("admin-profile-updated", loadCurrentAdmin);
    };
  }, [pathname, router]);

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
    <AdminSessionProvider loading={profileLoading} user={currentAdmin}>
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
                  {navItems.filter((item) => hasPermission(currentAdmin, item.permission)).map((item) => {
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

                  {hasPermission(currentAdmin, "marketing.manage") ? <SidebarMenuItem>
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
                  </SidebarMenuItem> : null}

                  {hasAnyPermission(currentAdmin, ["settings.manage", "integrations.read", "admin_users.read"]) ? <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href="/settings" />}
                      isActive={pathname.startsWith("/settings")}
                      tooltip="ตั้งค่า"
                    >
                      <Settings strokeWidth={1.5} />
                      <span>ตั้งค่า</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem> : null}
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
                            {adminInitials}
                          </div>
                          <div className="grid min-w-0 text-sm leading-tight">
                            <span className="truncate font-semibold">{adminName}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {currentAdmin?.email || adminRole}
                            </span>
                            {currentAdmin?.email ? (
                              <span className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                                {adminRole}
                              </span>
                            ) : null}
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
                        {adminInitials}
                      </div>
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-sidebar bg-emerald-400" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{adminName}</span>
                      <span className="truncate text-xs text-sidebar-foreground/60">{adminRole}</span>
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
            {profileLoading ? (
              <PagePermissionLoading />
            ) : canAccessAdminPath(currentAdmin, pathname) ? (
              children
            ) : (
              <PermissionDenied user={currentAdmin} />
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
    </AdminSessionProvider>
  );
}

function PagePermissionLoading() {
  return (
    <div className="space-y-4" aria-label="กำลังตรวจสอบสิทธิ์">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

function PermissionDenied({ user }: { user: AdminSessionUser | null }) {
  const fallbackPath = firstAccessiblePath(user);
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-amber-100 text-amber-700">
        <Settings className="size-5" />
      </div>
      <h1 className="mt-4 text-xl font-black">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        บัญชีของคุณยังไม่ได้รับสิทธิ์สำหรับหน้านี้ กรุณาติดต่อ Owner เพื่อขอสิทธิ์เพิ่มเติม
      </p>
      {fallbackPath ? (
        <Link href={fallbackPath} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          กลับไปหน้าที่ใช้งานได้
        </Link>
      ) : null}
    </div>
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

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "A";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
