"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import type { PromotionUsage } from "@/lib/admin-promotions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

async function getPromotionUsages(promotionId: string) {
  const response = await fetch(`/api/backend/admin/promotions/${promotionId}/usages`);
  if (!response.ok) throw new Error("fetch failed");
  return (await response.json()) as PromotionUsage[];
}

export function PromotionUsageDialog({
  open,
  onOpenChange,
  promotionId,
  promotionName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotionId: string;
  promotionName: string;
}) {
  const [usages, setUsages] = useState<PromotionUsage[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    void getPromotionUsages(promotionId)
      .then((data) => {
        if (active) setUsages(data);
      })
      .catch(() => {
        if (active) setError("โหลดประวัติการใช้ Promotion ไม่สำเร็จ");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, promotionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            ประวัติการใช้ {promotionName}
          </DialogTitle>
          <DialogDescription>
            รายการออเดอร์ที่ได้รับส่วนลดอัตโนมัตินี้
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !usages || usages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีการใช้ Promotion นี้
          </p>
        ) : (
          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {usages.map((usage) => (
              <div key={usage.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{usage.orderNumber}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {usage.customerName} · {formatDate(usage.usedAtUtc)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-green-600">
                  -฿{usage.discountAmount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
