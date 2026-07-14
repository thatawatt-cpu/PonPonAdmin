"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Tag, CheckCircle, XCircle, Clock, Settings } from "lucide-react";
import { hasPermission, useAdminSession } from "@/components/admin-permissions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminProduct } from "@/lib/admin-products";

export type ProductGroup = {
  groupSku: string;
  products: AdminProduct[];
};

function getGroupName(name: string) {
  return name.replace(/\s*\(สี[^)]*\)\s*$/u, "").trim();
}

export function ProductGroupCard({ group }: { group: ProductGroup }) {
  const { user } = useAdminSession();
  const canManage = hasPermission(user, "products.manage");
  const primary = group.products[0];
  const variantImages = primary.variantImages.length
    ? primary.variantImages
    : Array.from(
        new Set(
          group.products
            .map((product) => product.image)
            .filter((image) => image && !image.includes("/images/products/cookies.png")),
        ),
      );
  const isVariantGroup = variantImages.length > 1;
  const totalStock = group.products.reduce(
    (sum, product) => sum + product.stock,
    0,
  );
  const totalSold = group.products.reduce((sum, p) => sum + p.sold, 0);
  const prices = group.products.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const syncStatus = group.products.some((p) => p.syncStatus === "error")
    ? "error"
    : group.products.some((p) => p.syncStatus === "pending")
      ? "pending"
      : "synced";

  const [selectedIndex, setSelectedIndex] = useState(0);
  const displayImage = (isVariantGroup ? variantImages[selectedIndex] : null) ?? primary.image;

  return (
    <Card className="h-full overflow-hidden">
      <div className="relative aspect-[4/3] bg-white dark:bg-zinc-900">
        <Image
          src={displayImage}
          alt={primary.name}
          fill
          className="object-contain object-top px-4 pb-4 pt-3"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-border backdrop-blur-sm dark:bg-zinc-800/90">
          <Package className="size-3.5 text-muted-foreground" />
          {totalStock === 0 ? "หมดแล้ว" : `เหลือ ${totalStock} ชิ้น`}
        </span>
      </div>

      {isVariantGroup && (
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <span className="text-[11px] font-bold text-muted-foreground">{variantImages.length} ตัวเลือก</span>
          <div className="flex gap-2">
            {variantImages.slice(0, 6).map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`relative size-9 overflow-hidden rounded-lg bg-muted transition-shadow ${
                  i === selectedIndex ? "ring-[1.5px] ring-primary" : "ring-1 ring-border/60"
                }`}
              >
                <Image src={src} alt="" fill className="object-contain p-0.5" sizes="36px" />
              </button>
            ))}
            {variantImages.length > 6 && (
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-[9px] font-black text-muted-foreground ring-1 ring-border/60">
                +{variantImages.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      <CardContent className="flex flex-1 flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Tag className="size-3 shrink-0" />
            {primary.category}
          </span>
          <span className={`flex shrink-0 items-center gap-1 text-[11px] font-semibold ${
            syncStatus === "synced"
              ? "text-emerald-600 dark:text-emerald-400"
              : syncStatus === "error"
                ? "text-rose-600 dark:text-rose-400"
                : "text-amber-600 dark:text-amber-400"
          }`}>
            {syncStatus === "synced" ? (
              <CheckCircle className="size-3 shrink-0" />
            ) : syncStatus === "error" ? (
              <XCircle className="size-3 shrink-0" />
            ) : (
              <Clock className="size-3 shrink-0" />
            )}
            {syncStatus === "synced" ? "ซิงก์แล้ว" : syncStatus === "error" ? "มีปัญหา" : "รอซิงก์"}
          </span>
        </div>

        <h2 className="mt-1.5 font-bold leading-snug">{getGroupName(primary.name)}</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">SKU: {group.groupSku}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-2xl font-black">
              {minPrice === maxPrice
                ? `฿${minPrice.toLocaleString()}`
                : `฿${minPrice.toLocaleString()} – ฿${maxPrice.toLocaleString()}`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              ขายแล้ว {totalSold.toLocaleString()} ชิ้น
            </p>
          </div>
          {canManage ? (
            <Link href={`/products/${primary.parentProductId ?? primary.id}/edit`} className={buttonVariants({ size: "sm" })}>
              <Settings className="size-3.5" />
              {isVariantGroup ? "จัดการ" : "แก้ไข"}
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
