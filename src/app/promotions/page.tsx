import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { getAdminCouponCampaigns } from "@/lib/admin-coupon-campaigns";
import { getAdminPromotions } from "@/lib/admin-promotions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PromotionCard } from "@/components/promotion-card";
import { PromotionFilterBar } from "@/components/promotion-filter-bar";

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { campaignId: campaignIdParam, status: statusParam, type: typeParam } =
    await searchParams;
  const campaignId = typeof campaignIdParam === "string" ? campaignIdParam : "";
  const status = typeof statusParam === "string" ? statusParam : "";
  const type = typeof typeParam === "string" ? typeParam : "";

  const [promotionResult, campaignResult] = await Promise.all([
    getAdminPromotions(campaignId || undefined),
    getAdminCouponCampaigns(),
  ]);

  if (promotionResult.authRequired || campaignResult.authRequired) redirect("/login");

  let promotions = promotionResult.promotions;
  if (status === "active" || status === "inactive") {
    promotions = promotions.filter((promotion) => promotion.isActive === (status === "active"));
  }
  if (type) {
    promotions = promotions.filter((promotion) => promotion.type === type);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Promotions"
        title="Promotions"
        description="Promotion คือส่วนลดอัตโนมัติ ลูกค้าไม่ต้องกรอกคูปอง สามารถผูกกับ Campaign หรือไม่ผูกก็ได้ ถ้าผูก Campaign จะถูกควบคุมด้วยสถานะและช่วงเวลาของ Campaign ด้วย"
        action={
          <Link href="/promotions/new" className={buttonVariants()}>
            <Plus />
            สร้าง Promotion
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <PromotionFilterBar campaigns={campaignResult.campaigns} />
        </CardContent>
      </Card>

      {promotionResult.error || campaignResult.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            โหลด Promotion ไม่สำเร็จ: {promotionResult.error || campaignResult.error}
          </AlertDescription>
        </Alert>
      ) : null}

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Sparkles className="size-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-black">ยังไม่มี Promotion</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              สร้างส่วนลดอัตโนมัติ เช่น ลดตามช่วงเวลา ส่งฟรี หรือราคาพิเศษ
            </p>
            <Link href="/promotions/new" className={`mt-5 ${buttonVariants({ variant: "outline" })}`}>
              <Plus />
              สร้าง Promotion
            </Link>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {promotions.map((promotion) => (
            <PromotionCard key={promotion.id} promotion={promotion} />
          ))}
        </section>
      )}
    </div>
  );
}
