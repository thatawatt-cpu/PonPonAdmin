"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  RotateCcw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ManualRefundDialog,
  type ManualRefundPayload,
} from "@/components/manual-refund-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type ReturnRequestStatus =
  | "Requested"
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Completed"
  | string;

type ReturnRequest = {
  id: string;
  orderId: string;
  reason: string;
  status: ReturnRequestStatus;
  evidenceImageUrls: string[];
  adminNote: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
};

type OrderReturnRequestCardProps = {
  canManage: boolean;
  canRefund: boolean;
  orderId: string;
  orderNumber: string;
  refundableAmount: number;
  onRefundApproved: () => Promise<void>;
  showManualRefundAction?: boolean;
};

const DEFAULT_APPROVAL_NOTE = "อนุมัติคำขอคืนสินค้า";
const DEFAULT_COMPLETION_NOTE = "ได้รับสินค้าคืนและตรวจสอบเรียบร้อยแล้ว";

function formatDate(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: ReturnRequestStatus) {
  if (status === "Requested" || status === "Pending") return "รอตรวจสอบ";
  if (status === "Approved") return "อนุมัติแล้ว";
  if (status === "Rejected") return "ปฏิเสธแล้ว";
  if (status === "Completed") return "เสร็จสิ้น";
  return status;
}

function statusClass(status: ReturnRequestStatus) {
  if (status === "Requested" || status === "Pending") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  if (status === "Approved" || status === "Completed") {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }

  if (status === "Rejected") {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }

  return "bg-muted text-muted-foreground";
}

async function getReturnRequest(orderId: string) {
  const response = await fetch(
    `/api/backend/admin/orders/${orderId}/return-request`,
  );

  if (response.status === 204 || response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("fetch return request failed");
  }

  return (await response.json()) as ReturnRequest;
}

