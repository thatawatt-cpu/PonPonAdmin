import { notFound, redirect } from "next/navigation";
import { PromotionEditor } from "@/components/promotion-editor";
import { getAdminCouponCampaigns } from "@/lib/admin-coupon-campaigns";
import { getAdminCategories } from "@/lib/admin-products";
import { getAdminPromotion } from "@/lib/admin-promotions";

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [promotionResult, campaignResult, categoryResult] = await Promise.all([
    getAdminPromotion(id),
    getAdminCouponCampaigns(),
    getAdminCategories(),
  ]);
  if (promotionResult.authRequired || campaignResult.authRequired) redirect("/login");
  if (!promotionResult.promotion) notFound();

  return (
    <PromotionEditor
      campaigns={campaignResult.campaigns}
      categories={categoryResult.categories}
      initialData={promotionResult.promotion}
    />
  );
}
