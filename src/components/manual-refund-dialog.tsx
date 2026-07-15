"use client";

import { FormEvent, useState } from "react";
import { Banknote } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export type ManualRefundPayload = {
  reason: string;
  refundReference: string;
  refundedAmount: number;
};

type ManualRefundDialogProps = {
  open: boolean;
  orderNumber: string;
  refundableAmount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: ManualRefundPayload) => Promise<void>;
};

const DEFAULT_REASON = "คืนเงินผ่านบัญชีธนาคารแล้ว";

export function ManualRefundDialog({
  open,
  orderNumber,
  refundableAmount,
  onOpenChange,
  onConfirm,
}: ManualRefundDialogProps) {
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [refundReference, setRefundReference] = useState("");
  const [refundedAmount, setRefundedAmount] = useState(
    refundableAmount > 0 ? String(refundableAmount) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setReason(DEFAULT_REASON);
    setRefundReference("");
    setRefundedAmount(refundableAmount > 0 ? String(refundableAmount) : "");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (submitting) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = Number(refundedAmount);
    const trimmedReason = reason.trim();
    const trimmedReference = refundReference.trim();

    if (!trimmedReason) {
      setError("กรุณาระบุเหตุผลการคืนเงิน");
      return;
    }

    if (!trimmedReference) {
      setError("กรุณาระบุเลขอ้างอิงการคืนเงิน");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("กรุณาระบุยอดคืนเงินที่มากกว่า 0");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm({
        reason: trimmedReason,
        refundReference: trimmedReference,
        refundedAmount: parsedAmount,
      });
      resetForm();
      onOpenChange(false);
    } catch {
      setError("ยืนยันการคืนเงินไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[480px] rounded-[1.5rem] px-6 py-7 sm:py-6">
        <DialogHeader className="mb-5 items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <Banknote className="size-7" />
          </div>
          <DialogTitle className="text-xl font-black">
            ยืนยันคืนเงินแบบ Manual
          </DialogTitle>
          <DialogDescription className="text-center leading-6">
            บันทึกการคืนเงินสำหรับออเดอร์{" "}
            <span className="font-semibold text-foreground">{orderNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="space-y-2">
            <label htmlFor="manual-refund-reason" className="text-sm font-bold">
              เหตุผล
            </label>
            <Textarea
              id="manual-refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={submitting}
              className="min-h-20 resize-y"
              placeholder="ระบุช่องทางหรือรายละเอียดการคืนเงิน"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="manual-refund-reference"
              className="text-sm font-bold"
            >
              เลขอ้างอิง
            </label>
            <Input
              id="manual-refund-reference"
              value={refundReference}
              onChange={(event) => setRefundReference(event.target.value)}
              disabled={submitting}
              placeholder="เช่น TRANSFER-12345"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="manual-refund-amount" className="text-sm font-bold">
              ยอดคืนเงิน (บาท)
            </label>
            <Input
              id="manual-refund-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={refundedAmount}
              onChange={(event) => setRefundedAmount(event.target.value)}
              disabled={submitting}
              placeholder="0.00"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {submitting ? (
            <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              <Spinner />
              <AlertDescription className="text-current">
                กำลังบันทึกการคืนเงินและอัปเดตสถานะออเดอร์...
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-full"
              disabled={submitting}
            >
              {submitting ? <Spinner /> : <Banknote />}
              {submitting ? "กำลังยืนยัน..." : "ยืนยันคืนเงิน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
