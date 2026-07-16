import { cookies } from "next/headers";
import { PonPonApiError, ponponApiJson } from "@/lib/ponpon-api";

export type CouponType = "fixed" | "percentage" | "free_shipping";

export type CouponScope =
  | { type: "product"; productId: string }
  | { type: "variant"; variantId: string }
  | { type: "sku"; sku: string }
  | { type: "category"; zortCategoryId: number }
  | { type: "category"; categoryName: string };

export type CouponCustomerScope =
  | { type: "new_customer" }
  | { type: "first_order" }
  | { type: "existing_customer" }
  | { type: "customer"; customerId: string };

export type CouponCondition = {
  type: "sales_channel" | "payment_method" | "shipping_channel";
  value: string;
};

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description: string;
  type: CouponType;
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  combinableWithFlashSale: boolean;
  canStackWithPromotions: boolean;
  canStackWithCoupons: boolean;
  maxTotalUsage: number | null;
  maxUsagePerCustomer: number | null;
  usedCount: number;
  isActive: boolean;
  campaignId?: string | null;
  campaignName?: string | null;
  batchId?: string | null;
  scopes?: CouponScope[];
  customerScopes?: CouponCustomerScope[];
  conditions?: CouponCondition[];
};

type CouponApiResponse = Partial<Coupon> & {
  id?: string;
  code?: string;
  name?: string;
  couponName?: string;
  description?: string | null;
  type?: CouponType;
  value?: number;
  minimumSubtotal?: number | null;
  maximumDiscount?: number | null;
  startsAtUtc?: string | null;
  endsAtUtc?: string | null;
  canCombineWithFlashSale?: boolean;
  canStackWithPromotions?: boolean;
  canStackWithCoupons?: boolean;
  maximumTotalUses?: number | null;
  maximumUsesPerCustomer?: number | null;
  couponCampaignId?: string | null;
  couponCampaignName?: string | null;
  bulkBatchId?: string | null;
};

export type CouponUsage = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  orderTotal?: number | null;
  couponCode?: string | null;
  couponName?: string | null;
  discountAmount: number;
  usedAt?: string | null;
  usedAtUtc?: string | null;
};

export type CouponAuditLog = {
  id: string;
  couponId: string;
  batchId: string | null;
  action: "created" | "updated" | "deleted" | "deactivated" | "bulk_generated" | string;
  actorUserId: string | null;
  actorUserType: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  createdAtUtc: string;
};

export type CouponBulkGenerateJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type CouponBulkGenerateJob = {
  jobId: string;
  batchId: string | null;
  backgroundJobId: string | null;
  status: CouponBulkGenerateJobStatus;
  requestedCount: number;
  createdCount: number;
  error: string | null;
  createdAtUtc: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
};

type CouponBulkGenerateJobApiResponse = Partial<CouponBulkGenerateJob> & {
  id?: string;
  generatedCount?: number;
  completedCount?: number;
  errorMessage?: string | null;
};

export async function getAdminCoupons(campaignId?: string): Promise<{
  authRequired: boolean;
  coupons: Coupon[];
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const query = campaignId
      ? `?campaignId=${encodeURIComponent(campaignId)}`
      : "";
    const response = await ponponApiJson<CouponApiResponse[]>(
      `/api/admin/coupons${query}`,
      {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      },
    );
    const coupons = response.map(normalizeCoupon);
    return { authRequired: false, coupons };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true, coupons: [] };
    }
    return {
      authRequired: false,
      coupons: [],
      error: error instanceof Error ? error.message : "Cannot load coupons",
    };
  }
}

export async function getAdminCoupon(id: string): Promise<{
  authRequired: boolean;
  coupon?: Coupon;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const response = await ponponApiJson<CouponApiResponse>(`/api/admin/coupons/${id}`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    const coupon = normalizeCoupon(response);
    return { authRequired: false, coupon };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true };
    }
    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load coupon",
    };
  }
}

