"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", short: "DB" },
  { href: "/orders", label: "Orders", short: "OR", badge: "8" },
  { href: "/products", label: "Products", short: "PR" },
  { href: "/integrations/zort", label: "ZORT Sync", short: "ZS" },
  { href: "/coupons", label: "Coupons", short: "CP" },
  { href: "/customers", label: "Customers", short: "CU" },
  { href: "/settings", label: "Settings", short: "ST" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px]">
      <aside className="hidden w-72 shrink-0 border-r border-red-100/80 bg-white/85 px-5 py-6 shadow-[20px_0_60px_rgba(190,9,14,0.06)] backdrop-blur-xl lg:block">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-600 text-lg font-black text-white shadow-lg shadow-red-600/25">
            PP
          </span>
          <span>
            <span className="block text-lg font-black text-red-600">
              PonPon Admin
            </span>
            <span className="block text-xs font-semibold text-zinc-500">
              Store management
            </span>
          </span>
        </Link>

        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                  active
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "text-zinc-600 hover:bg-red-50 hover:text-red-600"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl text-[10px] font-black ${
                    active ? "bg-white/18" : "bg-red-50 text-red-600"
                  }`}
                >
                  {item.short}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      active ? "bg-white/20" : "bg-red-600 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-3xl bg-[#fff5f3] p-4">
          <p className="text-xs font-black text-red-600">หน้าร้านออนไลน์</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            เชื่อมข้อมูลจำลองกับ PonPon Ecommerce
          </p>
          <a
            href="http://localhost:3100"
            className="mt-3 inline-flex rounded-full bg-white px-3 py-2 text-xs font-black text-red-600 shadow-sm"
          >
            เปิดหน้าร้าน
          </a>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-red-100/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-600 text-xs font-black text-white">
                PP
              </span>
              <span className="font-black text-red-600">PonPon Admin</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600 sm:inline-flex">
                ร้านเปิดรับออเดอร์
              </span>
              <button className="grid h-10 w-10 place-items-center rounded-full border border-red-100 bg-white text-xs font-black text-red-600 shadow-sm">
                2
              </button>
              <button className="flex items-center gap-2 rounded-full border border-red-100 bg-white py-1.5 pl-1.5 pr-3 shadow-sm">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-red-600 text-xs font-black text-white">
                  A
                </span>
                <span className="hidden text-xs font-black sm:inline">
                  Admin
                </span>
              </button>
            </div>
          </div>

          <nav className="no-scrollbar mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${
                    active
                      ? "bg-red-600 text-white"
                      : "bg-red-50 text-zinc-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </section>
    </div>
  );
}
