"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function CouponCampaignActions({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (
      !window.confirm(
        `ต้องการลบ Campaign "${campaignName}" ใช่หรือไม่?\nหากมีคูปองอยู่ Campaign จะถูกปิดใช้งานและเก็บประวัติไว้`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/backend/admin/coupon-campaigns/${campaignId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "ลบ Campaign ไม่สำเร็จ"));
      }
      router.push("/coupon-campaigns");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "ลบ Campaign ไม่สำเร็จ",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/coupon-campaigns/${campaignId}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil />
          แก้ไข
        </Link>
        <Button
          variant="destructive"
          size="sm"
          disabled={deleting}
          onClick={handleDelete}
        >
          <Trash2 />
          {deleting ? "กำลังดำเนินการ..." : "ลบ Campaign"}
        </Button>
      </div>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}
