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

export type DashboardPeriod = "day" | "week" | "month" | "year";

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
  shipping: {
    inTransit: number;
    delivered: number;
    returned: number;
    total: number;
    latest: DashboardShippingItem[];
  };
  zortSync: {
    succeeded: number;
    pending: number;
    failed: number;
    lastSuccessfulAt: string | null;
  };
};

export type DashboardShippingItem = {
  id: string;
  orderId: string | null;
  orderNumber: string | null;
  customerName: string | null;
  carrier: string | null;
  trackingNo: string | null;
  status: "in_transit" | "delivered" | "returned" | string;
  statusLabel: string;
  updatedAt: string | null;
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

type DashboardShippingResult = {
  authRequired: boolean;
  error?: string;
  shipping: DashboardData["shipping"] | null;
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

function dashboardShippingPath(period: Exclude<DashboardPeriod, "year">) {
  const params = new URLSearchParams({
    date: bangkokDate(),
    period,
    timeZone: "Asia/Bangkok",
  });

  return `/api/admin/dashboard/shipping?${params.toString()}`;
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

export async function getAdminDashboardShipping(
  period: Exclude<DashboardPeriod, "year">,
): Promise<DashboardShippingResult> {
  const token = await getAccessToken();
  const headers = token ? { authorization: `Bearer ${token}` } : undefined;

  try {
    const response = await ponponApiJson<unknown>(dashboardShippingPath(period), {
      headers,
    });

    return {
      authRequired: false,
      shipping: normalizeShippingSummary(response),
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return {
        authRequired: true,
        error: error.message,
        shipping: null,
      };
    }

    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load shipping dashboard",
      shipping: null,
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
    shipping: normalizeShippingSummary(data.shipping ?? (data as unknown as UnknownRecord).delivery),
  };
}

function normalizeShippingSummary(value: unknown): DashboardData["shipping"] {
  const record = isRecord(value) ? value : {};
  const inTransit = numberFromKeys(record, [
    "inTransit",
    "shipping",
    "delivering",
    "inTransitCount",
    "shippingCount",
  ]);
  const delivered = numberFromKeys(record, [
    "delivered",
    "deliveryCompleted",
    "completed",
    "deliveredCount",
    "successCount",
  ]);
  const returned = numberFromKeys(record, [
    "returned",
    "return",
    "returnedCount",
    "returnCount",
    "returnToSender",
    "returnedToSender",
    "returnToSenderCount",
    "returnedToSenderCount",
    "failedShipment",
    "failedShipmentCount",
  ]);

  return {
    delivered,
    inTransit,
    latest: normalizeShippingItems(record.latest ?? record.items ?? record.recent),
    returned,
    total: numberFromKeys(record, ["total", "totalItems", "count"], inTransit + delivered + returned),
  };
}

function normalizeShippingItems(value: unknown): DashboardShippingItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 5).map((item) => {
    const record = isRecord(item) ? item : {};
    const status = String(record.status ?? record.shippingStatus ?? "");
    return {
      id: String(record.id ?? record.orderId ?? record.trackingNo ?? ""),
      orderId: stringOrNull(record.orderId ?? record.id),
      orderNumber: stringOrNull(record.orderNumber ?? record.number),
      customerName: stringOrNull(record.customerName ?? record.customer),
      carrier: stringOrNull(record.carrier ?? record.shippingCarrier ?? record.shippingChannel),
      trackingNo: stringOrNull(record.trackingNo ?? record.trackingNumber),
      status: normalizeShippingStatus(status),
      statusLabel: String(record.statusLabel ?? shippingStatusLabel(status)),
      updatedAt: stringOrNull(record.updatedAt ?? record.updatedAtUtc ?? record.shippingDate ?? record.shippedAt ?? record.deliveredAt ?? record.orderDate),
    };
  });
}

function normalizeShippingStatus(status: string) {
  const normalized = status.trim().replace(/[\s-]/g, "_").toLowerCase();
  if (["intransit", "in_transit", "shipping", "delivering", "pickedup", "picked_up", "carrier_picked_up", "carrier_accepted"].includes(normalized)) {
    return "in_transit";
  }
  if (["delivered", "completed", "success", "delivery_completed"].includes(normalized)) {
    return "delivered";
  }
  if (["returned", "return", "failedshipment", "failed_shipment", "return_to_sender", "returned_to_sender", "rts"].includes(normalized)) {
    return "returned";
  }
  return normalized || status;
}

function shippingStatusLabel(status: string) {
  const normalized = normalizeShippingStatus(status);
  if (normalized === "in_transit") return "กำลังจัดส่ง";
  if (normalized === "delivered") return "ส่งสำเร็จแล้ว";
  if (normalized === "returned") return "สินค้าตีกลับ";
  return status || "ไม่ระบุสถานะ";
}

function numberFromKeys(record: UnknownRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return Number(value) || 0;
  }
  return fallback;
}

function stringOrNull(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value);
  return text ? text : null;
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
