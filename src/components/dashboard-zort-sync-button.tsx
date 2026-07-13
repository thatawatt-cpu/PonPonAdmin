"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const syncRequests = [
  {
    body: {
      deactivateMissingProducts: false,
    },
    label: "สินค้า",
    path: "/api/backend/admin/products/sync-zort",
  },
  {
    body: {},
    label: "ออเดอร์",
    path: "/api/backend/admin/orders/sync-zort",
  },
];

export function DashboardZortSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function syncZort() {
    setLoading(true);
    setMessage("");

    const results = await Promise.allSettled(
      syncRequests.map(async (request) => {
        const response = await fetch(request.path, {
          body: JSON.stringify(request.body),
          headers: { "content-type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? `${request.label}ไม่สำเร็จ`);
        }

        return request.label;
      }),
    );

    const synced = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failed = syncRequests
      .filter((_, index) => results[index].status === "rejected")
      .map((request) => request.label);

    if (failed.length === 0) {
      setMessage(`ซิงก์${synced.join("และ")}สำเร็จ`);
    } else if (synced.length === 0) {
      setMessage(`ซิงก์${failed.join("และ")}ไม่สำเร็จ`);
    } else {
      setMessage(
        `ซิงก์${synced.join("และ")}สำเร็จ แต่${failed.join("และ")}ไม่สำเร็จ`,
      );
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button variant="secondary" onClick={syncZort} disabled={loading}>
        <RefreshCw className={loading ? "animate-spin" : undefined} />
        {loading ? "กำลังซิงก์..." : "ซิงก์ ZORT"}
      </Button>
      {message ? (
        <p className="max-w-64 text-xs text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
