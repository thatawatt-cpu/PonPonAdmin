"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Banknote, CheckCircle2, Package, Receipt } from "lucide-react";
import { hasPermission, useAdminSession } from "@/components/admin-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ManualRefundDialog,
  type ManualRefundPayload,
} from "@/components/manual-refund-dialog";
import { OrderCancelDialog } from "@/components/order-cancel-dialog";
import { OrderPricingSnapshotDialog } from "@/components/order-pricing-snapshot-dialog";
import { OrderReturnRequestCard } from "@/components/order-return-request-card";
import { Skeleton } from "@/components/ui/skeleton";

type OrderItem = {
  id: string;
  zortProductId: number | null;
  sku: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitText: string | null;
  pricePerUnit: number;
  discount: number | null;
  discountAmount: number;
  totalPrice: number;
  productType: number;
  bundleId: number | null;
  bundleCode: string | null;
  bundleName: string | null;
};

type PaymentRecord = {
  id: string;
  zortPaymentId: number | null;
  name: string;
  amount: number;
  paymentDateTime: string;
};

type OrderDetail = {
  id: string;
  zortOrderId: number;
  number: string;
  zortCustomerId: number | null;
  customerCode: string | null;
  customerName: string;
  customerIdNumber: string | null;
  customerEmail: string | null;
  customerPhone: string;
  customerAddress: string | null;
  status: string;
  paymentStatus: string;
  amount: number;
  vatAmount: number;
  shippingAmount: number;
  paymentAmount: number;
  discountAmount: number;
  shippingChannel: string | null;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingPhone: string | null;
  trackingNo: string | null;
  orderDate: string;
  shippingDate: string | null;
  reference: string | null;
  description: string | null;
  salesChannel: string;
  warehouseCode: string | null;
  isCod: boolean;
  currency: string | null;
  cancellationReason: string | null;
  canceledBy: string | null;
  canceledAtUtc: string | null;
  omiseRefundId: string | null;
  omiseRefundStatus: string | null;
  refundedAmount: number;
  zortCreatedAt: string;
  zortUpdatedAt: string;
  lastSyncedAt: string;
  items: OrderItem[];
  payments: PaymentRecord[];
};

