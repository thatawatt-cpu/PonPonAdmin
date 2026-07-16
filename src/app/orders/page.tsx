"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { hasPermission, useAdminSession } from "@/components/admin-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { OrderCancelDialog } from "@/components/order-cancel-dialog";
import { cn } from "@/lib/utils";

type OrderListItem = {
  id: string;
  zortOrderId: number;
  number: string;
  customerName: string;
  customerPhone: string;
  status: string;
  paymentStatus: string;
  amount: number;
  paymentAmount: number;
  shippingChannel: string | null;
  trackingNo: string | null;
  returnRequestStatus: string | null;
  refundRequestStatus: string | null;
  orderDate: string;
  salesChannel: string;
  lastSyncedAt: string;
};

type SyncResult = {
  totalFetched: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
};

type OrdersPageData = {
  items: OrderListItem[];
  totalItems: number | null;
};

const PAGE_SIZE = 20;

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "packing"
  | "packed"
  | "shipped"
  | "completed"
  | "cancelled"
  | "refund_requested"
  | "refunded";

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "รอชำระเงิน",
  paid: "รอจัดเตรียม",
  packing: "กำลังแพ็ก",
  packed: "แพ็กแล้ว",
  shipped: "จัดส่งแล้ว",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
  refund_requested: "ขอคืนเงิน/คืนสินค้า",
  refunded: "คืนเงินแล้ว",
};
const PACKING_TAB_LABEL = "รอจัดเตรียม/กำลังแพ็ก";

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

type OrderFilter = {
  key: string;
  label: string;
  status?: OrderStatus;
};

const ORDER_STATUS_TABS: OrderFilter[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending-payment", label: ORDER_STATUS_LABEL.pending_payment, status: "pending_payment" },
  { key: "packing", label: PACKING_TAB_LABEL, status: "packing" },
  { key: "packed", label: ORDER_STATUS_LABEL.packed, status: "packed" },
  { key: "shipped", label: ORDER_STATUS_LABEL.shipped, status: "shipped" },
  { key: "completed", label: ORDER_STATUS_LABEL.completed, status: "completed" },
  { key: "cancelled", label: ORDER_STATUS_LABEL.cancelled, status: "cancelled" },
  { key: "refund-requested", label: ORDER_STATUS_LABEL.refund_requested, status: "refund_requested" },
  { key: "refunded", label: ORDER_STATUS_LABEL.refunded, status: "refunded" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  const normalized = status.trim().toLowerCase();

  if (["success", "completed", "สำเร็จ"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (["void", "voided", "cancelled", "canceled", "ยกเลิก"].includes(normalized)) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  if (["shipping", "shipped", "จัดส่งแล้ว", "กำลังจัดส่ง"].includes(normalized)) {
    return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
  }
  if (["packed", "แพ็กแล้ว", "แพ็คแล้ว"].includes(normalized)) {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
  }
  if (["paid", "waiting", "เตรียมสินค้า", "รอจัดเตรียม"].includes(normalized)) {
    return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300";
  }
  if (
    [
      "pending_payment",
      "packing",
      "pending",
      "รอชำระเงิน",
      "กำลังแพ็ก",
      "กำลังแพ็ค",
      "รอตรวจสอบ",
      "รอตรวจสลิป",
    ].includes(normalized)
  ) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }
  if (["refunded", "คืนเงินแล้ว"].includes(normalized)) {
    return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
  }
  if (["refund_requested", "ขอคืนเงิน/คืนสินค้า"].includes(normalized)) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
  }
  return "bg-muted text-muted-foreground";
}

function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ...ORDER_STATUS_LABEL,
    Completed: "สำเร็จ",
    Packed: "แพ็กแล้ว",
    Pending: "รอดำเนินการ",
    Refunded: "คืนเงินแล้ว",
    Shipped: "จัดส่งแล้ว",
    Shipping: "กำลังจัดส่ง",
    Success: "สำเร็จ",
    Voided: "ยกเลิก",
    Waiting: "เตรียมสินค้า",
  };

  return labels[status] ?? status;
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ExcessPayment: "ชำระเกิน",
    Paid: "ชำระแล้ว",
    PartialPayment: "ชำระบางส่วน",
    Pending: "รอดำเนินการ",
    Refunded: "คืนเงินแล้ว",
    refunded: "คืนเงินแล้ว",
    Voided: "ยกเลิก",
  };

  return labels[status] ?? status;
}

