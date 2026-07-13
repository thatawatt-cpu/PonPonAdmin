"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

async function extractErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { message?: string };
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

export function FlashSaleCardActions({
  flashSaleId,
  flashSaleName,
  hasReservedQuota,
}: {
  flashSaleId: string;
  flashSaleName: string;
  hasReservedQuota: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm(`ต้องการลบ Flash Sale "${flashSaleName}" ใช่หรือไม่?`)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/backend/admin/flash-sales/${flashSaleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res, "ลบไม่สำเร็จ"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {hasReservedQuota ? (
          <span
            title="มีออเดอร์จองโควตาอยู่ ไม่สามารถลบได้"
            className="grid size-8 place-items-center rounded-md text-muted-foreground"
          >
            <Lock className="size-4" />
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={deleting}
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        )}
        <Link
          href={`/flash-sale/${flashSaleId}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil />
          แก้ไข
        </Link>
      </div>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