async function getOrderDetail(id: string) {
  const response = await fetch(`/api/backend/admin/orders/${id}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("fetch failed");
  }

  return (await response.json()) as OrderDetail;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(n: number, currency = "THB") {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (currency !== "THB" ? ` ${currency}` : "");
}

function statusClass(status: string) {
  if (isCanceledStatus(status)) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
  if (status.includes("สำเร็จ")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (status.includes("จัดส่ง")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (status.includes("แพ็ก")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function isCanceledStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return (
    normalized.includes("ยกเลิก") ||
    normalized === "void" ||
    normalized === "voided" ||
    normalized === "cancel" ||
    normalized === "canceled" ||
    normalized === "cancelled"
  );
}

function isManualRefundCompleted(order: OrderDetail) {
  const status = order.omiseRefundStatus?.trim().toLowerCase();
  return (
    refundCompletedStatusSet.has(status ?? "") ||
    (order.refundedAmount ?? 0) > 0
  );
}

const refundCompletedStatusSet = new Set([
  "manual_refund_approved",
  "manual_refund_completed",
  "manual_refund_succeeded",
  "manual_refund_success",
  "refunded",
  "succeeded",
  "successful",
]);

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <span className="w-36 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function OrderItemThumbnail({ item }: { item: OrderItem }) {
  const [failed, setFailed] = useState(false);

  if (!item.imageUrl || failed) {
    return <Package className="size-5 text-muted-foreground" />;
  }

  return (
    // Product images come from backend data and may use more than one approved host.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={item.name}
      className="size-full object-contain p-1"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function OrderDetailPage() {
  const { user } = useAdminSession();
  const canManage = hasPermission(user, "orders.manage");
  const canRefund = hasPermission(user, "orders.refund");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundCompleted, setRefundCompleted] = useState(false);
  const [pricingSnapshotOpen, setPricingSnapshotOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrderDetail(id);
      if (!data) {
        setNotFound(true);
        return;
      }
      setOrder(data);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;

    void getOrderDetail(id)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setNotFound(true);
          return;
        }
        setOrder(data);
        setNotFound(false);
      })
      .catch(() => {
        if (active) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function handleCancel(reason: string) {
    if (!order || !canManage) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/backend/admin/orders/${id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("cancel failed");
      await fetchOrder();
      setCancelDialogOpen(false);
    } catch (error) {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
      throw error;
    } finally {
      setCancelling(false);
    }
  }

  async function handleManualRefund(payload: ManualRefundPayload) {
    if (!canRefund) return;
    const response = await fetch(
      `/api/backend/admin/orders/${id}/approve-manual-refund`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error("approve manual refund failed");
    }

    await fetchOrder();
    setRefundCompleted(true);
  }

  if (loading) return <LoadingSkeleton />;

  if (notFound || !order) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/orders")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          กลับรายการออเดอร์
        </button>
        <p className="text-muted-foreground">ไม่พบออเดอร์นี้</p>
      </div>
    );
  }

  const isCanceled = isCanceledStatus(order.status);
  const canCancel = !isCanceled && order.status !== "สำเร็จ";
  const currency = order.currency ?? "THB";
  const isManualRefundPending =
    order.omiseRefundStatus === "manual_refund_pending";
  const manualRefundCompleted =
    refundCompleted || isManualRefundCompleted(order);
  const shouldShowManualRefundCard =
    isManualRefundPending || manualRefundCompleted;
  const shouldShowReturnRequestCard =
    !isManualRefundPending && !manualRefundCompleted;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/orders")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        กลับรายการออเดอร์
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            ออเดอร์
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">{order.number}</h1>
            <span
              className={`inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold ${statusClass(order.status)}`}
            >
              {order.status}
            </span>
            {order.isCod && (
              <span className="inline-flex h-7 items-center rounded-full bg-orange-100 px-3 text-sm font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                เก็บเงินปลายทาง
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{fmt(order.orderDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPricingSnapshotOpen(true)}>
            <Receipt />
            Pricing Snapshot
          </Button>
          {canManage && canCancel && (
            <Button variant="destructive" size="sm" disabled={cancelling} onClick={() => setCancelDialogOpen(true)}>
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกออเดอร์"}
            </Button>
          )}
        </div>
      </div>

      {canManage ? (
        <OrderCancelDialog
          open={cancelDialogOpen}
          orderNumber={order.number}
          submitting={cancelling}
          onOpenChange={setCancelDialogOpen}
          onConfirm={handleCancel}
        />
      ) : null}

      <OrderPricingSnapshotDialog
        orderId={id}
        orderNumber={order.number}
        open={pricingSnapshotOpen}
        onOpenChange={setPricingSnapshotOpen}
      />

      {shouldShowReturnRequestCard && (
        <OrderReturnRequestCard
          canManage={canManage}
          canRefund={canRefund}
          orderId={id}
          orderNumber={order.number}
          refundableAmount={order.paymentAmount}
          onRefundApproved={fetchOrder}
          showManualRefundAction={false}
        />
      )}

      {shouldShowManualRefundCard && (
        <Card
          className={
            manualRefundCompleted
              ? "border-green-200 dark:border-green-900/60"
              : "border-blue-200 dark:border-blue-900/60"
          }
        >
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-0 pt-5">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Banknote
                  className={
                    manualRefundCompleted
                      ? "size-4 text-green-600"
                      : "size-4 text-blue-600"
                  }
                />
                คำขอคืนเงินแบบ Manual
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                ตรวจจากสถานะ omiseRefundStatus ในรายละเอียดออเดอร์
              </p>
            </div>
            <span
              className={
                manualRefundCompleted
                  ? "inline-flex h-7 items-center rounded-full bg-green-100 px-3 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  : "inline-flex h-7 items-center rounded-full bg-blue-100 px-3 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              }
            >
              {manualRefundCompleted ? "คืนเงินแล้ว" : "รอคืนเงิน"}
            </span>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <InfoRow label="สถานะ Refund" value={order.omiseRefundStatus} />
              <InfoRow
                label="ยอดคืนแล้ว"
                value={`฿${fmtMoney(order.refundedAmount ?? 0, currency)}`}
              />
              <InfoRow label="เหตุผลยกเลิก" value={order.cancellationReason} />
              <InfoRow label="ยกเลิกโดย" value={order.canceledBy} />
            </div>

            {manualRefundCompleted ? (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                <CheckCircle2 className="size-4" />
                ยืนยันการคืนเงินแบบ Manual เรียบร้อยแล้ว
              </div>
            ) : canRefund ? (
              <div className="flex justify-end">
                <Button onClick={() => setRefundDialogOpen(true)}>
                  <Banknote />
                  ยืนยันคืนเงินแบบ Manual
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {canRefund && refundDialogOpen && (
        <ManualRefundDialog
          open
          orderNumber={order.number}
          refundableAmount={order.paymentAmount}
          onOpenChange={setRefundDialogOpen}
          onConfirm={handleManualRefund}
        />
      )}

      {/* 2-col grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer */}
        <Card>
          <CardHeader className="pb-0 pt-5">
            <CardTitle className="text-sm font-semibold">ข้อมูลลูกค้า</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-5 pb-4">
            <InfoRow label="ชื่อ" value={order.customerName} />
            <InfoRow label="โทรศัพท์" value={order.customerPhone} />
            <InfoRow label="อีเมล" value={order.customerEmail} />
            <InfoRow label="ที่อยู่" value={order.customerAddress} />
            <InfoRow label="รหัสลูกค้า" value={order.customerCode} />
            <InfoRow label="เลขบัตรประชาชน" value={order.customerIdNumber} />
          </CardContent>
        </Card>

        {/* Order summary */}
        <Card>
          <CardHeader className="pb-0 pt-5">
            <CardTitle className="text-sm font-semibold">สรุปยอดชำระ</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-5 pb-4">
            <InfoRow label="ยอดสินค้า" value={`฿${fmtMoney(order.amount)}`} />
            {order.discountAmount > 0 && (
              <InfoRow label="ส่วนลด" value={<span className="text-green-600">-฿{fmtMoney(order.discountAmount)}</span>} />
            )}
            <InfoRow label="ค่าจัดส่ง" value={`฿${fmtMoney(order.shippingAmount)}`} />
            {order.vatAmount > 0 && (
              <InfoRow label="ภาษีมูลค่าเพิ่ม" value={`฿${fmtMoney(order.vatAmount)}`} />
            )}
            <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
              <span className="w-36 shrink-0 text-xs font-semibold">ยอดชำระรวม</span>
              <span className="text-sm font-bold">฿{fmtMoney(order.paymentAmount, currency)}</span>
            </div>
            <InfoRow label="สถานะการชำระ" value={order.paymentStatus} />
            <InfoRow label="ช่องทางขาย" value={order.salesChannel} />
            <InfoRow label="คลังสินค้า" value={order.warehouseCode} />
            {order.reference && <InfoRow label="อ้างอิง" value={order.reference} />}
          </CardContent>
        </Card>

        {/* Shipping */}
        <Card>
          <CardHeader className="pb-0 pt-5">
            <CardTitle className="text-sm font-semibold">ข้อมูลจัดส่ง</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-5 pb-4">
            <InfoRow label="ช่องทางจัดส่ง" value={order.shippingChannel} />
            <InfoRow label="เลขพัสดุ" value={order.trackingNo} />
            <InfoRow label="ชื่อผู้รับ" value={order.shippingName} />
            <InfoRow label="โทรผู้รับ" value={order.shippingPhone} />
            <InfoRow label="ที่อยู่จัดส่ง" value={order.shippingAddress} />
            <InfoRow label="วันจัดส่ง" value={order.shippingDate ? fmt(order.shippingDate) : null} />
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader className="pb-0 pt-5">
            <CardTitle className="text-sm font-semibold">รายการชำระเงิน</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {order.payments.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">ยังไม่มีรายการชำระ</p>
            ) : (
              <div className="divide-y divide-border">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{fmt(p.paymentDateTime)}</p>
                    </div>
                    <span className="text-sm font-semibold">฿{fmtMoney(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="pb-0 pt-5">
          <CardTitle className="text-sm font-semibold">
            รายการสินค้า ({order.items.length} ชิ้น)
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">สินค้า</th>
                <th className="px-5 py-3 text-right">ราคา/หน่วย</th>
                <th className="px-5 py-3 text-right">จำนวน</th>
                <th className="px-5 py-3 text-right">ส่วนลด</th>
                <th className="px-5 py-3 text-right">รวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative grid size-13 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                        <OrderItemThumbnail item={item} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.sku}
                          {item.bundleName ? ` · ${item.bundleName}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">฿{fmtMoney(item.pricePerUnit)}</td>
                  <td className="px-5 py-4 text-right">
                    {item.quantity} {item.unitText ?? ""}
                  </td>
                  <td className="px-5 py-4 text-right text-green-600">
                    {item.discountAmount > 0 ? `-฿${fmtMoney(item.discountAmount)}` : "—"}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold">฿{fmtMoney(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sync meta */}
      <p className="text-xs text-muted-foreground">
        อัปเดตล่าสุด {fmt(order.lastSyncedAt)} · Zort Order #{order.zortOrderId}
      </p>
    </div>
  );
}
