"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, MoreHorizontal, Trash2 } from "lucide-react";
import type { Coupon } from "@/lib/admin-coupons";
import { CouponCard } from "@/components/coupon-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteRequest = {
  ids: string[];
  label: string;
} | null;

const DELETE_BATCH_SIZE = 50;

export function CouponListManager({
  allMatchingIds,
  coupons,
  replacementCoupons,
}: {
  allMatchingIds: string[];
  coupons: Coupon[];
  replacementCoupons: Coupon[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const visibleCoupons = useMemo(() => {
    const remaining = coupons.filter((coupon) => !removedIds.has(coupon.id));
    const availableReplacements = replacementCoupons.filter(
      (coupon) => !removedIds.has(coupon.id),
    );
    return [...remaining, ...availableReplacements].slice(0, coupons.length);
  }, [coupons, removedIds, replacementCoupons]);
  const groups = useMemo(
    () => groupCouponsByBatch(visibleCoupons),
    [visibleCoupons],
  );
  const visibleIds = useMemo(
    () => visibleCoupons.map((coupon) => coupon.id),
    [visibleCoupons],
  );
  const availableMatchingIds = useMemo(
    () => allMatchingIds.filter((id) => !removedIds.has(id)),
    [allMatchingIds, removedIds],
  );
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  function toggleCoupon(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (allVisibleSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function confirmDelete() {
    if (!deleteRequest || deleteRequest.ids.length === 0) return;

    setDeleting(true);
    setError("");
    const failedIds: string[] = [];

    for (let index = 0; index < deleteRequest.ids.length; index += DELETE_BATCH_SIZE) {
      const batch = deleteRequest.ids.slice(index, index + DELETE_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (id) => {
          const response = await fetch(`/api/backend/admin/coupons/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error(id);
        }),
      );

      results.forEach((result, resultIndex) => {
        if (result.status === "rejected") failedIds.push(batch[resultIndex]);
      });

      const successfulIds = batch.filter(
        (_, resultIndex) => results[resultIndex]?.status === "fulfilled",
      );
      if (successfulIds.length > 0) {
        setRemovedIds((current) => {
          const next = new Set(current);
          successfulIds.forEach((id) => next.add(id));
          return next;
        });
        setSelectedIds((current) => {
          const next = new Set(current);
          successfulIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    }

    setDeleting(false);
    setDeleteRequest(null);
    setSelectedIds(new Set(failedIds));

    if (failedIds.length > 0) {
      setError(`ลบไม่สำเร็จ ${failedIds.length.toLocaleString()} รายการ กรุณาลองอีกครั้ง`);
    }

    router.refresh();
  }

  const selectedForDelete = Array.from(selectedIds).filter((id) =>
    visibleIds.includes(id),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" onClick={toggleAllVisible}>
            <span
              className={`grid size-5 place-items-center rounded border ${
                allVisibleSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-transparent"
              }`}
            >
              <Check className="size-3.5 stroke-[3]" />
            </span>
            {allVisibleSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหน้านี้"}
          </Button>
          {selectedVisibleCount > 0 ? (
            <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">
              เลือกแล้ว {selectedVisibleCount.toLocaleString()} รายการ
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              เลือกคูปองเพื่อจัดการหลายรายการ
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={selectedForDelete.length > 0 ? "destructive" : "outline"}
            disabled={selectedForDelete.length === 0}
            onClick={() =>
              setDeleteRequest({
                ids: selectedForDelete,
                label: "รายการที่เลือก",
              })
            }
          >
            <Trash2 />
            ลบที่เลือก
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="คำสั่งเพิ่มเติม"
                />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                disabled={availableMatchingIds.length === 0}
                onClick={() =>
                  setDeleteRequest({
                    ids: availableMatchingIds,
                    label: "คูปองทั้งหมด",
                  })
                }
              >
                <Trash2 />
                ลบทั้งหมด
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div>
                <p className="text-sm font-black">
                  {group.batchId ? "Bulk Generate Batch" : "สร้างทีละรายการ"}
                </p>
                {group.batchId ? (
                  <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                    Batch ID: {group.batchId}
                  </p>
                ) : null}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {group.coupons.length.toLocaleString()} คูปอง
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {group.coupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  onDeleted={(id) => {
                    setRemovedIds((current) => new Set(current).add(id));
                    setSelectedIds((current) => {
                      const next = new Set(current);
                      next.delete(id);
                      return next;
                    });
                  }}
                  selectable
                  selected={selectedIds.has(coupon.id)}
                  onSelectedChange={(checked) => toggleCoupon(coupon.id, checked)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog
        open={deleteRequest !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteRequest(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบคูปอง</DialogTitle>
            <DialogDescription>
              กำลังจะลบ{deleteRequest?.label} จำนวน{" "}
              <strong className="text-foreground">
                {deleteRequest?.ids.length.toLocaleString() ?? 0} รายการ
              </strong>
              {" "}การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteRequest(null)}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {deleting ? "กำลังลบ..." : "ยืนยันการลบ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function groupCouponsByBatch(coupons: Coupon[]) {
  const groups = new Map<
    string,
    {
      key: string;
      batchId: string | null;
      coupons: Coupon[];
    }
  >();

  for (const coupon of coupons) {
    const key = coupon.batchId || "individual";
    const group = groups.get(key) ?? {
      key,
      batchId: coupon.batchId ?? null,
      coupons: [],
    };
    group.coupons.push(coupon);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}
