"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ZortSyncButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function syncProducts() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/backend/admin/products/sync-zort", {
        body: JSON.stringify({
          deactivateMissingProducts: false,
          maxPages: 1,
          pageLimit: 100,
          pageStart: 1,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.message ?? "Sync ไม่สำเร็จ");
        return;
      }

      setMessage(
        `Sync สำเร็จ: เพิ่ม ${payload.created ?? 0}, อัปเดต ${payload.updated ?? 0}`,
      );
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อ API ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button onClick={syncProducts} disabled={loading}>
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {loading ? "กำลังซิงก์..." : "ซิงก์ข้อมูลตอนนี้"}
      </Button>
      {message ? (
        <p className="max-w-xs text-xs text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