export async function getAdminCouponBulkGenerateJobs(take = 50): Promise<{
  authRequired: boolean;
  jobs: CouponBulkGenerateJob[];
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const response = await ponponApiJson<
      | CouponBulkGenerateJobApiResponse[]
      | {
          items?: CouponBulkGenerateJobApiResponse[];
          jobs?: CouponBulkGenerateJobApiResponse[];
        }
    >(`/api/admin/coupons/bulk-generate-jobs?take=${take}`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    const items = Array.isArray(response)
      ? response
      : response.items ?? response.jobs ?? [];
    return {
      authRequired: false,
      jobs: items.map(normalizeBulkGenerateJob),
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true, jobs: [] };
    }
    return {
      authRequired: false,
      jobs: [],
      error:
        error instanceof Error
          ? error.message
          : "Cannot load coupon generation history",
    };
  }
}

function normalizeCoupon(coupon: CouponApiResponse): Coupon {
  return {
    id: coupon.id ?? "",
    code: coupon.code ?? "",
    name: coupon.name ?? coupon.couponName ?? coupon.code ?? "",
    description: coupon.description ?? "",
    type: coupon.type ?? "fixed",
    discountValue: Number(coupon.discountValue ?? coupon.value ?? 0),
    minOrderAmount: coupon.minOrderAmount ?? coupon.minimumSubtotal ?? null,
    maxDiscountAmount: coupon.maxDiscountAmount ?? coupon.maximumDiscount ?? null,
    startDate: coupon.startDate ?? coupon.startsAtUtc ?? null,
    endDate: coupon.endDate ?? coupon.endsAtUtc ?? null,
    combinableWithFlashSale:
      coupon.combinableWithFlashSale ?? coupon.canCombineWithFlashSale ?? false,
    canStackWithPromotions: coupon.canStackWithPromotions ?? true,
    canStackWithCoupons: coupon.canStackWithCoupons ?? true,
    maxTotalUsage: coupon.maxTotalUsage ?? coupon.maximumTotalUses ?? null,
    maxUsagePerCustomer:
      coupon.maxUsagePerCustomer ?? coupon.maximumUsesPerCustomer ?? null,
    usedCount: Number(coupon.usedCount ?? 0),
    isActive: coupon.isActive ?? false,
    campaignId: coupon.campaignId ?? coupon.couponCampaignId ?? null,
    campaignName: coupon.campaignName ?? coupon.couponCampaignName ?? null,
    batchId: coupon.batchId ?? coupon.bulkBatchId ?? null,
    scopes: coupon.scopes ?? [],
    customerScopes: coupon.customerScopes ?? [],
    conditions: (coupon.conditions ?? []).filter(isPricingConditionEnabled),
  };
}

function isPricingConditionEnabled(condition: CouponCondition) {
  return condition.type === "sales_channel" || condition.type === "shipping_channel";
}

export function normalizeBulkGenerateJob(
  job: CouponBulkGenerateJobApiResponse,
): CouponBulkGenerateJob {
  const rawStatus = String(job.status ?? "pending").toLowerCase();
  const status: CouponBulkGenerateJobStatus =
    rawStatus === "running" ||
    rawStatus === "completed" ||
    rawStatus === "failed"
      ? rawStatus
      : "pending";

  return {
    jobId: job.jobId ?? job.id ?? "",
    batchId: job.batchId ?? null,
    backgroundJobId: job.backgroundJobId ?? null,
    status,
    requestedCount: Number(job.requestedCount ?? 0),
    createdCount: Number(
      job.createdCount ?? job.generatedCount ?? job.completedCount ?? 0,
    ),
    error: job.error ?? job.errorMessage ?? null,
    createdAtUtc: job.createdAtUtc ?? null,
    startedAtUtc: job.startedAtUtc ?? null,
    completedAtUtc: job.completedAtUtc ?? null,
  };
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("pp_admin_access_token")?.value;
}
