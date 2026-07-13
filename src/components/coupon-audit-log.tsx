"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import type { CouponAuditLog as CouponAuditLogItem } from "@/lib/admin-coupons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

async function loadAuditLogs(couponId: string) {
  const response = await fetch(`/api/backend/admin/coupons/${couponId}/audit-logs`);
  if (!response.ok) throw new Error("โหลด Activity Log ไม่สำเร็จ");
  return (await response.json()) as CouponAuditLogItem[];
}

export function CouponAuditLog({ couponId }: { couponId: string }) {
  const [logs, setLogs] = useState<CouponAuditLogItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void loadAuditLogs(couponId)
      .then((data) => {
        if (active) setLogs(data);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "โหลด Activity Log ไม่สำเร็จ");
        }
      });

    return () => {
      active = false;
    };
  }, [couponId]);

  return (
    <Card id="activity-log" className="scroll-mt-24 rounded-2xl border-border/80 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <CardTitle>Activity Log</CardTitle>
        </div>
        <CardDescription>ประวัติการสร้าง แก้ไข ปิดใช้งาน และสร้างคูปองแบบกลุ่ม</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : logs === null ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">วันและเวลา</th>
                  <th className="px-4 py-3 font-semibold">รายการ</th>
                  <th className="px-4 py-3 font-semibold">ผู้ดำเนินการ</th>
                  <th className="px-4 py-3 font-semibold">ประเภทผู้ใช้</th>
                  <th className="px-4 py-3 font-semibold">Batch ID</th>
                  <th className="px-4 py-3 font-semibold">Before</th>
                  <th className="px-4 py-3 font-semibold">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{formatDateTime(log.createdAtUtc)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={log.action === "deleted" ? "destructive" : "secondary"}>
                        {actionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-xs">{log.actorUserId || "ระบบ"}</td>
                    <td className="px-4 py-3 text-xs">{log.actorUserType || "System"}</td>
                    <td className="max-w-48 truncate px-4 py-3 font-mono text-xs">
                      {log.batchId || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <AuditJsonDialogButton
                        value={log.beforeJson}
                        emptyLabel="ไม่มีข้อมูลก่อนหน้า"
                        title="ข้อมูลก่อนแก้ไข"
                        description="ข้อมูลคูปองก่อนเกิดรายการนี้"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <AuditJsonDialogButton
                        value={log.afterJson}
                        emptyLabel="ไม่มีข้อมูลหลังแก้ไข"
                        title="ข้อมูลหลังแก้ไข"
                        description="ข้อมูลคูปองหลังเกิดรายการนี้"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditJsonDialogButton({
  description,
  emptyLabel,
  title,
  value,
}: {
  description: string;
  emptyLabel: string;
  title: string;
  value: string | null;
}) {
  if (!value) return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="xs" />}>
        ดูข้อมูล
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border bg-muted/30">
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs leading-5 text-foreground">
            {prettyJson(value)}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function prettyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    bulk_generated: "สร้างแบบกลุ่ม",
    created: "สร้างคูปอง",
    deactivated: "ปิดใช้งาน",
    deleted: "ลบคูปอง",
    updated: "แก้ไขคูปอง",
  };

  return labels[action] ?? action;
}
