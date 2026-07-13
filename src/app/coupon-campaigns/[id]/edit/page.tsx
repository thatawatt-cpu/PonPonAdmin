import { notFound, redirect } from "next/navigation";
import { CouponCampaignEditor } from "@/components/coupon-campaign-editor";
import { getAdminCouponCampaign } from "@/lib/admin-coupon-campaigns";

export default async function EditCouponCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authRequired, campaign } = await getAdminCouponCampaign(id);

  if (authRequired) redirect("/login");
  if (!campaign) notFound();

  return <CouponCampaignEditor initialData={campaign} />;
}
