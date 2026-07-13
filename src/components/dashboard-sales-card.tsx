"use client";

import { CircleDollarSign } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { DashboardData, DashboardPeriod } from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

type DashboardSalesSnapshot = Pick<
  DashboardData,
  "date" | "period" | "sales" | "startDate" | "endDate"
>;

const salesPeriodOptions: Array<{
  label: string;
  value: DashboardPeriod;
}> = [
  { label: "วันนี้", value: "day" },
  { label: "เดือนนี้", value: "month" },
  { label: "ปีนี้", value: "year" },
];

export function DashboardSalesCard({
  dashboard,
}: {
  dashboard: DashboardSalesSnapshot;
}) {
  const [data, setData] = useState(dashboard);
  const [pendingPeriod, setPendingPeriod] = useState<DashboardPeriod | null>(
    null,
  );
  const [error, setError] = useState("");
  const activePeriod = pendingPeriod ?? data.period;
  const periodLabel = salesPeriodOptions.find(
    (option) => option.value === activePeriod,
  )!.label;
  const isLoading = pendingPeriod !== null;

  const periodRange = useMemo(
    () => `${data.startDate} ถึง ${data.endDate}`,
    [data.endDate, data.startDate],
  );
  const comparison = formatSalesComparison(data.sales);

  async function selectPeriod(period: DashboardPeriod) {
    if (period === data.period || pendingPeriod === period) {
      return;
    }

    setError("");
    setPendingPeriod(period);

    try {
      const nextDashboard = await fetchDashboardPeriod(period, data.date);

      setData({
        date: nextDashboard.date,
        endDate: nextDashboard.endDate,
        period: nextDashboard.period,
        sales: nextDashboard.sales,
        startDate: nextDashboard.startDate,
      });
      replacePeriodUrl(nextDashboard.period);
    } catch {
      setError("โหลดช่วงยอดขายไม่สำเร็จ");
    } finally {
      setPendingPeriod(null);
    }
  }

  return (
    <Card className="border-primary/25">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2 leading-none">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <CircleDollarSign className="size-4" />
              </span>
              <span className="leading-none">ยอดขาย</span>
            </CardTitle>
            <CardDescription className="flex min-h-5 items-center gap-1.5 pl-10 text-xs leading-5">
              {isLoading ? (
                <>
                  <Spinner className="size-3.5" />
                  กำลังโหลด{periodLabel}
                </>
              ) : (
                periodLabel
              )}
            </CardDescription>
          </div>
          <CardAction>
            <div className="inline-flex rounded-lg border bg-muted p-1">
              {salesPeriodOptions.map((option) => {
                const active = option.value === activePeriod;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectPeriod(option.value)}
                    disabled={isLoading}
                    className={cn(
                      "h-9 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:opacity-80",
                      active && "bg-background text-foreground shadow-sm",
                    )}
                    aria-pressed={active}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent aria-busy={isLoading}>
        <div className={cn("transition-opacity", isLoading && "opacity-60")}>
          <p className="text-3xl font-black leading-none tracking-tight">
            {formatMoney(data.sales.total)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {data.sales.orderCount} ออเดอร์ · เฉลี่ย{" "}
            {formatMoney(data.sales.averagePerOrder)}
          </p>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isLoading ? "กำลังอัปเดตช่วงวันที่..." : periodRange}
        </p>
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-3">
          <SalesMiniMetric
            loading={isLoading}
            label="ออเดอร์"
            value={data.sales.orderCount.toLocaleString("th-TH")}
          />
          <SalesMiniMetric
            loading={isLoading}
            label="เฉลี่ย"
            value={formatCompactMoney(data.sales.averagePerOrder)}
          />
          <SalesMiniMetric
            loading={isLoading}
            label={`เทียบ${data.sales.comparisonLabel}`}
            tone={comparison.tone}
            value={comparison.value}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SalesMiniMetric({
  label,
  loading,
  tone = "neutral",
  value,
}: {
  label: string;
  loading: boolean;
  tone?: "negative" | "neutral" | "positive";
  value: string;
}) {
  return (
    <div className="min-w-0 border-l pl-3 first:border-l-0 first:pl-0">
      <p className="truncate text-[11px] font-medium text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-black transition-opacity",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-destructive",
          loading && "opacity-60",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatSalesComparison(sales: DashboardData["sales"]): {
  tone: "negative" | "neutral" | "positive";
  value: string;
} {
  if (sales.changePercent === null) {
    return {
      tone: "neutral",
      value: "ไม่มีข้อมูล",
    };
  }

  const sign = sales.changeAmount > 0 ? "+" : "";
  const percentSign = sales.changePercent > 0 ? "+" : "";
  const percent = sales.changePercent.toLocaleString("th-TH", {
    maximumFractionDigits: 1,
  });

  return {
    tone:
      sales.changeAmount > 0
        ? "positive"
        : sales.changeAmount < 0
          ? "negative"
          : "neutral",
    value: `${sign}${formatCompactMoney(sales.changeAmount)} / ${percentSign}${percent}%`,
  };
}

async function fetchDashboardPeriod(period: DashboardPeriod, date: string) {
  const params = new URLSearchParams({
    date,
    lowStockThreshold: "5",
    period,
    timeZone: "Asia/Bangkok",
  });
  const response = await fetch(`/api/backend/admin/dashboard?${params}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Cannot load dashboard sales for ${period}`);
  }

  return (await response.json()) as DashboardData;
}

function replacePeriodUrl(period: DashboardPeriod) {
  const url = new URL(window.location.href);
  url.searchParams.set("period", period);
  window.history.replaceState(null, "", `${url.pathname}?${url.searchParams}`);
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatCompactMoney(value: number) {
  return value.toLocaleString("th-TH", {
    compactDisplay: "short",
    currency: "THB",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
  });
}
