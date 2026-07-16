import { cookies } from "next/headers";
import { PonPonApiError, ponponApiJson } from "@/lib/ponpon-api";

export type PromotionType =
  | "auto_discount"
  | "flash_sale"
  | "free_shipping"
  | "special_price"
  | "bundle"
  | "buy_x_get_y";

export type PromotionDiscountType =
  | "fixed"
  | "percentage"
  | "special_price"
  | "free_shipping";

export type PromotionScheduleRuleType =
  | "daily_time"
  | "day_of_week"
  | "day_of_month";

export type PromotionScope = {
  type: "product" | "variant" | "sku" | "category";
  productId?: string | null;
  variantId?: string | null;
  sku?: string | null;
  categoryName?: string | null;
  isExclude?: boolean;
};

export type PromotionCustomerScope =
  | { type: "new_customer"; customerId?: null }
  | { type: "first_order"; customerId?: null }
  | { type: "existing_customer"; customerId?: null }
  | { type: "customer"; customerId: string };

export type PromotionCondition = {
  type: "sales_channel" | "payment_method" | "shipping_channel";
  value: string;
};

export type PromotionScheduleRule = {
  type: PromotionScheduleRuleType;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startsAtLocalTime: string | null;
  endsAtLocalTime: string | null;
};

export type Promotion = {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  name: string;
  description: string;
  type: PromotionType;
  discountType: PromotionDiscountType;
  discountValue: number;
  minimumSubtotal: number | null;
  maximumDiscount: number | null;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  timezone: string;
  priority: number;
  canStackWithCoupon: boolean;
  canStackWithPromotions: boolean;
  canCombineWithFlashSale: boolean;
  maximumTotalUses: number | null;
  maximumUsesPerCustomer: number | null;
  usedCount: number;
  totalDiscountAmount: number;
  isActive: boolean;
  scheduleRules: PromotionScheduleRule[];
  scopes: PromotionScope[];
  customerScopes: PromotionCustomerScope[];
  conditions: PromotionCondition[];
};

export type PromotionUsage = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  orderTotal?: number | null;
  promotionName?: string | null;
  discountAmount: number;
  usedAt?: string | null;
  usedAtUtc?: string | null;
};

type PromotionApiResponse = Partial<Promotion> & {
  couponCampaignId?: string | null;
  couponCampaignName?: string | null;
  campaign?: { id?: string; name?: string } | null;
  value?: number;
  usageCount?: number;
  discountAmountTotal?: number;
};

type PromotionListResponse =
  | PromotionApiResponse[]
  | {
      items?: PromotionApiResponse[];
      promotions?: PromotionApiResponse[];
      data?: PromotionApiResponse[];
    };

export async function getAdminPromotions(campaignId?: string): Promise<{
  authRequired: boolean;
  promotions: Promotion[];
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const query = campaignId
      ? `?campaignId=${encodeURIComponent(campaignId)}`
      : "";
    const response = await ponponApiJson<PromotionListResponse>(
      `/api/admin/promotions${query}`,
      { headers: token ? { authorization: `Bearer ${token}` } : undefined },
    );
    const items = Array.isArray(response)
      ? response
      : response.items ?? response.promotions ?? response.data ?? [];
    return {
      authRequired: false,
      promotions: items.map(normalizePromotion),
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true, promotions: [] };
    }
    return {
      authRequired: false,
      promotions: [],
      error: error instanceof Error ? error.message : "Cannot load promotions",
    };
  }
}

export async function getAdminPromotion(id: string): Promise<{
  authRequired: boolean;
  promotion?: Promotion;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const response = await ponponApiJson<PromotionApiResponse>(
      `/api/admin/promotions/${id}`,
      { headers: token ? { authorization: `Bearer ${token}` } : undefined },
    );
    return { authRequired: false, promotion: normalizePromotion(response) };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true };
    }
    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load promotion",
    };
  }
}

function normalizePromotion(promotion: PromotionApiResponse): Promotion {
  return {
    id: promotion.id ?? "",
    campaignId:
      promotion.campaignId ??
      promotion.couponCampaignId ??
      promotion.campaign?.id ??
      null,
    campaignName:
      promotion.campaignName ??
      promotion.couponCampaignName ??
      promotion.campaign?.name ??
      null,
    name: promotion.name ?? "",
    description: promotion.description ?? "",
    type: promotion.type ?? "auto_discount",
    discountType: promotion.discountType ?? "percentage",
    discountValue: numberValue(promotion.discountValue ?? promotion.value),
    minimumSubtotal: nullableNumber(promotion.minimumSubtotal),
    maximumDiscount: nullableNumber(promotion.maximumDiscount),
    startsAtUtc: promotion.startsAtUtc ?? null,
    endsAtUtc: promotion.endsAtUtc ?? null,
    timezone: promotion.timezone ?? "Asia/Bangkok",
    priority: numberValue(promotion.priority),
    canStackWithCoupon: promotion.canStackWithCoupon ?? true,
    canStackWithPromotions: promotion.canStackWithPromotions ?? true,
    canCombineWithFlashSale: promotion.canCombineWithFlashSale ?? true,
    maximumTotalUses: nullableNumber(promotion.maximumTotalUses),
    maximumUsesPerCustomer: nullableNumber(promotion.maximumUsesPerCustomer),
    usedCount: numberValue(promotion.usedCount ?? promotion.usageCount),
    totalDiscountAmount: numberValue(
      promotion.totalDiscountAmount ?? promotion.discountAmountTotal,
    ),
    isActive: promotion.isActive ?? false,
    scheduleRules: promotion.scheduleRules ?? [],
    scopes: promotion.scopes ?? [],
    customerScopes: promotion.customerScopes ?? [],
    conditions: (promotion.conditions ?? []).filter(isPricingConditionEnabled),
  };
}

function isPricingConditionEnabled(condition: PromotionCondition) {
  return condition.type === "sales_channel" || condition.type === "shipping_channel";
}

function numberValue(value: number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("pp_admin_access_token")?.value;
}
