import { cookies } from "next/headers";
import { PonPonApiError, ponponApiJson } from "@/lib/ponpon-api";

export type CouponCampaignStatus = "active" | "inactive" | "upcoming" | "ended";

export type CouponCampaign = {
  id: string;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  status: CouponCampaignStatus;
  totalCoupons: number;
  usedCoupons: number;
  remainingCoupons: number;
  usageCount: number;
  totalDiscountAmount: number;
  promotionCount: number;
  activePromotionCount: number;
  promotionUsageCount: number;
  promotionDiscountAmount: number;
};

type CampaignApiResponse = Partial<CouponCampaign> & {
  startsAtUtc?: string | null;
  endsAtUtc?: string | null;
  couponCount?: number;
  totalCouponCount?: number;
  usedCouponCount?: number;
  remainingCouponCount?: number;
  totalUsageCount?: number;
  discountAmountTotal?: number;
  promotionCount?: number;
  activePromotionCount?: number;
  promotionUsageCount?: number;
  promotionDiscountAmount?: number;
};

type CampaignListResponse =
  | CampaignApiResponse[]
  | {
      items?: CampaignApiResponse[];
      campaigns?: CampaignApiResponse[];
      data?: CampaignApiResponse[];
    };

export async function getAdminCouponCampaigns(): Promise<{
  authRequired: boolean;
  campaigns: CouponCampaign[];
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const response = await ponponApiJson<CampaignListResponse>(
      "/api/admin/coupon-campaigns",
      { headers: token ? { authorization: `Bearer ${token}` } : undefined },
    );
    const items = Array.isArray(response)
      ? response
      : response.items ?? response.campaigns ?? response.data ?? [];

    return {
      authRequired: false,
      campaigns: items.map(normalizeCouponCampaign),
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true, campaigns: [] };
    }
    return {
      authRequired: false,
      campaigns: [],
      error: error instanceof Error ? error.message : "Cannot load coupon campaigns",
    };
  }
}

export async function getAdminCouponCampaign(id: string): Promise<{
  authRequired: boolean;
  campaign?: CouponCampaign;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const response = await ponponApiJson<CampaignApiResponse>(
      `/api/admin/coupon-campaigns/${id}`,
      { headers: token ? { authorization: `Bearer ${token}` } : undefined },
    );
    return {
      authRequired: false,
      campaign: normalizeCouponCampaign(response),
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true };
    }
    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load coupon campaign",
    };
  }
}

function normalizeCouponCampaign(campaign: CampaignApiResponse): CouponCampaign {
  const startDate = campaign.startDate ?? campaign.startsAtUtc ?? null;
  const endDate = campaign.endDate ?? campaign.endsAtUtc ?? null;
  const totalCoupons = numberValue(
    campaign.totalCoupons ?? campaign.totalCouponCount ?? campaign.couponCount,
  );
  const usedCoupons = numberValue(
    campaign.usedCoupons ?? campaign.usedCouponCount,
  );

  return {
    id: campaign.id ?? "",
    name: campaign.name ?? "",
    description: campaign.description ?? "",
    startDate,
    endDate,
    isActive: campaign.isActive ?? false,
    status: normalizeStatus(campaign.status, campaign.isActive, startDate, endDate),
    totalCoupons,
    usedCoupons,
    remainingCoupons: numberValue(
      campaign.remainingCoupons ??
        campaign.remainingCouponCount ??
        Math.max(0, totalCoupons - usedCoupons),
    ),
    usageCount: numberValue(campaign.usageCount ?? campaign.totalUsageCount),
    totalDiscountAmount: numberValue(
      campaign.totalDiscountAmount ?? campaign.discountAmountTotal,
    ),
    promotionCount: numberValue(campaign.promotionCount),
    activePromotionCount: numberValue(campaign.activePromotionCount),
    promotionUsageCount: numberValue(campaign.promotionUsageCount),
    promotionDiscountAmount: numberValue(campaign.promotionDiscountAmount),
  };
}

function normalizeStatus(
  status: string | undefined,
  isActive: boolean | undefined,
  startDate: string | null,
  endDate: string | null,
): CouponCampaignStatus {
  if (
    status === "active" ||
    status === "inactive" ||
    status === "upcoming" ||
    status === "ended"
  ) {
    return status;
  }
  if (isActive === false) return "inactive";

  const now = Date.now();
  const startsAt = startDate ? new Date(startDate).getTime() : Number.NaN;
  const endsAt = endDate ? new Date(endDate).getTime() : Number.NaN;
  if (Number.isFinite(startsAt) && startsAt > now) return "upcoming";
  if (Number.isFinite(endsAt) && endsAt < now) return "ended";
  return "active";
}

function numberValue(value: number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("pp_admin_access_token")?.value;
}
