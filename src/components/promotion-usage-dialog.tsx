"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, History } from "lucide-react";
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

type UnknownRecord = Record<string, unknown>;

async function getPromotionUsages(promotionId: string) {
  const response = await fetch(`/api/backend/admin/promotions/${promotionId}/usages`);
  if (!response.ok) throw new Error("fetch failed");
  const data = await response.json();
  return usageArray(data).map(normalizePromotionUsage);
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
  const totalDiscount = usages?.reduce((total, usage) => total + usage.discountAmount, 0) ?? 0;

  useEffect(() => {
    if (!open) return;
    let active = true;

    void Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true);
          setError("");
        }

        return getPromotionUsages(promotionId);
      })
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
      <DialogContent className="max-w-4xl">
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
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !usages || usages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
            <p className="text-sm font-semibold">ยังไม่มีการใช้ Promotion นี้</p>
            <p className="mt-1 text-sm text-muted-foreground">
              เมื่อมีออเดอร์ใช้ส่วนลด ระบบจะแสดงเลขออเดอร์ ลูกค้า วันที่ใช้ และยอดส่วนลดที่นี่
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="sticky top-0 z-10 grid gap-3 bg-background pb-2 sm:grid-cols-3">
              <UsageSummary label="จำนวนครั้งที่ใช้" value={`${usages.length.toLocaleString("th-TH")} ครั้ง`} />
              <UsageSummary label="ส่วนลดรวม" value={`-฿${formatMoney(totalDiscount)}`} tone="success" />
              <UsageSummary label="Promotion" value={promotionName} />
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border">
              <div className="sticky top-0 z-10 hidden grid-cols-[minmax(12rem,1fr)_minmax(10rem,1fr)_7rem_6rem_6.5rem] gap-4 border-b border-border bg-muted/60 px-4 py-2 text-xs font-semibold text-muted-foreground md:grid">
                <span>ออเดอร์</span>
                <span>ลูกค้า</span>
                <span className="text-right">ยอดออเดอร์</span>
                <span className="text-right">ส่วนลด</span>
                <span className="text-right">จัดการ</span>
              </div>
              {usages.map((usage) => {
                const usedAt = usage.usedAt ?? usage.usedAtUtc ?? "";

                return (
                  <div
                    key={usage.id}
                    className="border-b border-border bg-card px-4 py-3 last:border-b-0"
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(10rem,1fr)_7rem_6rem_6.5rem] md:items-center md:gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{usage.orderNumber || "-"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          ใช้เมื่อ {formatDate(usedAt)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {usage.customerName || "-"}
                        </p>
                        {usage.customerPhone ? (
                          <p className="mt-1 truncate text-xs text-muted-foreground">{usage.customerPhone}</p>
                        ) : null}
                      </div>

                      <p className="text-sm font-semibold md:text-right">
                        <span className="mr-2 text-xs font-normal text-muted-foreground md:hidden">ยอดออเดอร์</span>
                        ฿{formatMoney(usage.orderTotal ?? 0)}
                      </p>
                      <p className="text-sm font-bold text-green-600 md:text-right">
                        <span className="mr-2 text-xs font-normal text-muted-foreground md:hidden">ส่วนลด</span>
                        -฿{formatMoney(usage.discountAmount)}
                      </p>
                      {usage.orderId ? (
                        <Link
                          href={`/orders/${usage.orderId}`}
                          className="inline-flex min-h-8 items-center gap-1 justify-self-start whitespace-nowrap rounded-md px-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:justify-self-end"
                        >
                          ดูออเดอร์
                          <ArrowRight className="size-3.5" />
                        </Link>
                      ) : (
                        <span className="hidden text-right text-xs text-muted-foreground md:block">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function normalizePromotionUsage(value: unknown): PromotionUsage {
  const record = toRecord(value);
  const order = toRecord(record.order ?? record.Order);
  const customer = toRecord(record.customer ?? record.Customer);

  return {
    id: stringValue(record, "id", "Id", "usageId", "UsageId") || crypto.randomUUID(),
    orderId:
      stringValue(record, "orderId", "OrderId", "orderGuid", "OrderGuid") ||
      stringValue(order, "id", "Id"),
    orderNumber:
      stringValue(record, "orderNumber", "OrderNumber", "orderNo", "OrderNo", "number", "Number") ||
      stringValue(order, "orderNumber", "OrderNumber", "orderNo", "OrderNo", "number", "Number"),
    customerName:
      stringValue(record, "customerName", "CustomerName", "customerFullName", "CustomerFullName") ||
      stringValue(customer, "name", "Name", "fullName", "FullName", "customerName", "CustomerName"),
    customerPhone:
      stringValue(record, "customerPhone", "CustomerPhone", "phone", "Phone", "mobile", "Mobile") ||
      stringValue(customer, "phone", "Phone", "mobile", "Mobile", "tel", "Tel"),
    orderTotal:
      numberValue(record, "orderTotal", "OrderTotal", "total", "Total", "grandTotal", "GrandTotal") ??
      numberValue(order, "orderTotal", "OrderTotal", "total", "Total", "grandTotal", "GrandTotal"),
    promotionName: stringValue(record, "promotionName", "PromotionName", "name", "Name"),
    discountAmount: numberValue(record, "discountAmount", "DiscountAmount", "amount", "Amount") ?? 0,
    usedAt:
      stringValue(record, "usedAt", "UsedAt", "usedDate", "UsedDate", "appliedAt", "AppliedAt") ||
      stringValue(record, "createdAt", "CreatedAt"),
    usedAtUtc:
      stringValue(record, "usedAtUtc", "UsedAtUtc", "appliedAtUtc", "AppliedAtUtc") ||
      stringValue(record, "createdAtUtc", "CreatedAtUtc"),
  };
}

function usageArray(value: unknown) {
  if (Array.isArray(value)) return value;

  const record = toRecord(value);
  const items = record.items ?? record.Items ?? record.usages ?? record.Usages ?? record.data ?? record.Data;
  return Array.isArray(items) ? items : [];
}

function UsageSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "success"
            ? "mt-1 truncate text-sm font-bold text-green-600"
            : "mt-1 truncate text-sm font-bold"
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
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

function toRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function stringValue(record: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}

function numberValue(record: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}
