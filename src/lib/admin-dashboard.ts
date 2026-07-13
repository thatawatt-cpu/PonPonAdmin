import { cookies } from "next/headers";
import { PonPonApiError, ponponApiJson } from "@/lib/ponpon-api";

export type DashboardOrder = {
  id: string;
  number: string;
  customerName: string | null;
  paymentStatus: string;
  amount: number;
  status: string;
  orderDate: string | null;
};

export type DashboardPeriod = "day" | "month" | "year";

export type DashboardAttentionProduct = {
  id: string;
  variantId: string | null;
  name: string;
  sku: string | null;
  variantCode: string | null;
  options: {
    name: string;
    value: string;
  }[];
  imageUrl: string | null;
  availableStock: number;
  status: 1 | 2 | 3 | 4 | number;
  issue: "LowStock" | "OutOfStock" | "SyncIssue";
};

export type DashboardData = {
  date: string;
  period: DashboardPeriod;
  startDate: string;
  endDate: string;
  timeZone: string;
  sales: {
    total: number;
    orderCount: number;
    averagePerOrder: number;
    previousTotal: number;
    previousOrderCount: number;
    previousAveragePerOrder: number;
    changeAmount: number;
    changePercent: number | null;
    comparisonLabel: "เมื่อวาน" | "เดือนก่อน" | "ปีก่อน";
  };
  orders: {
    pending: number;
    awaitingPacking: number;
    returnRequests: number;
    refundRequests: number;
    latest: DashboardOrder[];
  };
  inventory: {
    lowStock: number;
    outOfStock: number;
    lowStockThreshold: number;
    attentionProducts: DashboardAttentionProduct[];
  };
  payments: {
    total: number;
    paid: number;
    pending: number;
    partialPayment: number;
    excessPayment: number;
    voided: number;
  };
  zortSync: {
    succeeded: number;
    pending: number;
    failed: number;
    lastSuccessfulAt: string | null;
  };
};

export type DashboardSyncRun = {
  id: string;
  type: "Products" | "Orders" | string;
  backgroundJobId?: string | null;
  status: string;
  totalFetched: number;
  created?: number;
  updated?: number;
  unchanged?: number;
  deactivated?: number;
  failed: number;
  errors: string[];
  requestedAtUtc: string;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
};

type DashboardResult = {
  authRequired: boolean;
  dashboard: DashboardData | null;
  error?: string;
  syncRuns: DashboardSyncRun[];
};

function dashboardPath(period: DashboardPeriod) {
  const params = new URLSearchParams({
    date: bangkokDate(),
    lowStockThreshold: "5",
    period,
    timeZone: "Asia/Bangkok",
  });

  return `/api/admin/dashboard?${params.toString()}`;
}

function bangkokDate() {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export async function getAdminDashboard(
  period: DashboardPeriod,
): Promise<DashboardResult> {
  const token = await getAccessToken();
  const headers = token ? { authorization: `Bearer ${token}` } : undefined;

  try {
    const dashboardResponse = await ponponApiJson<unknown>(dashboardPath(period), {
      headers,
    });
    const dashboard = normalizeDashboardData(dashboardResponse);
    let syncRuns: DashboardSyncRun[] = [];
    let syncRunsError: string | undefined;

    try {
      syncRuns = await ponponApiJson<DashboardSyncRun[]>(
        "/api/admin/dashboard/sync-runs?limit=20",
        { headers },
      );
    } catch (error) {
      syncRunsError =
        error instanceof Error ? error.message : "Cannot load sync history";
    }

    return {
      authRequired: false,
      dashboard,
      error: syncRunsError,
      syncRuns,
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return {
        authRequired: true,
        dashboard: null,
        error: error.message,
        syncRuns: [],
      };
    }

    return {
      authRequired: false,
      dashboard: null,
      error: error instanceof Error ? error.message : "Cannot load dashboard",
      syncRuns: [],
    };
  }
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("pp_admin_access_token")?.value;
}

type UnknownRecord = Record<string, unknown>;

function normalizeDashboardData(value: unknown): DashboardData {
  const data = camelizeKeys(value) as DashboardData;
  const inventory = data.inventory ?? {
    attentionProducts: [],
    lowStock: 0,
    lowStockThreshold: 5,
    outOfStock: 0,
  };

  return {
    ...data,
    inventory: {
      ...inventory,
      attentionProducts: normalizeAttentionProducts(
        inventory.attentionProducts,
      ),
      lowStock: Number(inventory.lowStock ?? 0),
      lowStockThreshold: Number(inventory.lowStockThreshold ?? 5),
      outOfStock: Number(inventory.outOfStock ?? 0),
    },
  };
}

function normalizeAttentionProducts(
  value: DashboardAttentionProduct[] | unknown,
): DashboardAttentionProduct[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const product = item as Partial<DashboardAttentionProduct>;

    return {
      id: String(product.id ?? ""),
      variantId: product.variantId ?? null,
      name: String(product.name ?? "Untitled product"),
      sku: product.sku ?? null,
      variantCode: product.variantCode ?? null,
      options: Array.isArray(product.options)
        ? product.options.map((option) => ({
            name: String(option.name ?? ""),
            value: String(option.value ?? ""),
          }))
        : [],
      imageUrl: product.imageUrl ?? null,
      availableStock: Number(product.availableStock ?? 0),
      status: Number(product.status ?? 2),
      issue: normalizeAttentionIssue(product.issue),
    };
  });
}

function normalizeAttentionIssue(
  issue: DashboardAttentionProduct["issue"] | unknown,
): DashboardAttentionProduct["issue"] {
  const normalized = String(issue ?? "").replace(/[_\s-]/g, "").toLowerCase();

  if (normalized === "outofstock" || normalized === "soldout") {
    return "OutOfStock";
  }

  if (normalized === "syncissue" || normalized === "syncerror") {
    return "SyncIssue";
  }

  return "LowStock";
}

function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeKeys(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      camelizeKey(key),
      camelizeKeys(item),
    ]),
  );
}

function camelizeKey(key: string) {
  return key ? key[0].toLowerCase() + key.slice(1) : key;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}