function paymentStatusClass(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "paid" || normalized === "ชำระแล้ว") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (normalized === "pending" || normalized === "รอดำเนินการ") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }
  if (normalized === "partialpayment" || normalized === "ชำระบางส่วน") {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
  }
  if (normalized === "excesspayment" || normalized === "ชำระเกิน") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
  }
  if (normalized === "refunded" || normalized === "คืนเงินแล้ว") {
    return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
  }
  if (normalized === "voided" || normalized === "ยกเลิก") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }

  return "bg-muted text-muted-foreground";
}

function canCancelOrder(order: OrderListItem) {
  if (isRefundCompleted(order)) return false;
  const status = orderStatusLabel(order.status);
  return status !== "ยกเลิก" && status !== "สำเร็จ";
}

function isRefundCompleted(order: OrderListItem) {
  const orderStatus = order.status.trim().toLowerCase();
  const refundStatus = order.refundRequestStatus?.trim().toLowerCase();
  return (
    orderStatus === "refunded" ||
    [
      "manual_refunded",
      "manual_refund_completed",
      "manual_refund_succeeded",
      "manual_refund_success",
      "refunded",
      "completed",
    ].includes(refundStatus ?? "")
  );
}

function getActiveFilter(searchParams: { get(name: string): string | null }) {
  const status = searchParams.get("status");
  if (status === "paid") {
    return ORDER_STATUS_TABS.find((filter) => filter.status === "packing") ?? ORDER_STATUS_TABS[0];
  }

  return (
    ORDER_STATUS_TABS.find(
      (filter) => filter.status && filter.status === status,
    ) ?? ORDER_STATUS_TABS[0]
  );
}

async function getOrdersPage(keyword: string, filter: OrderFilter, page: number) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (filter.status) params.set("status", filter.status);
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));

  const query = params.toString();
  const response = await fetch(`/api/admin/orders${query ? `?${query}` : ""}`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `fetch failed with ${response.status}`);
  }
  if (!text.trim()) {
    return { items: [], totalItems: 0 };
  }
  return normalizeOrdersResponse(JSON.parse(text));
}

async function getOrders(keyword: string, filter: OrderFilter, page: number) {
  return getOrdersPage(keyword, filter, page);
}

function normalizeOrdersResponse(value: unknown): OrdersPageData {
  if (Array.isArray(value)) {
    return { items: value as OrderListItem[], totalItems: null };
  }

  if (!value || typeof value !== "object") {
    throw new Error("Invalid orders response");
  }

  const response = value as Record<string, unknown>;
  const items = response.items ?? response.orders ?? response.data;
  if (!Array.isArray(items)) {
    throw new Error("Invalid orders response items");
  }

  const totalValue = response.totalItems ?? response.total ?? response.totalCount;
  const totalItems = Number(totalValue);

  return {
    items: items as OrderListItem[],
    totalItems: Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : null,
  };
}

