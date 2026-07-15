"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hasPermission, useAdminSession } from "@/components/admin-permissions";
import { Button } from "@/components/ui/button";
import type { ReviewStatus } from "@/lib/admin-reviews";

export function ReviewActions({
  reviewId,
  status,
  isDeleted,
}: {
  reviewId: string;
  status: ReviewStatus;
  isDeleted: boolean;
}) {
  const router = useRouter();
  const { user } = useAdminSession();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const canManage = hasPermission(user, "reviews.manage");

  if (!canManage) return null;

  async function updateStatus(nextStatus: ReviewStatus) {
    setPendingAction(nextStatus);
    setError("");
    try {
      const response = await fetch(`/api/backend/admin/reviews/${reviewId}/status`, {
        body: JSON.stringify({ status: nextStatus }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "อัปเดตสถานะรีวิวไม่สำเร็จ"));
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "อัปเดตสถานะรีวิวไม่สำเร็จ");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteReview() {
    if (!window.confirm("ต้องการลบรีวิวนี้แบบ soft delete ใช่หรือไม่?")) return;

    setPendingAction("delete");
    setError("");
    try {
      const response = await fetch(`/api/backend/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "ลบรีวิวไม่สำเร็จ"));
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "ลบรีวิวไม่สำเร็จ");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "published" ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={isDeleted || pendingAction !== null}
            onClick={() => updateStatus("hidden")}
          >
            <EyeOff />
            {pendingAction === "hidden" ? "กำลังซ่อน..." : "Hide"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={isDeleted || pendingAction !== null}
            onClick={() => updateStatus("published")}
          >
            <Eye />
            {pendingAction === "published" ? "กำลัง publish..." : "Publish"}
          </Button>
        )}
        <Button
          type="button"
          variant="destructive"
          size="xs"
          disabled={isDeleted || pendingAction !== null}
          onClick={deleteReview}
        >
          <Trash2 />
          {pendingAction === "delete" ? "กำลังลบ..." : "Delete"}
        </Button>
      </div>
      {error ? <p className="max-w-64 text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message || body.error || fallback;
  } catch {
    return fallback;
  }
}
