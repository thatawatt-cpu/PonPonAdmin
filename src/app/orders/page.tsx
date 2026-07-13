"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrderCancelDialog } from "@/components/order-cancel-dialog";

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

const PAGE_SIZE = 20;

type OrderFilter = {
  key: string;
  label: string;
  status?: string;
  returnRequestStatus?: "Pending";
  refundRequestStatus?: "Pending";
};

const ORDER_FILTERS: OrderFilter[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending-payment", label: "รอตรวจสลิป", status: "รอตรวจสลิป" },
  { key: "packing", label: "กำลังแพ็ก", status: "กำลังแพ็ก" },
  { key: "shipped", label: "จัดส่งแล้ว", status: "จัดส่งแล้ว" },
  { key: "completed", label: "สำเร็จ", status: "สำเร็จ" },
  { key: "cancelled", label: "ยกเลิก", status: "ยกเลิก" },
  {
    key: "return-requests",
    label: "คืนสินค้า",
    returnRequestStatus: "Pending",
  },
  {
    key: "refund-requests",
    label: "รีฟันด์",
    refundRequestStatus: "Pending",
  },
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
  if (status.includes("สำเร็จ")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (status.includes("ยกเลิก")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (status.includes("จัดส่ง")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (status.includes("แพ็ก")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function getActiveFilter(searchParams: { get(name: string): string | null }) {
  if (searchParams.get("returnRequestStatus") === "Pending") {
    return ORDER_FILTERS.find((filter) => filter.key === "return-requests")!;
  }

  if (searchParams.get("refundRequestStatus") === "Pending") {
    return ORDER_FILTERS.find((filter) => filter.key === "refund-requests")!;
  }

  const status = searchParams.get("status");
  return (
    ORDER_FILTERS.find((filter) => filter.status === status) ?? ORDER_FILTERS[0]
  );
}

async function getOrders(keyword: string, filter: OrderFilter, page: number) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  if (filter.status) params.set("status", filter.status);
  if (filter.returnRequestStatus) {
    params.set("returnRequestStatus", filter.returnRequestStatus);
  }
  if (filter.refundRequestStatus) {
    params.set("refundRequestStatus", filter.refundRequestStatus);
  }
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));

  const response = await fetch(`/api/backend/admin/orders?${params}`);
  if (!response.ok) throw new Error("fetch failed");
  return (await response.json()) as OrderListItem[];
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageFallback />}>
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFilter = getActiveFilter(searchParams);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderListItem | null>(null);

  const fetchOrders = useCallback(
    async (kw: string, filter: OrderFilter, pg: number) => {
      setLoading(true);
      try {
        const data = await getOrders(kw, filter, pg);
        setOrders(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        setOrders([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    void getOrders(keyword, activeFilter, page)
      .then((data) => {
        if (!active) return;
        setOrders(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {
        if (!active) return;
        setOrders([]);
        setHasMore(false);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [keyword, activeFilter, page]);

  function handleSearch() {
    setLoading(true);
    setKeyword(inputValue);
    setPage(1);
  }

  function handleFilter(filter: OrderFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    params.delete("returnRequestStatus");
    params.delete("refundRequestStatus");

    if (filter.status) params.set("status", filter.status);
    if (filter.returnRequestStatus) {
      params.set("returnRequestStatus", filter.returnRequestStatus);
    }
    if (filter.refundRequestStatus) {
      params.set("refundRequestStatus", filter.refundRequestStatus);
    }

    setLoading(true);
    setPage(1);
    router.push(params.size ? `${pathname}?${params}` : pathname);
  }

  function handlePageChange(nextPage: number) {
    setLoading(true);
    setPage(nextPage);
  }

  async function handleSyncZort() {
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
      fetchOrders(keyword, activeFilter, page);
    } catch {
      setSyncMessage({ text: "ซิงก์ล้มเหลว กรุณาลองใหม่", ok: false });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCancel(reason: string) {
    if (!cancelTarget) return;
    setCancellingId(cancelTarget.id);
    try {
      const res = await fetch(`/api/backend/admin/orders/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("cancel failed");
      await fetchOrders(keyword, activeFilter, page);
      setCancelTarget(null);
    } catch (error) {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
      throw error;
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="การจัดการ"
          title="จัดการออเดอร์"
          description="ตรวจสลิป อัปเดตสถานะการแพ็ก และติดตามการจัดส่งของลูกค้า"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncZort}
          disabled={syncing}
          className="mt-1 shrink-0"
        >
          <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "กำลังซิงก์..." : "ซิงก์ Zort"}
        </Button>
      </div>

      {syncMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            syncMessage.ok
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          {syncMessage.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {ORDER_FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => handleFilter(filter)}
            className={`min-h-9 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeFilter.key === filter.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground ring-1 ring-border hover:bg-muted/50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า หรือเบอร์โทร"
              className="flex-1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch}>ค้นหา</Button>
          </div>
        </CardContent>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">ออเดอร์</th>
                <th className="px-5 py-4">ลูกค้า</th>
                <th className="px-5 py-4">การชำระ</th>
                <th className="px-5 py-4">ยอดรวม</th>
                <th className="px-5 py-4">จัดส่ง</th>
                <th className="px-5 py-4">สถานะ / งาน</th>
                <th className="px-5 py-4">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {activeFilter.key === "return-requests"
                      ? "ไม่พบคำขอคืนสินค้า"
                      : activeFilter.key === "refund-requests"
                        ? "ไม่พบคำขอรีฟันด์"
                        : "ไม่พบออเดอร์"}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{order.number}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(order.orderDate)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{order.customerPhone}</p>
                    </td>
                    <td className="px-5 py-4 text-sm">{order.paymentStatus}</td>
                    <td className="px-5 py-4 font-semibold">
                      ฿{order.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      {order.shippingChannel ? (
                        <>
                          <p className="text-xs font-medium">{order.shippingChannel}</p>
                          {order.trackingNo && (
                            <p className="mt-1 text-xs text-muted-foreground">{order.trackingNo}</p>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className={`inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold ${statusClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                        {order.returnRequestStatus === "Requested" && (
                          <span className="inline-flex h-6 items-center rounded-full bg-amber-100 px-2.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            รอตรวจคืนสินค้า
                          </span>
                        )}
                        {order.refundRequestStatus ===
                          "manual_refund_pending" && (
                          <span className="inline-flex h-6 items-center rounded-full bg-violet-100 px-2.5 text-xs font-semibold text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                            รอคืนเงินแบบ Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/orders/${order.id}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                          ดูรายละเอียด
                        </a>
                        {order.status !== "ยกเลิก" && order.status !== "สำเร็จ" && (
                          <button
                            disabled={cancellingId === order.id}
                            onClick={() => setCancelTarget(order)}
                            className="min-h-9 rounded-full border border-destructive/40 px-3.5 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {cancellingId === order.id ? "..." : "ยกเลิก"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (orders.length > 0 || page > 1) && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">หน้า {page}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => handlePageChange(page + 1)}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </Card>

      <OrderCancelDialog
        open={cancelTarget !== null}
        orderNumber={cancelTarget?.number}
        submitting={cancelTarget !== null && cancellingId === cancelTarget.id}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        onConfirm={handleCancel}
      />
    </div>
  );
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
