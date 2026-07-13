"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

export function PromotionActions({
  promotionId,
  promotionName,
}: {
  promotionId: string;
  promotionName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deletePromotion() {
    if (!window.confirm(`ต้องการลบ Promotion "${promotionName}" ใช่หรือไม่?`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/backend/admin/promotions/${promotionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "ลบ Promotion ไม่สำเร็จ"));
      }
      router.push("/promotions");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "ลบ Promotion ไม่สำเร็จ",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link href={`/promotions/${promotionId}/edit`} className={buttonVariants({ variant: "outline" })}>
          <Pencil />
          แก้ไข
        </Link>
        <Button variant="destructive" disabled={deleting} onClick={deletePromotion}>
          <Trash2 />
          {deleting ? "กำลังลบ..." : "ลบ Promotion"}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
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
