import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Sparkles, Ticket } from "lucide-react";
import { CouponCampaignActions } from "@/components/coupon-campaign-actions";
import { CouponCard } from "@/components/coupon-card";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAdminCouponCampaign,
  type CouponCampaignStatus,
} from "@/lib/admin-coupon-campaigns";
import { getAdminCoupons } from "@/lib/admin-coupons";
import { getAdminPromotions } from "@/lib/admin-promotions";
import { PromotionCard } from "@/components/promotion-card";

const statusLabels: Record<CouponCampaignStatus, string> = {
  active: "กำลังใช้งาน",
  inactive: "ปิดใช้งาน",
  upcoming: "ยังไม่เริ่ม",
  ended: "หมดอายุ",
};

export default async function CouponCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaignResult, couponResult, promotionResult] = await Promise.all([
    getAdminCouponCampaign(id),
    getAdminCoupons(id),
    getAdminPromotions(id),
  ]);

  if (campaignResult.authRequired || couponResult.authRequired || promotionResult.authRequired) redirect("/login");
  if (!campaignResult.campaign) notFound();

  const campaign = campaignResult.campaign;
  const coupons = couponResult.coupons;
  const totalCoupons = campaign.totalCoupons || coupons.length;
  const usedCoupons =
    campaign.usedCoupons || coupons.filter((coupon) => coupon.usedCount > 0).length;
  const remainingCoupons =
    campaign.totalCoupons > 0
      ? campaign.remainingCoupons
      : Math.max(0, totalCoupons - usedCoupons);
  const usageCount =
    campaign.usageCount ||
    coupons.reduce((total, coupon) => total + coupon.usedCount, 0);
  const promotions = promotionResult.promotions;
  const promotionCount = campaign.promotionCount || promotions.length;
  const activePromotionCount =
    campaign.activePromotionCount || promotions.filter((promotion) => promotion.isActive).length;
  const promotionUsageCount =
    campaign.promotionUsageCount ||
    promotions.reduce((total, promotion) => total + promotion.usedCount, 0);
  const promotionDiscountAmount =
    campaign.promotionDiscountAmount ||
    promotions.reduce((total, promotion) => total + promotion.totalDiscountAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coupon Campaign"
        title={campaign.name}
        description={campaign.description || "รายละเอียดและผลการใช้งานคูปองใน Campaign"}
        action={
          <CouponCampaignActions
            campaignId={campaign.id}
            campaignName={campaign.name}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
          {statusLabels[campaign.status]}
        </Badge>
        <span>{formatCampaignPeriod(campaign.startDate, campaign.endDate)}</span>
        {campaign.status !== "active" ? (
          <span className="font-medium text-amber-700 dark:text-amber-400">
            คูปองใน Campaign นี้ยังไม่สามารถใช้งานได้
          </span>
        ) : null}
      </div>

      {campaignResult.error || couponResult.error || promotionResult.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {campaignResult.error || couponResult.error || promotionResult.error}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>ภาพรวม Campaign</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-2">
          <SummaryPanel
            icon={<Ticket />}
            title="คูปอง"
            items={[
              { label: "คูปองทั้งหมด", value: totalCoupons },
              { label: "ใช้แล้ว", value: usedCoupons },
              { label: "คงเหลือ", value: remainingCoupons },
              { label: "จำนวนครั้งที่ใช้", value: usageCount },
              {
                label: "ยอดส่วนลดรวม",
                value: `฿${campaign.totalDiscountAmount.toLocaleString()}`,
              },
            ]}
          />
          <SummaryPanel
            icon={<Sparkles />}
            title="Promotions"
            items={[
              { label: "Promotion ทั้งหมด", value: promotionCount },
              { label: "เปิดใช้งาน", value: activePromotionCount },
              { label: "จำนวนครั้งที่ใช้", value: promotionUsageCount },
              {
                label: "ยอดส่วนลดรวม",
                value: `฿${promotionDiscountAmount.toLocaleString()}`,
              },
            ]}
          />
        </CardContent>
      </Card>

      <SectionHeader
        title="คูปองใน Campaign"
        description="รายการคูปองทั้งหมดที่สร้างภายใต้ Campaign นี้"
        href={`/coupons?campaignId=${encodeURIComponent(campaign.id)}`}
        actionLabel="ดูในหน้า Coupons"
      />

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-3 font-bold">ยังไม่มีคูปองใน Campaign นี้</p>
            <p className="mt-1 text-sm text-muted-foreground">
              เลือก Campaign นี้เมื่อใช้ Bulk Generate เพื่อเพิ่มคูปอง
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {coupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </section>
      )}

      <SectionHeader
        title="Promotions ใน Campaign"
        description="ส่วนลดอัตโนมัติทั้งหมดที่ผูกกับ Campaign นี้"
        href={`/promotions?campaignId=${encodeURIComponent(campaign.id)}`}
        actionLabel="ดูในหน้า Promotions"
      />

      {promotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-3 font-bold">ยังไม่มี Promotion ใน Campaign นี้</p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {promotions.map((promotion) => (
            <PromotionCard key={promotion.id} promotion={promotion} />
          ))}
        </section>
      )}
    </div>
  );
}

function SummaryPanel({
  icon,
  items,
  title,
}: {
  icon: React.ReactNode;
  items: { label: string; value: number | string }[];
  title: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </span>
        <h2 className="font-black">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 truncate text-xl font-black">
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  actionLabel,
  description,
  href,
  title,
}: {
  actionLabel: string;
  description: string;
  href: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Link href={href} className={buttonVariants({ variant: "outline" })}>
        {actionLabel}
      </Link>
    </div>
  );
}

function formatCampaignPeriod(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "ไม่จำกัดช่วงเวลา";
  if (!startDate) return `ถึง ${formatDate(endDate)}`;
  if (!endDate) return `เริ่ม ${formatDate(startDate)}`;
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);
}
