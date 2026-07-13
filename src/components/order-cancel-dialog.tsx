"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CANCEL_REASONS = [
  "ต้องการเปลี่ยนที่อยู่หรือข้อมูลจัดส่ง",
  "สั่งสินค้าผิดหรือต้องการสั่งใหม่",
  "ต้องการเปลี่ยนวิธีชำระเงิน",
  "ไม่ต้องการสินค้าแล้ว",
  "อื่น ๆ",
];

type OrderCancelDialogProps = {
  open: boolean;
  orderNumber?: string;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
};

function buildReason(reason: string, detail: string) {
  const trimmedDetail = detail.trim();

  if (!trimmedDetail) {
    return reason;
  }

  return `${reason}: ${trimmedDetail}`;
}

export function OrderCancelDialog({
  open,
  orderNumber,
  submitting,
  onOpenChange,
  onConfirm,
}: OrderCancelDialogProps) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [detail, setDetail] = useState("");

  function resetForm() {
    setReason(CANCEL_REASONS[0]);
    setDetail("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (submitting) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await onConfirm(buildReason(reason, detail));
      resetForm();
    } catch {
      // The parent keeps the existing error alert behavior.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[460px] rounded-[1.5rem] px-6 py-7 sm:px-6 sm:py-6">
        <DialogHeader className="mb-6 items-center text-center">
          <div className="mb-3 flex size-[60px] items-center justify-center rounded-full bg-[#ffe4e7] text-[#f00012] dark:bg-[#3a1116] dark:text-[#ff5a66]">
            <AlertTriangle className="size-7 stroke-[2.4]" />
          </div>
          <DialogTitle className="text-xl font-black leading-none">
            ยืนยันยกเลิกและขอคืนเงิน?
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-sm text-center text-sm leading-6">
            ออเดอร์ {orderNumber ? <span className="font-semibold text-foreground">{orderNumber}</span> : null} จะถูกยกเลิก
            และส่งคำขอคืนเงินให้ร้านตรวจสอบ
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <p className="text-sm font-bold">เหตุผลที่ยกเลิก</p>
            <div className="space-y-2">
              {CANCEL_REASONS.map((item) => (
                <label
                  key={item}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition hover:bg-muted/50",
                    reason === item
                      ? "border-[#f00012] bg-[#fff1f2] hover:bg-[#fff1f2] dark:border-[#ff5a66] dark:bg-[#2a0b10] dark:hover:bg-[#2a0b10]"
                      : "border-border bg-background",
                  )}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={item}
                    checked={reason === item}
                    onChange={() => setReason(item)}
                    className="size-4 accent-[#f00012] dark:accent-[#ff5a66]"
                    disabled={submitting}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold">รายละเอียดเพิ่มเติม (ถ้ามี)</p>
            <Textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="บอกรายละเอียดเพิ่มเติมให้ร้านทราบ"
              className="min-h-24 resize-y rounded-2xl px-4 py-3"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-3 pt-0.5 sm:grid-cols-2">
            <Button
              type="button"
              variant="ghost"
              className="h-12 rounded-full bg-[#ffe4e7] font-bold text-[#f00012] hover:bg-[#ffd8dc] dark:bg-[#3a1116] dark:text-[#ff5a66] dark:hover:bg-[#4a151b]"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              ไม่ยกเลิก
            </Button>
            <Button
              type="submit"
              className="h-12 rounded-full bg-[#f00012] font-bold text-white hover:bg-[#d90010] dark:bg-[#ff3b49] dark:hover:bg-[#ff5260]"
              disabled={submitting}
            >
              {submitting ? "กำลังยกเลิก..." : "ยกเลิกและขอคืนเงิน"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
