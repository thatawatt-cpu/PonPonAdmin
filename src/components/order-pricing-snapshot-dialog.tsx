"use client";

import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type PricingSnapshotLine = {
  productId: string;
  productName: string;
  quantity: number;
  originalUnitPrice: number;
  flashSaleUnitPrice: number | null;
  lineTotal: number;
};

type PricingAdjustment = {
  type: string;
  label: string;
  amount: number;
};

type AppliedCoupon = {
  code?: string;
  name?: string;
  type?: string;
  discountAmount?: number;
  shippingDiscountAmount?: number;
};

type PricingSnapshot = {
  lines: PricingSnapshotLine[];
  itemSubtotal: number;
  shippingAmount: number;
  shippingDiscountAmount?: number;
  couponDiscountAmount: number;
  promotionDiscountAmount?: number;
  appliedCoupons?: AppliedCoupon[];
  vatAmount: number;
  grandTotal: number;
  adjustments: PricingAdjustment[];
};

function fmtMoney(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function getPricingSnapshot(orderId: string) {
  const response = await fetch(`/api/backend/admin/orders/${orderId}/pricing-snapshot`);
  if (!response.ok) throw new Error("fetch failed");
  return (await response.json()) as PricingSnapshot;
}

export function OrderPricingSnapshotDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
}: {
  orderId: string;
  orderNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [snapshot, setSnapshot] = useState<PricingSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    setError(null);

    void getPricingSnapshot(orderId)
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch(() => {
        if (active) setError("โหลด Pricing Snapshot ไม่สำเร็จ");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4" />
            Pricing Snapshot
          </DialogTitle>
          <DialogDescription>
            รายละเอียดการคำนวณราคาของออเดอร์ {orderNumber} ณ เวลาที่สั่งซื้อ
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !snapshot ? null : (
          <div className="space-y-5">
            <div className="max-h-64 overflow-y-auto rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">สินค้า</th>
                    <th className="px-3 py-2 text-right">ราคาเดิม</th>
                    <th className="px-3 py-2 text-right">ราคา Flash Sale</th>
                    <th className="px-3 py-2 text-right">จำนวน</th>
                    <th className="px-3 py-2 text-right">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {snapshot.lines.map((line) => (
                    <tr key={line.productId}>
                      <td className="px-3 py-2">{line.productName}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {line.flashSaleUnitPrice !== null ? (
                          <span className="line-through">฿{fmtMoney(line.originalUnitPrice)}</span>
                        ) : (
                          `฿${fmtMoney(line.originalUnitPrice)}`
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {line.flashSaleUnitPrice !== null ? (
                          <span className="font-semibold text-red-600">
                            ฿{fmtMoney(line.flashSaleUnitPrice)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{line.quantity}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        ฿{fmtMoney(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 rounded-xl border p-4 text-sm">
              <SummaryRow label="ยอดสินค้ารวม" value={`฿${fmtMoney(snapshot.itemSubtotal)}`} />
              {snapshot.couponDiscountAmount > 0 ? (
                <SummaryRow
                  label="ส่วนลดคูปอง"
                  value={`-฿${fmtMoney(snapshot.couponDiscountAmount)}`}
                  valueClassName="text-green-600"
                />
              ) : null}
              {(snapshot.promotionDiscountAmount ?? 0) > 0 ? (
                <SummaryRow
                  label="ส่วนลดจาก Promotion"
                  value={`-฿${fmtMoney(snapshot.promotionDiscountAmount ?? 0)}`}
                  valueClassName="text-green-600"
                />
              ) : null}
              <SummaryRow label="ค่าจัดส่ง" value={`฿${fmtMoney(snapshot.shippingAmount)}`} />
              {(snapshot.shippingDiscountAmount ?? 0) > 0 ? (
                <SummaryRow
                  label="ส่วนลดค่าจัดส่ง"
                  value={`-฿${fmtMoney(snapshot.shippingDiscountAmount ?? 0)}`}
                  valueClassName="text-green-600"
                />
              ) : null}
              {snapshot.vatAmount > 0 ? (
                <SummaryRow label="ภาษีมูลค่าเพิ่ม" value={`฿${fmtMoney(snapshot.vatAmount)}`} />
              ) : null}
              {snapshot.appliedCoupons?.length ? (
                <div className="space-y-1 border-t pt-2">
                  <p className="text-xs font-bold text-muted-foreground">คูปองที่ใช้จริง</p>
                  {snapshot.appliedCoupons.map((coupon, index) => (
                    <SummaryRow
                      key={`${coupon.code ?? coupon.name ?? "coupon"}-${index}`}
                      label={coupon.code ?? coupon.name ?? "Coupon"}
                      value={`-฿${fmtMoney((coupon.discountAmount ?? 0) + (coupon.shippingDiscountAmount ?? 0))}`}
                      valueClassName="text-green-600"
                    />
                  ))}
                </div>
              ) : null}
              {snapshot.adjustments.map((adjustment, index) => (
                <SummaryRow
                  key={`${adjustment.type}-${index}`}
                  label={adjustment.label}
                  value={`${adjustment.amount < 0 ? "-" : ""}฿${fmtMoney(Math.abs(adjustment.amount))}`}
                  valueClassName={adjustment.amount < 0 ? "text-green-600" : undefined}
                />
              ))}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-bold">ยอดชำระรวม</span>
                <span className="text-base font-black">฿{fmtMoney(snapshot.grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClassName ?? "font-medium"}>{value}</span>
    </div>
  );
}