export function OrderReturnRequestCard({
  canManage,
  canRefund,
  orderId,
  orderNumber,
  refundableAmount,
  onRefundApproved,
  showManualRefundAction = true,
}: OrderReturnRequestCardProps) {
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [adminNote, setAdminNote] = useState(DEFAULT_APPROVAL_NOTE);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundCompleted, setRefundCompleted] = useState(false);

  const fetchReturnRequest = useCallback(async () => {
    try {
      const data = await getReturnRequest(orderId);
      if (!data) {
        setReturnRequest(null);
        setError(null);
        return;
      }

      setReturnRequest(data);
      setAdminNote(data.adminNote ?? DEFAULT_APPROVAL_NOTE);
      setError(null);
    } catch {
      setError("ไม่สามารถโหลดคำขอคืนสินค้าได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let active = true;

    void getReturnRequest(orderId)
      .then((data) => {
        if (!active) return;
        setReturnRequest(data);
        if (data) {
          setAdminNote(data.adminNote ?? DEFAULT_APPROVAL_NOTE);
        }
        setError(null);
      })
      .catch(() => {
        if (active) {
          setError("ไม่สามารถโหลดคำขอคืนสินค้าได้ กรุณาลองใหม่");
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
  }, [orderId]);

  async function updateReturnRequest(
    status: "Approved" | "Rejected" | "Completed",
    noteOverride?: string,
  ) {
    if (!canManage) return;
    const note = noteOverride?.trim() ?? adminNote.trim();
    if (!note) {
      setError("กรุณาระบุหมายเหตุจากแอดมิน");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/backend/admin/orders/${orderId}/return-request`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status,
            adminNote: note,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("update return request failed");
      }

      await fetchReturnRequest();
    } catch {
      setError("อัปเดตคำขอไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  function handleComplete() {
    setAdminNote(DEFAULT_COMPLETION_NOTE);
    void updateReturnRequest("Completed", DEFAULT_COMPLETION_NOTE);
  }

  async function handleManualRefund(payload: ManualRefundPayload) {
    if (!canRefund) return;
    const response = await fetch(
      `/api/backend/admin/orders/${orderId}/approve-manual-refund`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error("approve manual refund failed");
    }

    await Promise.all([fetchReturnRequest(), onRefundApproved()]);
    setRefundCompleted(true);
  }

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!returnRequest && !error) {
    return null;
  }

  if (!returnRequest) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchReturnRequest}>
            ลองใหม่
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const isPending =
    returnRequest.status === "Requested" || returnRequest.status === "Pending";

  return (
    <Card className="border-amber-200 dark:border-amber-900/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-0 pt-5">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <RotateCcw className="size-4 text-amber-600" />
            คำขอคืนสินค้า
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            ส่งคำขอเมื่อ {formatDate(returnRequest.createdAtUtc)}
          </p>
        </div>
        <Badge className={statusClass(returnRequest.status)}>
          {statusLabel(returnRequest.status)}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5 px-5 pb-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            เหตุผลที่ขอคืนสินค้า
          </p>
          <p className="mt-1 text-sm leading-6">{returnRequest.reason}</p>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ImageIcon className="size-3.5" />
            รูปหลักฐาน ({returnRequest.evidenceImageUrls.length})
          </p>
          {returnRequest.evidenceImageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {returnRequest.evidenceImageUrls.map((url, index) => (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
                  aria-label={`เปิดรูปหลักฐานที่ ${index + 1}`}
                >
                  {/* Evidence can come from any backend-approved remote host. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`รูปหลักฐานการคืนสินค้าที่ ${index + 1}`}
                    className="size-full object-cover transition duration-200 group-hover:scale-105"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white">
                    <ExternalLink className="size-3.5" />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">ไม่มีรูปหลักฐาน</p>
          )}
        </div>

        {isPending && canManage ? (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="return-request-admin-note"
                className="text-xs font-semibold text-muted-foreground"
              >
                หมายเหตุจากแอดมิน
              </label>
              <Textarea
                id="return-request-admin-note"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                disabled={submitting}
                className="mt-2 min-h-24 resize-y"
                placeholder="ระบุหมายเหตุสำหรับคำขอนี้"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void updateReturnRequest("Rejected")}
              >
                {submitting ? "กำลังบันทึก..." : "ปฏิเสธคำขอ"}
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void updateReturnRequest("Approved")}
              >
                <CheckCircle2 />
                {submitting ? "กำลังอนุมัติ..." : "อนุมัติคำขอคืนสินค้า"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs font-semibold text-muted-foreground">
                หมายเหตุจากแอดมิน
              </p>
              <p className="mt-1 text-sm">
                {returnRequest.adminNote || "ไม่มีหมายเหตุ"}
              </p>
              {returnRequest.updatedAtUtc && (
                <p className="mt-2 text-xs text-muted-foreground">
                  อัปเดตเมื่อ {formatDate(returnRequest.updatedAtUtc)}
                </p>
              )}
            </div>

            {returnRequest.status === "Approved" && (
              <div className="space-y-3">
                {refundCompleted && (
                <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                  <CheckCircle2 />
                  <AlertDescription className="text-current">
                    ยืนยันการคืนเงินแบบ Manual เรียบร้อยแล้ว
                  </AlertDescription>
                </Alert>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  {canManage ? (
                    <Button
                      variant="outline"
                      disabled={submitting}
                      onClick={handleComplete}
                    >
                      <CheckCircle2 />
                      {submitting ? "กำลังปิดรายการ..." : "ปิดรายการคืนสินค้า"}
                    </Button>
                  ) : null}

                  {canRefund && showManualRefundAction && !refundCompleted && (
                    <Button onClick={() => setRefundDialogOpen(true)}>
                      <Banknote />
                      ยืนยันคืนเงินแบบ Manual
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {canRefund && refundDialogOpen && (
        <ManualRefundDialog
          open
          orderNumber={orderNumber}
          refundableAmount={refundableAmount}
          onOpenChange={setRefundDialogOpen}
          onConfirm={handleManualRefund}
        />
      )}
    </Card>
  );
}
