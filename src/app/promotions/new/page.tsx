import { redirect } from "next/navigation";
import { PromotionEditor } from "@/components/promotion-editor";
import { getAdminCouponCampaigns } from "@/lib/admin-coupon-campaigns";
import { getAdminCategories } from "@/lib/admin-products";

export default async function NewPromotionPage() {
  const [campaignResult, categoryResult] = await Promise.all([
    getAdminCouponCampaigns(),
    getAdminCategories(),
  ]);
  if (campaignResult.authRequired) redirect("/login");

  return (
    <PromotionEditor
      campaigns={campaignResult.campaigns}
      categories={categoryResult.categories}
    />
  );
}
