import { CouponEditor } from "@/components/coupon-editor";
import { getAdminCouponCampaigns } from "@/lib/admin-coupon-campaigns";
import { getAdminCategories } from "@/lib/admin-products";

export default async function NewCouponPage() {
  const [{ categories }, campaignResult] = await Promise.all([
    getAdminCategories(),
    getAdminCouponCampaigns(),
  ]);

  return (
    <CouponEditor
      campaigns={campaignResult.campaigns}
      categories={categories}
    />
  );
}
