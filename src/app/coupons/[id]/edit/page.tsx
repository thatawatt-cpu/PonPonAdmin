import { notFound, redirect } from "next/navigation";
import { getAdminCouponCampaigns } from "@/lib/admin-coupon-campaigns";
import { getAdminCoupon } from "@/lib/admin-coupons";
import { getAdminCategories } from "@/lib/admin-products";
import { CouponAuditLog } from "@/components/coupon-audit-log";
import { CouponEditor, type CouponInitialData } from "@/components/coupon-editor";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ authRequired, coupon }, { categories }, campaignResult] = await Promise.all([
    getAdminCoupon(id),
    getAdminCategories(),
    getAdminCouponCampaigns(),
  ]);

  if (authRequired || campaignResult.authRequired) redirect("/login");
  if (!coupon) notFound();

  const initialData: CouponInitialData = {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    description: coupon.description,
    type: coupon.type,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
    startDate: coupon.startDate ?? "",
    endDate: coupon.endDate ?? "",
    combinableWithFlashSale: coupon.combinableWithFlashSale,
    canStackWithPromotions: coupon.canStackWithPromotions,
    canStackWithCoupons: coupon.canStackWithCoupons,
    maxTotalUsage: coupon.maxTotalUsage,
    maxUsagePerCustomer: coupon.maxUsagePerCustomer,
    isActive: coupon.isActive,
    campaignId: coupon.campaignId ?? null,
    scopes: coupon.scopes ?? [],
    customerScopes: coupon.customerScopes ?? [],
    conditions: coupon.conditions ?? [],
  };

  return (
    <div className="space-y-6">
      <CouponEditor
        campaigns={campaignResult.campaigns}
        categories={categories}
        initialData={initialData}
      />
      <CouponAuditLog couponId={coupon.id} />
    </div>
  );
}
