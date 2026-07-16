"use client";

import Link from "next/link";
import { Truck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type {
  DashboardData,
  DashboardPeriod,
  DashboardShippingItem,
} from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

type ShippingData = DashboardData["shipping"];
type ShippingPeriod = Extract<DashboardPeriod, "day" | "week" | "month">;

const shippingRangeOptions: Array<{
  label: string;
  value: ShippingPeriod;
}> = [
  { label: "วันนี้", value: "day" },
  { label: "อาทิตย์นี้", value: "week" },
  { label: "เดือนนี้", value: "month" },
];

export function DashboardShippingCard({
  initialShipping,
}: {
  initialShipping: ShippingData;
}) {
  const [period, setPeriod] = useState<ShippingPeriod>("day");
  const [shipping, setShipping] = useState(initialShipping);
  const [loadingPeriod, setLoadingPeriod] = useState<ShippingPeriod | null>(
    null,
  );
  const [error, setError] = useState("");
  const periodLabel =
    shippingRangeOptions.find((option) => option.value === period)?.label ??
    "วันนี้";
  const latest = shipping.latest.slice(0, 3);

  async function selectPeriod(nextPeriod: ShippingPeriod) {
    if (nextPeriod === period || loadingPeriod) return;

    setError("");
    setLoadingPeriod(nextPeriod);

    try {
      const nextShipping = await fetchShippingPeriod(nextPeriod);
      setShipping(nextShipping);
      setPeriod(nextPeriod);
    } catch {
      setError("โหลดสถานะการจัดส่งไม่สำเร็จ");
    } finally {
      setLoadingPeriod(null);
    }
  }

  return (
    <Card className="bg-sky-50/35 shadow-none ring-sky-200 dark:bg-sky-950/10 dark:ring-sky-900/70">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <span className="grid size-8 place-items-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                <Truck className="size-4" />
              </span>
              สถานะการจัดส่ง
            </CardTitle>
            <CardDescription className="flex min-h-5 items-center gap-1.5">
              {loadingPeriod ? (
                <>
                  <Spinner className="size-3.5" />
                  กำลังโหลด
                </>
              ) : (
                periodLabel
              )}
            </CardDescription>
          </div>
          <span className="rounded-lg bg-sky-100 px-3 py-2 text-right text-sm font-black text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
            {shipping.total.toLocaleString("th-TH")} รายการ
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {shippingRangeOptions.map((option) => {
            const active = option.value === period;

            return (
              <button
                key={option.value}
                type="button"
                disabled={loadingPeriod !== null}
                onClick={() => selectPeriod(option.value)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:opacity-70",
                  active
                    ? "bg-sky-600 text-white hover:bg-sky-600"
                    : "bg-background/80 text-muted-foreground ring-1 ring-border hover:text-foreground",
                )}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4" aria-busy={loadingPeriod !== null}>
        <div className={cn("grid gap-3 transition-opacity", loadingPeriod && "opacity-60")}>
          <ShippingMetric
            count={shipping.inTransit}
            label="กำลังจัดส่ง"
            tone="sky"
          />
          <ShippingMetric
            count={shipping.delivered}
            label="ส่งสำเร็จแล้ว"
            tone="emerald"
          />
          <ShippingMetric
            count={shipping.returned}
            label="สินค้าตีกลับ"
            tone="rose"
          />
        </div>
        <div className="border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">ล่าสุด</p>
            <Link href="/orders" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              ดูออเดอร์
            </Link>
          </div>
          {latest.length ? (
            <div className="mt-3 space-y-2">
              {latest.map((item, index) => (
                <ShippingLatestCard key={item.id || `${item.orderNumber}-${index}`} item={item} />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-background/70 px-4 py-5 text-center text-sm text-muted-foreground">
              ยังไม่มีข้อมูลจัดส่งล่าสุด
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

async function fetchShippingPeriod(period: ShippingPeriod) {
  const params = new URLSearchParams({
    date: bangkokDate(),
    lowStockThreshold: "5",
    period,
    timeZone: "Asia/Bangkok",
  });
  const response = await fetch(`/api/backend/admin/dashboard?${params}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Cannot load dashboard shipping for ${period}`);
  }

  const dashboard = (await response.json()) as Partial<DashboardData>;
  return normalizeShippingSummary(dashboard.shipping);
}

function bangkokDate() {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeShippingSummary(value: unknown): ShippingData {
  const record = isRecord(value) ? value : {};
  const inTransit = numberFromKeys(record, [
    "inTransit",
    "shipping",
    "delivering",
    "inTransitCount",
    "shippingCount",
  ]);
  const delivered = numberFromKeys(record, [
    "delivered",
    "deliveryCompleted",
    "completed",
    "deliveredCount",
    "successCount",
  ]);
  const returned = numberFromKeys(record, [
    "returned",
    "return",
    "returnedCount",
    "returnCount",
    "returnToSender",
    "returnedToSender",
    "returnToSenderCount",
    "returnedToSenderCount",
    "failedShipment",
    "failedShipmentCount",
  ]);

  return {
    delivered,
    inTransit,
    latest: normalizeShippingItems(record.latest ?? record.items ?? record.recent),
    returned,
    total: numberFromKeys(record, ["total", "totalItems", "count"], inTransit + delivered + returned),
  };
}

function normalizeShippingItems(value: unknown): DashboardShippingItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 5).map((item) => {
    const record = isRecord(item) ? item : {};
    const status = String(record.status ?? record.shippingStatus ?? "");

    return {
      id: String(record.id ?? record.orderId ?? record.trackingNo ?? ""),
      orderId: stringOrNull(record.orderId ?? record.id),
      orderNumber: stringOrNull(record.orderNumber ?? record.number),
      customerName: stringOrNull(record.customerName ?? record.customer),
      carrier: stringOrNull(record.carrier ?? record.shippingCarrier ?? record.shippingChannel),
      trackingNo: stringOrNull(record.trackingNo ?? record.trackingNumber),
      status: normalizeShippingStatus(status),
      statusLabel: String(record.statusLabel ?? shippingStatusLabel(status)),
      updatedAt: stringOrNull(
        record.updatedAt ??
          record.updatedAtUtc ??
          record.shippingDate ??
          record.shippedAt ??
          record.deliveredAt ??
          record.orderDate,
      ),
    };
  });
}

function normalizeShippingStatus(status: string) {
  const normalized = status.trim().replace(/[\s-]/g, "_").toLowerCase();

  if (
    [
      "intransit",
      "in_transit",
      "shipping",
      "delivering",
      "pickedup",
      "picked_up",
      "carrier_picked_up",
      "carrier_accepted",
    ].includes(normalized)
  ) {
    return "in_transit";
  }

  if (["delivered", "completed", "success", "delivery_completed"].includes(normalized)) {
    return "delivered";
  }

  if (
    [
      "returned",
      "return",
      "failedshipment",
      "failed_shipment",
      "return_to_sender",
      "returned_to_sender",
      "rts",
    ].includes(normalized)
  ) {
    return "returned";
  }

  return normalized || status;
}

function shippingStatusLabel(status: string) {
  const normalized = normalizeShippingStatus(status);

  if (normalized === "in_transit") return "กำลังจัดส่ง";
  if (normalized === "delivered") return "ส่งสำเร็จแล้ว";
  if (normalized === "returned") return "สินค้าตีกลับ";

  return status || "ไม่ระบุสถานะ";
}

function numberFromKeys(record: UnknownRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return Number(value) || 0;
  }

  return fallback;
}

function stringOrNull(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value);
  return text ? text : null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

type UnknownRecord = Record<string, unknown>;

function ShippingMetric({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: "amber" | "emerald" | "rose" | "sky";
}) {
  const colors = shippingToneClasses(tone);

  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-lg px-4 py-3", colors.row)}>
      <p className="text-sm font-semibold">{label}</p>
      <span className={cn("rounded-full px-3 py-1 text-sm font-black", colors.badge)}>
        {count.toLocaleString("th-TH")} รายการ
      </span>
    </div>
  );
}

function ShippingLatestCard({ item }: { item: DashboardShippingItem }) {
  const colors = shippingStatusTone(item.status);

  return (
    <div className="rounded-lg bg-background/75 px-4 py-3 ring-1 ring-border/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">
            {item.orderNumber ? `#${item.orderNumber}` : item.trackingNo || "ไม่ระบุเลขออเดอร์"}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[item.customerName, item.carrier, item.trackingNo].filter(Boolean).join(" · ") || "ไม่มีรายละเอียดเพิ่มเติม"}
          </p>
        </div>
        <Badge variant="secondary" className={colors}>
          {item.statusLabel}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        อัปเดต {formatDate(item.updatedAt)}
      </p>
    </div>
  );
}

function shippingToneClasses(tone: "amber" | "emerald" | "rose" | "sky") {
  const colors = {
    amber: {
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
      row: "bg-amber-50/70 dark:bg-amber-950/15",
    },
    emerald: {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      row: "bg-emerald-50/70 dark:bg-emerald-950/15",
    },
    rose: {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
      row: "bg-rose-50/70 dark:bg-rose-950/15",
    },
    sky: {
      badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
      row: "bg-sky-50/70 dark:bg-sky-950/15",
    },
  };

  return colors[tone];
}

function shippingStatusTone(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "in_transit") {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300";
  }

  if (normalized === "delivered") {
    return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (normalized === "returned") {
    return "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300";
  }

  return "bg-muted text-muted-foreground hover:bg-muted";
}

function formatDate(value: string | null) {
  if (!value) {
    return "ยังไม่มีข้อมูล";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}