function pageHasMore(data: OrdersPageData, page: number) {
  return data.totalItems === null
    ? data.items.length === PAGE_SIZE
    : page * PAGE_SIZE < data.totalItems;
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageFallback />}>
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const { user } = useAdminSession();
  const canManage = hasPermission(user, "orders.manage");
  const canSyncZort = hasPermission(user, "integrations.manage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFilter = getActiveFilter(searchParams);
  const urlKeyword = searchParams.get("keyword") ?? "";
  const urlPage = parsePage(searchParams.get("page"));
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [keyword, setKeyword] = useState(urlKeyword);
  const [inputValue, setInputValue] = useState(urlKeyword);
  const [hasMore, setHasMore] = useState(false);
  const [pendingFilterKey, setPendingFilterKey] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const lastSyncedAt = orders.reduce<string | null>((latest, order) => {
    if (!order.lastSyncedAt) return latest;
    if (!latest) return order.lastSyncedAt;
    return new Date(order.lastSyncedAt) > new Date(latest)
      ? order.lastSyncedAt
      : latest;
  }, null);
  const rangeStart = orders.length ? (urlPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = (urlPage - 1) * PAGE_SIZE + orders.length;
  const allVisibleSelected =
    orders.length > 0 && orders.every((order) => selectedIds.includes(order.id));

  const fetchOrders = useCallback(
    async (kw: string, filter: OrderFilter, pg: number) => {
      setLoading(true);
      setLoadError(false);
      try {
        const data = await getOrders(kw, filter, pg);
        setOrders(data.items);
        setHasMore(pageHasMore(data, pg));
        setSelectedIds([]);
      } catch {
        setOrders([]);
        setHasMore(false);
        setLoadError(true);
      } finally {
        setLoading(false);
        setPendingFilterKey(null);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    void Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true);
          setLoadError(false);
        }

        return getOrders(urlKeyword, activeFilter, urlPage);
      })
      .then((data) => {
        if (!active) return;
        setOrders(data.items);
        setHasMore(pageHasMore(data, urlPage));
        setLoadError(false);
        setKeyword(urlKeyword);
        setInputValue(urlKeyword);
        setSelectedIds([]);
      })
      .catch(() => {
        if (!active) return;
        setOrders([]);
        setHasMore(false);
        setLoadError(true);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setPendingFilterKey(null);
        }
      });

    return () => {
      active = false;
    };
  }, [urlKeyword, activeFilter, urlPage]);

  function pushOrdersQuery(
    params: URLSearchParams,
    fallbackKeyword: string,
    fallbackFilter: OrderFilter,
    fallbackPage: number,
  ) {
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    if (nextQuery === currentQuery) {
      void fetchOrders(fallbackKeyword, fallbackFilter, fallbackPage);
      return;
    }

    router.push(nextHref);
  }

  function handleSearch() {
    const nextKeyword = inputValue.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (nextKeyword) params.set("keyword", nextKeyword);
    else params.delete("keyword");
    params.delete("page");
    setLoading(true);
    setKeyword(nextKeyword);
    pushOrdersQuery(params, nextKeyword, activeFilter, 1);
  }

  function handleFilter(filter: OrderFilter) {
    if (activeFilter.key === filter.key && urlPage === 1) {
      setPendingFilterKey(filter.key);
      void fetchOrders(urlKeyword, filter, 1);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("paymentStatus");
    params.delete("returnRequestStatus");
    params.delete("refundRequestStatus");
    params.delete("afterSales");
    params.delete("page");

    if (filter.status) params.set("status", filter.status);

    setLoading(true);
    setPendingFilterKey(filter.key);
    pushOrdersQuery(params, urlKeyword, filter, 1);
  }

  function handlePageChange(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    setLoading(true);
    pushOrdersQuery(params, urlKeyword, activeFilter, nextPage);
  }

  function clearFilters() {
    setLoading(true);
    setPendingFilterKey("all");
    setInputValue("");
    setKeyword("");
    setSelectedIds([]);
    pushOrdersQuery(new URLSearchParams(), "", ORDER_STATUS_TABS[0], 1);
  }

  function clearKeyword() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("keyword");
    params.delete("page");
    setLoading(true);
    setInputValue("");
    setKeyword("");
    pushOrdersQuery(params, "", activeFilter, 1);
  }

  function toggleOrder(orderId: string) {
    setSelectedIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  }

  function toggleAllVisible() {
    setSelectedIds(allVisibleSelected ? [] : orders.map((order) => order.id));
  }

  async function handleSyncZort() {
    if (!canSyncZort) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/backend/admin/orders/sync-zort", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("sync failed");
      const data: SyncResult = await res.json();
      setSyncMessage({
        text: `ซิงก์สำเร็จ: ดึงมา ${data.totalFetched} รายการ — สร้าง ${data.created} อัปเดต ${data.updated}${data.failed > 0 ? ` ล้มเหลว ${data.failed}` : ""}`,
        ok: true,
      });
      fetchOrders(urlKeyword, activeFilter, urlPage);
    } catch {
      setSyncMessage({ text: "ซิงก์ล้มเหลว กรุณาลองใหม่", ok: false });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCancel(reason: string) {
    if (!cancelTarget || !canManage) return;
    setCancellingId(cancelTarget.id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/backend/admin/orders/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("cancel failed");
      await fetchOrders(urlKeyword, activeFilter, urlPage);
      setActionMessage({ text: `ยกเลิกออเดอร์ ${cancelTarget.number} แล้ว`, ok: true });
      setCancelTarget(null);
    } catch (error) {
      setActionMessage({ text: "ยกเลิกออเดอร์ไม่สำเร็จ กรุณาลองใหม่", ok: false });
      throw error;
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <PageHeader
            eyebrow="การจัดการ"
            title="จัดการออเดอร์"
            description="ตรวจสลิป อัปเดตสถานะการแพ็ก และติดตามการจัดส่งของลูกค้า"
          />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span>
              รายการในหน้านี้{" "}
              <strong className="font-semibold text-foreground">
                {loading ? "…" : orders.length.toLocaleString("th-TH")} รายการ
              </strong>
            </span>
            <span>
              ซิงก์ล่าสุดในหน้านี้{" "}
              <strong className="font-semibold text-foreground">
                {lastSyncedAt ? formatDate(lastSyncedAt) : "ยังไม่มีข้อมูล"}
              </strong>
            </span>
          </div>
        </div>
        {canSyncZort ? (
          <Button
            variant="outline"
            size="lg"
            onClick={handleSyncZort}
            disabled={syncing}
            className="w-full shrink-0 sm:w-auto"
          >
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
            {syncing ? "กำลังซิงก์..." : "ซิงก์ ZORT"}
          </Button>
        ) : null}
      </div>

      {(syncMessage || actionMessage) && (
        <div
          role="status"
          className={cn(
            "rounded-lg px-4 py-3 text-sm font-medium",
            (actionMessage ?? syncMessage)?.ok
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-900"
              : "bg-red-50 text-red-800 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-900",
          )}
        >
          {(actionMessage ?? syncMessage)?.text}
        </div>
      )}

      <div className="overflow-x-auto pb-1">
        <div
          className="flex min-w-max gap-1 rounded-lg bg-muted/70 p-1 ring-1 ring-border/60"
          role="tablist"
          aria-label="กรองออเดอร์ตามสถานะ"
        >
          {ORDER_STATUS_TABS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => handleFilter(filter)}
              disabled={loading}
              role="tab"
              aria-selected={activeFilter.key === filter.key}
              className={cn(
                "relative inline-flex h-10 shrink-0 items-center justify-center rounded-md px-3.5 text-sm font-semibold transition-colors duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60",
                activeFilter.key === filter.key
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {pendingFilterKey === filter.key ? (
                <Spinner className="absolute left-1/2 size-4 -translate-x-1/2" />
              ) : null}
              <span className={cn(pendingFilterKey === filter.key && "invisible")}>
                {filter.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card className="shadow-none" aria-busy={loading}>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="ค้นหาออเดอร์"
                placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า เบอร์โทร หรือ Tracking"
                className="h-11 pl-10"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                disabled={loading}
              />
            </div>
            <Button size="lg" onClick={handleSearch} disabled={loading}>
              {loading ? <Spinner /> : null}
              {loading ? "กำลังโหลด..." : "ค้นหา"}
            </Button>
          </div>
          {(keyword || activeFilter.key !== "all") && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">ตัวกรองที่ใช้</span>
              {keyword ? (
                <button
                  type="button"
                  onClick={clearKeyword}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-muted px-3 text-xs font-medium hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                >
                  ค้นหา: {keyword} <X className="size-3.5" />
                </button>
              ) : null}
              {activeFilter.key !== "all" ? (
                <button
                  type="button"
                  onClick={() => handleFilter(ORDER_STATUS_TABS[0])}
                  disabled={loading}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-muted px-3 text-xs font-medium hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                >
                  สถานะ: {activeFilter.label} <X className="size-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={clearFilters}
                disabled={loading}
                className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
              >
                <X className="size-3.5" /> ล้างตัวกรอง
              </button>
            </div>
          )}
        </CardContent>

        {loading ? (
          <div
            className="flex min-h-10 items-center justify-center gap-2 border-y bg-muted/30 px-4 text-sm font-medium text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Spinner />
            กำลังโหลดออเดอร์...
          </div>
        ) : null}

        {selectedIds.length > 0 ? (
          <div className="flex flex-col gap-3 border-y bg-muted/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">
              เลือกแล้ว {selectedIds.length.toLocaleString("th-TH")} รายการ
            </p>
            <Button variant="ghost" size="lg" onClick={() => setSelectedIds([])}>
              <X /> ล้างการเลือก
            </Button>
          </div>
        ) : null}

        {loadError ? (
          <OrdersLoadError onRetry={() => fetchOrders(urlKeyword, activeFilter, urlPage)} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <OrdersDesktopTable
                activeFilter={activeFilter}
                allVisibleSelected={allVisibleSelected}
                canManage={canManage}
                cancellingId={cancellingId}
                keyword={keyword}
                loading={loading}
                onCancel={setCancelTarget}
                onClearFilters={clearFilters}
                onToggleAll={toggleAllVisible}
                onToggleOrder={toggleOrder}
                orders={orders}
                selectedIds={selectedIds}
              />
            </div>
            <div className="md:hidden">
              <OrdersMobileList
                activeFilter={activeFilter}
                canManage={canManage}
                cancellingId={cancellingId}
                keyword={keyword}
                loading={loading}
                onCancel={setCancelTarget}
                onClearFilters={clearFilters}
                onToggleOrder={toggleOrder}
                orders={orders}
                selectedIds={selectedIds}
              />
            </div>
          </>
        )}

        {!loading && (orders.length > 0 || urlPage > 1) && (
          <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              แสดง {rangeStart.toLocaleString("th-TH")}–{rangeEnd.toLocaleString("th-TH")} · หน้า {urlPage.toLocaleString("th-TH")}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={urlPage === 1}
                onClick={() => handlePageChange(urlPage - 1)}
              >
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={!hasMore}
                onClick={() => handlePageChange(urlPage + 1)}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </Card>

      {canManage ? (
        <OrderCancelDialog
          open={cancelTarget !== null}
          orderNumber={cancelTarget?.number}
          customerName={cancelTarget?.customerName}
          submitting={cancelTarget !== null && cancellingId === cancelTarget.id}
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
          onConfirm={handleCancel}
        />
      ) : null}
    </div>
  );
}

type OrdersListProps = {
  activeFilter: OrderFilter;
  canManage: boolean;
  cancellingId: string | null;
  keyword: string;
  loading: boolean;
  onCancel: (order: OrderListItem) => void;
  onClearFilters: () => void;
  onToggleOrder: (orderId: string) => void;
  orders: OrderListItem[];
  selectedIds: string[];
};

function OrderSelectionCheckbox({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg focus-within:ring-2 focus-within:ring-ring has-disabled:cursor-not-allowed has-disabled:opacity-50">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="size-4 rounded border-border accent-foreground"
      />
    </label>
  );
}

function OrdersDesktopTable({
  activeFilter,
  allVisibleSelected,
  canManage,
  cancellingId,
  keyword,
  loading,
  onCancel,
  onClearFilters,
  onToggleAll,
  onToggleOrder,
  orders,
  selectedIds,
}: OrdersListProps & {
  allVisibleSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <table className="w-full min-w-[1080px] text-left text-sm">
      <thead className="bg-muted/70 text-xs font-semibold text-muted-foreground">
        <tr>
          <th className="w-12 px-4 py-3">
            <OrderSelectionCheckbox
              label="เลือกออเดอร์ทั้งหมดในหน้านี้"
              checked={allVisibleSelected}
              onChange={onToggleAll}
              disabled={loading || orders.length === 0}
            />
          </th>
          <th scope="col" className="px-4 py-3">ออเดอร์</th>
          <th scope="col" className="px-4 py-3">ลูกค้า</th>
          <th scope="col" className="px-4 py-3">การชำระเงิน</th>
          <th scope="col" className="px-4 py-3 text-right">ยอดรวม</th>
          <th scope="col" className="px-4 py-3">ขนส่ง</th>
          <th scope="col" className="px-4 py-3">สถานะ</th>
          <th scope="col" className="px-4 py-3 text-right">จัดการ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 5 }, (_, index) => (
            <tr key={index} className="h-20">
              <td className="px-4"><Skeleton className="size-4" /></td>
              <td className="px-4"><Skeleton className="h-5 w-44" /></td>
              <td className="px-4"><Skeleton className="h-5 w-32" /></td>
              <td className="px-4"><Skeleton className="h-7 w-24" /></td>
              <td className="px-4"><Skeleton className="ml-auto h-5 w-20" /></td>
              <td className="px-4"><Skeleton className="h-5 w-24" /></td>
              <td className="px-4"><Skeleton className="h-7 w-20" /></td>
              <td className="px-4"><Skeleton className="ml-auto h-10 w-28" /></td>
            </tr>
          ))
        ) : orders.length === 0 ? (
          <tr>
            <td colSpan={8}>
              <OrdersEmptyState
                activeFilter={activeFilter}
                keyword={keyword}
                onClearFilters={onClearFilters}
              />
            </td>
          </tr>
        ) : (
          orders.map((order) => (
            <tr
              key={order.id}
              className="h-20 transition-colors duration-200 hover:bg-muted/35"
            >
              <td className={cn("border-l-2 px-4", orderPriorityClass(order))}>
                <OrderSelectionCheckbox
                  label={`เลือกออเดอร์ ${order.number}`}
                  checked={selectedIds.includes(order.id)}
                  onChange={() => onToggleOrder(order.id)}
                />
              </td>
              <td className="max-w-64 px-4 py-3">
                <Link
                  href={`/orders/${order.id}`}
                  className="block truncate font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {order.number}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.orderDate)}</p>
              </td>
              <td className="max-w-52 px-4 py-3">
                <p className="truncate font-semibold">{order.customerName || "ไม่ระบุชื่อ"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{order.customerPhone || "ไม่มีเบอร์โทร"}</p>
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  className={paymentStatusClass(order.paymentStatus)}
                  label={paymentStatusLabel(order.paymentStatus)}
                />
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatMoney(order.amount)}
              </td>
              <td className="max-w-44 px-4 py-3">
                <p className="truncate font-medium">{order.shippingChannel || "ยังไม่ระบุ"}</p>
                {order.trackingNo ? (
                  <p className="mt-1 truncate text-sm text-muted-foreground">{order.trackingNo}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <OrderStatusStack order={order} />
              </td>
              <td className="px-4 py-3">
                <OrderRowActions
                  canManage={canManage}
                  cancelling={cancellingId === order.id}
                  onCancel={() => onCancel(order)}
                  order={order}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function OrdersMobileList({
  activeFilter,
  canManage,
  cancellingId,
  keyword,
  loading,
  onCancel,
  onClearFilters,
  onToggleOrder,
  orders,
  selectedIds,
}: OrdersListProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <OrdersEmptyState
        activeFilter={activeFilter}
        keyword={keyword}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className="space-y-3 p-4">
      {orders.map((order) => (
        <article
          key={order.id}
          className={cn(
            "rounded-xl border-l-2 bg-background p-4 ring-1 ring-border",
            orderPriorityClass(order),
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/orders/${order.id}`}
                className="block truncate font-semibold underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {order.number}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.orderDate)}</p>
            </div>
            <OrderSelectionCheckbox
              label={`เลือกออเดอร์ ${order.number}`}
              checked={selectedIds.includes(order.id)}
              onChange={() => onToggleOrder(order.id)}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">ลูกค้า</p>
              <p className="mt-1 truncate font-semibold">{order.customerName || "ไม่ระบุชื่อ"}</p>
              <p className="truncate text-muted-foreground">{order.customerPhone || "ไม่มีเบอร์โทร"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">ยอดรวม</p>
              <p className="mt-1 font-semibold tabular-nums">{formatMoney(order.amount)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge
              className={paymentStatusClass(order.paymentStatus)}
              label={paymentStatusLabel(order.paymentStatus)}
            />
            <OrderStatusStack order={order} compact />
          </div>
          {order.shippingChannel || order.trackingNo ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {order.shippingChannel || "ขนส่ง"}
              {order.trackingNo ? ` · ${order.trackingNo}` : ""}
            </p>
          ) : null}
          <div className="mt-4 border-t pt-3">
            <OrderRowActions
              canManage={canManage}
              cancelling={cancellingId === order.id}
              onCancel={() => onCancel(order)}
              order={order}
              mobile
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function StatusBadge({ className, label }: { className: string; label: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-lg px-2.5 text-xs font-semibold", className)}>
      {label}
    </span>
  );
}

function OrderStatusStack({ order, compact = false }: { order: OrderListItem; compact?: boolean }) {
  if (isRefundCompleted(order)) {
    return (
      <StatusBadge
        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        label="คืนเงินสำเร็จ"
      />
    );
  }

  if (order.refundRequestStatus === "manual_refund_pending") {
    return (
      <StatusBadge
        className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
        label="รอคืนเงินแบบ Manual"
      />
    );
  }

  return (
    <div className={cn("flex gap-1.5", compact ? "flex-row flex-wrap" : "flex-col items-start")}>
      <StatusBadge className={statusClass(order.status)} label={orderStatusLabel(order.status)} />
      {order.returnRequestStatus === "Requested" ? (
        <StatusBadge
          className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          label="รอตรวจคืนสินค้า"
        />
      ) : null}
    </div>
  );
}

function OrderRowActions({
  canManage,
  cancelling,
  mobile = false,
  onCancel,
  order,
}: {
  canManage: boolean;
  cancelling: boolean;
  mobile?: boolean;
  onCancel: () => void;
  order: OrderListItem;
}) {
  const [openingDetail, setOpeningDetail] = useState(false);

  return (
    <div className={cn("flex items-center justify-end gap-1", mobile && "justify-between")}>
      <Link
        href={`/orders/${order.id}`}
        onClick={() => setOpeningDetail(true)}
        aria-busy={openingDetail}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-3 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          openingDetail && "pointer-events-none opacity-70",
          mobile && "flex-1",
        )}
      >
        {openingDetail ? <Spinner /> : null}
        {openingDetail ? "กำลังเปิด..." : "ดูรายละเอียด"}
        {!openingDetail ? <ArrowRight className="size-4" /> : null}
      </Link>
      {canManage ? <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={`คำสั่งเพิ่มเติมสำหรับออเดอร์ ${order.number}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            disabled={openingDetail}
            render={<Link href={`/orders/${order.id}`} onClick={() => setOpeningDetail(true)} />}
          >
            {openingDetail ? "กำลังเปิด..." : "ดูรายละเอียด"}
          </DropdownMenuItem>
          {canCancelOrder(order) ? (
            <DropdownMenuItem
              variant="destructive"
              disabled={cancelling}
              onClick={onCancel}
            >
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกออเดอร์"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu> : null}
    </div>
  );
}

function OrdersEmptyState({
  activeFilter,
  keyword,
  onClearFilters,
}: {
  activeFilter: OrderFilter;
  keyword: string;
  onClearFilters: () => void;
}) {
  const filtered = Boolean(keyword) || activeFilter.key !== "all";

  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <Search className="size-8 text-muted-foreground" />
      <p className="mt-3 text-base font-semibold">
        {filtered ? "ไม่พบออเดอร์ที่ค้นหา" : "ยังไม่มีออเดอร์"}
      </p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {filtered
          ? "ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก"
          : "เมื่อมีออเดอร์ใหม่ รายการจะแสดงในหน้านี้"}
      </p>
      {filtered ? (
        <Button variant="outline" size="lg" className="mt-4" onClick={onClearFilters}>
          ล้างตัวกรอง
        </Button>
      ) : null}
    </div>
  );
}

function OrdersLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center" role="alert">
      <AlertCircle className="size-8 text-destructive" />
      <p className="mt-3 text-base font-semibold">โหลดข้อมูลออเดอร์ไม่สำเร็จ</p>
      <p className="mt-1 text-sm text-muted-foreground">กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</p>
      <Button variant="outline" size="lg" className="mt-4" onClick={onRetry}>
        ลองใหม่
      </Button>
    </div>
  );
}

function orderPriorityClass(order: OrderListItem) {
  if (isRefundCompleted(order)) {
    return "border-l-emerald-500";
  }

  if (order.returnRequestStatus === "Requested" || order.refundRequestStatus === "manual_refund_pending") {
    return "border-l-red-500";
  }

  const status = orderStatusLabel(order.status);
  if (
    status === "รอชำระเงิน" ||
    status === "รอจัดเตรียม" ||
    status === "กำลังแพ็ก" ||
    status === "รอดำเนินการ"
  ) {
    return "border-l-amber-500";
  }

  return "border-l-transparent";
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function OrdersPageFallback() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-10 w-full max-w-3xl animate-pulse rounded-full bg-muted" />
      <div className="h-96 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
