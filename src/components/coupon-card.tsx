"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { History, LoaderCircle, MoreVertical, ScrollText, Trash2 } from "lucide-react";
import type { Coupon } from "@/lib/admin-coupons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { CouponUsageDialog } from "@/components/coupon-usage-dialog";
import { cn } from "@/lib/utils";

async function extractErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { message?: string };
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

export function CouponCard({
  coupon,
  onSelectedChange,
  selectable = false,
  selected = false,
}: {
  coupon: Coupon;
  onSelectedChange?: (checked: boolean) => void;
  selectable?: boolean;
  selected?: boolean;
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(coupon.isActive);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [error, setError] = useState("");

  const percent =
    coupon.maxTotalUsage && coupon.maxTotalUsage > 0
      ? Math.min(100, Math.round((coupon.usedCount / coupon.maxTotalUsage) * 100))
      : null;
  const couponTitle = coupon.name || coupon.code;
  const couponDescription = coupon.description.trim();
  const minimumOrderLabel =
    coupon.minOrderAmount && coupon.minOrderAmount > 0
      ? `ขั้นต่ำ ${coupon.minOrderAmount.toLocaleString()} ฿`
      : "";
  const palette = coupon.type === "free_shipping"
    ? {
        shell: "bg-emerald-100 dark:bg-emerald-950/30",
        selected: "bg-emerald-100 ring-2 ring-emerald-600 dark:bg-emerald-950/50",
        focus: "cursor-pointer hover:ring-2 hover:ring-emerald-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600",
        accent: "bg-emerald-600",
        accentHover: "hover:bg-emerald-700",
        ring: "ring-emerald-100",
        spinner: "text-emerald-600",
        shadow: "shadow-[0_14px_34px_rgba(5,150,105,0.14)]",
        buttonShadow: "shadow-[0_10px_22px_rgba(5,150,105,0.28),inset_0_2px_0_rgba(255,255,255,0.35)]",
      }
    : {
        shell: "bg-[#fee8ec] dark:bg-rose-950/30",
        selected: "bg-red-100 ring-2 ring-[#ef101a] dark:bg-red-950/50",
        focus: "cursor-pointer hover:ring-2 hover:ring-[#ef101a]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef101a]",
        accent: "bg-[#ef101a]",
        accentHover: "hover:bg-[#d90c16]",
        ring: "ring-red-100",
        spinner: "text-[#ef101a]",
        shadow: "shadow-[0_14px_34px_rgba(239,16,26,0.14)]",
        buttonShadow: "shadow-[0_10px_22px_rgba(239,16,26,0.28),inset_0_2px_0_rgba(255,255,255,0.35)]",
      };

  async function toggleActive() {
    const next = !isActive;
    setIsActive(next);
    setUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/backend/admin/coupons/${coupon.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: coupon.code,
          name: coupon.name || undefined,
          couponName: coupon.name || undefined,
          description: coupon.description || undefined,
          campaignId: coupon.campaignId ?? null,
          type: coupon.type,
          value: coupon.type === "free_shipping" ? 0 : coupon.discountValue,
          minimumSubtotal: coupon.minOrderAmount ?? 0,
          maximumDiscount: coupon.maxDiscountAmount ?? null,
          startsAtUtc: coupon.startDate ?? null,
          endsAtUtc: coupon.endDate ?? null,
          canCombineWithFlashSale: coupon.combinableWithFlashSale,
          canStackWithPromotions: coupon.canStackWithPromotions,
          canStackWithCoupons: coupon.canStackWithCoupons,
          maximumTotalUses: coupon.maxTotalUsage ?? null,
          maximumUsesPerCustomer: coupon.maxUsagePerCustomer ?? null,
          isActive: next,
          scopes: coupon.scopes ?? [],
          customerScopes: coupon.customerScopes ?? [],
          conditions: (coupon.conditions ?? []).filter(
            (condition) =>
              condition.type === "sales_channel" || condition.type === "shipping_channel",
          ),
        }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res, "อัปเดตสถานะไม่สำเร็จ"));
      router.refresh();
    } catch (err) {
      setIsActive(!next);
      setError(err instanceof Error ? err.message : "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`ต้องการลบคูปอง "${coupon.code}" ใช่หรือไม่?`)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/backend/admin/coupons/${coupon.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res, "ลบคูปองไม่สำเร็จ"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบคูปองไม่สำเร็จ");
      setDeleting(false);
    }
  }

  function handleCardSelection(event: React.MouseEvent<HTMLElement>) {
    if (!selectable) return;
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, [role='menuitem']")) return;
    onSelectedChange?.(!selected);
  }

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (!selectable || (event.key !== "Enter" && event.key !== " ")) return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    onSelectedChange?.(!selected);
  }

  return (
    <Card
      role={selectable ? "checkbox" : undefined}
      aria-checked={selectable ? selected : undefined}
      aria-label={selectable ? `เลือกคูปอง ${coupon.code}` : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={handleCardSelection}
      onKeyDown={handleCardKeyDown}
      className={cn(
        "relative gap-0 rounded-2xl p-2 ring-0 transition-all",
        palette.shell,
        selectable && palette.focus,
        selected && palette.selected,
      )}
    >
      {deleting ? (
        <div className="absolute inset-0 z-30 grid place-items-center rounded-2xl bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <LoaderCircle className={cn("size-5 animate-spin", palette.spinner)} />
            กำลังลบคูปอง...
          </div>
        </div>
      ) : null}
      <div
        className={cn("relative flex min-h-48 overflow-hidden rounded-[26px] bg-background", palette.shadow)}
        style={{
          WebkitMaskImage:
            "radial-gradient(circle 18px at left 50%, transparent 0 17.5px, #000 18px)",
          maskImage:
            "radial-gradient(circle 18px at left 50%, transparent 0 17.5px, #000 18px)",
        }}
      >
        <div className={cn("relative grid w-[35%] min-w-24 shrink-0 place-items-center px-2 py-5 text-center text-white", palette.accent)}>
          <span className="absolute right-0 top-0 h-full w-px bg-white/35" />
          <div className="min-w-0">
            <p className="text-[36px] font-black leading-none">
              {coupon.type === "free_shipping"
                ? "ส่งฟรี"
                : coupon.type === "percentage"
                ? `${coupon.discountValue.toLocaleString()}%`
                : `฿${coupon.discountValue.toLocaleString()}`}
            </p>
            <p className="mt-3 truncate text-[15px] font-black leading-none">
              {minimumOrderLabel}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="space-y-2">
              <h2 className="line-clamp-2 text-xl font-black leading-tight text-[#1f1f25]">
                {couponTitle}
              </h2>
              {couponDescription ? (
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-muted-foreground">
                  {couponDescription}
                </p>
              ) : null}
              <p className="truncate text-sm font-black tracking-[0.08em] text-muted-foreground">
                CODE <span className="font-mono text-[#1f1f25]">{coupon.code}</span>
              </p>
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">
              ใช้แล้ว {coupon.usedCount.toLocaleString()}
              {coupon.maxTotalUsage
                ? ` / ${coupon.maxTotalUsage.toLocaleString()} สิทธิ์`
                : " ครั้ง"}
            </p>
            {percent !== null ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", palette.accent)}
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : null}
            {error ? (
              <p className="mt-2 line-clamp-2 text-xs font-medium text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-2">
            <Link
              href={`/coupons/${coupon.id}/edit`}
              className={cn(
                "grid size-16 place-items-center rounded-full text-sm font-black text-white ring-4 transition-colors",
                palette.accent,
                palette.accentHover,
                palette.buttonShadow,
                palette.ring,
              )}
            >
              แก้ไข
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-xs" aria-label="เมนูคูปอง" />}
              >
                <MoreVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="justify-between gap-3"
                  disabled={updating}
                  onClick={toggleActive}
                >
                  <span>{updating ? "กำลังอัปเดต..." : isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
                  <Switch
                    checked={isActive}
                    disabled={updating}
                    aria-label={isActive ? "ปิดใช้งานคูปอง" : "เปิดใช้งานคูปอง"}
                    className="pointer-events-none"
                  />
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  onClick={() => setUsageOpen(true)}
                >
                  <History />
                  ดูประวัติการใช้
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/coupons/${coupon.id}/edit#activity-log`)}
                >
                  <ScrollText />
                  Activity Log
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                  {deleting ? "กำลังลบ..." : "ลบคูปอง"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <CouponUsageDialog
        couponId={coupon.id}
        couponCode={coupon.code}
        open={usageOpen}
        onOpenChange={setUsageOpen}
      />
    </Card>
  );
}
