"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { History, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Promotion } from "@/lib/admin-promotions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PromotionUsageDialog } from "@/components/promotion-usage-dialog";

export function PromotionCard({ promotion }: { promotion: Promotion }) {
  const router = useRouter();
  const [usageOpen, setUsageOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deletePromotion() {
    if (!window.confirm(`ต้องการลบ Promotion "${promotion.name}" ใช่หรือไม่?`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/backend/admin/promotions/${promotion.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "ลบ Promotion ไม่สำเร็จ"));
      }
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "ลบ Promotion ไม่สำเร็จ",
      );
      setDeleting(false);
    }
  }

  return (
    <Card className="overflow-hidden transition-colors hover:bg-muted/20">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={promotion.isActive ? "default" : "secondary"}>
                {promotion.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              </Badge>
              <Badge variant="outline">{typeLabel(promotion.type)}</Badge>
              {promotion.campaignName ? (
                <Badge variant="secondary">{promotion.campaignName}</Badge>
              ) : null}
            </div>
            <Link
              href={`/promotions/${promotion.id}`}
              className="mt-3 block truncate text-lg font-black hover:underline"
            >
              {promotion.name}
            </Link>
            {promotion.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {promotion.description}
              </p>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="เมนู Promotion" />}
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setUsageOpen(true)}>
                <History />
                ดูประวัติการใช้
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/promotions/${promotion.id}/edit`)}>
                <Pencil />
                แก้ไข
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={deleting}
                onClick={deletePromotion}
              >
                <Trash2 />
                {deleting ? "กำลังลบ..." : "ลบ Promotion"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          <MiniStat label="ส่วนลด" value={discountLabel(promotion)} />
          <MiniStat label="ใช้แล้ว" value={promotion.usedCount.toLocaleString()} />
          <MiniStat label="Priority" value={promotion.priority.toLocaleString()} />
        </div>
        {error ? (
          <p className="border-t border-border px-4 py-3 text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
      <PromotionUsageDialog
        open={usageOpen}
        onOpenChange={setUsageOpen}
        promotionId={promotion.id}
        promotionName={promotion.name}
      />
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="truncate text-sm font-black">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function typeLabel(type: Promotion["type"]) {
  const labels: Record<Promotion["type"], string> = {
    auto_discount: "ส่วนลดอัตโนมัติ",
    flash_sale: "Flash Sale",
    free_shipping: "ส่งฟรี",
    special_price: "ราคาพิเศษ",
    bundle: "Bundle",
    buy_x_get_y: "Buy X Get Y",
  };
  return labels[type] ?? type;
}

function discountLabel(promotion: Promotion) {
  if (promotion.discountType === "free_shipping") return "ส่งฟรี";
  if (promotion.discountType === "percentage") return `${promotion.discountValue.toLocaleString()}%`;
  if (promotion.discountType === "special_price") return `฿${promotion.discountValue.toLocaleString()}`;
  return `฿${promotion.discountValue.toLocaleString()}`;
}

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}
