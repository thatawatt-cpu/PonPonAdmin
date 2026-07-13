"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  LoaderCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { CouponBulkGenerateJob } from "@/lib/admin-coupons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CouponBulkJobHistory({
  initialJobs,
}: {
  initialJobs: CouponBulkGenerateJob[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingJobId, setDownloadingJobId] = useState("");
  const [error, setError] = useState("");
  const hasActiveJobs = jobs.some(
    (job) => job.status === "pending" || job.status === "running",
  );

  useEffect(() => {
    if (!hasActiveJobs) return;
    let polling = false;
    const timer = window.setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const response = await fetch(
          "/api/backend/admin/coupons/bulk-generate-jobs?take=50",
          { cache: "no-store" },
        );
        if (response.ok) setJobs(normalizeJobsResponse(await response.json()));
      } finally {
        polling = false;
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs]);

  async function refreshJobs() {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch(
        "/api/backend/admin/coupons/bulk-generate-jobs?take=50",
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("โหลดประวัติงานไม่สำเร็จ");
      setJobs(normalizeJobsResponse(await response.json()));
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "โหลดประวัติงานไม่สำเร็จ",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function downloadCodes(job: CouponBulkGenerateJob) {
    setDownloadingJobId(job.jobId);
    setError("");
    try {
      const response = await fetch(
        `/api/backend/admin/coupons/bulk-generate-jobs/${job.jobId}/codes`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("ดาวน์โหลดรายการโค้ดไม่สำเร็จ");
      const codes = normalizeCodesResponse(await response.json());
      const csv = ["code", ...codes.map(csvEscape)].join("\r\n");
      const url = URL.createObjectURL(
        new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `coupon-codes-${job.batchId || job.jobId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "ดาวน์โหลดรายการโค้ดไม่สำเร็จ",
      );
    } finally {
      setDownloadingJobId("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          แสดงงานล่าสุด {jobs.length.toLocaleString()} รายการ
          {hasActiveJobs ? " · อัปเดตอัตโนมัติทุก 4 วินาที" : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => void refreshJobs()}
        >
          <RefreshCw className={cn(refreshing && "animate-spin")} />
          อัปเดต
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-muted/60 text-xs font-bold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">วันที่สร้าง</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3 text-right">จำนวนที่ขอ</th>
              <th className="px-4 py-3 text-right">สร้างสำเร็จ</th>
              <th className="px-4 py-3">Batch ID</th>
              <th className="px-4 py-3">Job ID</th>
              <th className="px-4 py-3 text-right">ไฟล์</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map((job) => (
              <tr key={job.jobId} className="bg-background align-middle">
                <td className="whitespace-nowrap px-4 py-3">
                  {formatDateTime(job.createdAtUtc)}
                </td>
                <td className="px-4 py-3">
                  <JobStatus status={job.status} />
                  {job.status === "failed" && job.error ? (
                    <p className="mt-1 max-w-64 text-xs text-destructive">
                      {job.error}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {job.requestedCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {job.createdCount.toLocaleString()}
                </td>
                <td className="max-w-52 truncate px-4 py-3 font-mono text-xs">
                  {job.batchId || "-"}
                </td>
                <td className="max-w-52 truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                  {job.jobId}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      job.status !== "completed" ||
                      downloadingJobId === job.jobId
                    }
                    onClick={() => void downloadCodes(job)}
                  >
                    {downloadingJobId === job.jobId ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Download />
                    )}
                    CSV
                  </Button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                  ยังไม่มีประวัติการสร้างคูปองแบบกลุ่ม
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobStatus({ status }: { status: CouponBulkGenerateJob["status"] }) {
  const options = {
    pending: {
      label: "รอทำ",
      icon: Clock3,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    },
    running: {
      label: "กำลังสร้าง",
      icon: LoaderCircle,
      className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    },
    completed: {
      label: "สำเร็จ",
      icon: CheckCircle2,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
    failed: {
      label: "ล้มเหลว",
      icon: XCircle,
      className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
  } as const;
  const option = options[status];
  const Icon = option.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        option.className,
      )}
    >
      <Icon className={cn("size-3.5", status === "running" && "animate-spin")} />
      {option.label}
    </span>
  );
}

function normalizeJobsResponse(data: unknown): CouponBulkGenerateJob[] {
  const items = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as { items?: unknown[]; jobs?: unknown[] }).items ??
        (data as { jobs?: unknown[] }).jobs ??
        [])
      : [];
  return items.map((item) =>
    normalizeJob((item ?? {}) as Record<string, unknown>),
  );
}

function normalizeJob(data: Record<string, unknown>): CouponBulkGenerateJob {
  const rawStatus = String(data.status ?? "pending").toLowerCase();
  const status =
    rawStatus === "running" ||
    rawStatus === "completed" ||
    rawStatus === "failed"
      ? rawStatus
      : "pending";
  return {
    jobId: String(data.jobId ?? data.id ?? ""),
    batchId: data.batchId ? String(data.batchId) : null,
    backgroundJobId: data.backgroundJobId ? String(data.backgroundJobId) : null,
    status,
    requestedCount: Number(data.requestedCount ?? 0),
    createdCount: Number(
      data.createdCount ?? data.generatedCount ?? data.completedCount ?? 0,
    ),
    error: data.error
      ? String(data.error)
      : data.errorMessage
        ? String(data.errorMessage)
        : null,
    createdAtUtc: data.createdAtUtc ? String(data.createdAtUtc) : null,
    startedAtUtc: data.startedAtUtc ? String(data.startedAtUtc) : null,
    completedAtUtc: data.completedAtUtc ? String(data.completedAtUtc) : null,
  };
}

function normalizeCodesResponse(data: unknown) {
  if (Array.isArray(data)) return data.map(String);
  if (data && typeof data === "object" && "codes" in data) {
    const codes = (data as { codes?: unknown }).codes;
    return Array.isArray(codes) ? codes.map(String) : [];
  }
  return [];
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
