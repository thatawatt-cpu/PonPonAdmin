import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  CircleOff,
  Clock3,
  Plus,
  Tags,
} from "lucide-react";
import {
  getAdminCouponCampaigns,
  type CouponCampaign,
  type CouponCampaignStatus,
} from "@/lib/admin-coupon-campaigns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

const statusLabels: Record<CouponCampaignStatus, string> = {
  active: "กำลังใช้งาน",
  inactive: "ปิดใช้งาน",
  upcoming: "ยังไม่เริ่ม",
  ended: "หมดอายุ",
};

const statusVariants: Record<
  CouponCampaignStatus,
  "default" | "secondary" | "outline"
> = {
  active: "default",
  inactive: "secondary",
  upcoming: "outline",
  ended: "secondary",
};

export default async function CouponCampaignsPage() {
  const { authRequired, campaigns, error } = await getAdminCouponCampaigns();
  if (authRequired) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Promotions"
        title="Coupon Campaigns"
        description="จัดกลุ่มคูปองตามแคมเปญ ติดตามจำนวนคูปอง การใช้งาน และยอดส่วนลด"
        action={
          <Link href="/coupon-campaigns/new" className={buttonVariants()}>
            <Plus />
            สร้าง Campaign
          </Link>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>โหลด Campaign ไม่สำเร็จ: {error}</AlertDescription>
        </Alert>
      ) : null}

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Tags className="size-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-black">ยังไม่มี Coupon Campaign</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              สร้าง Campaign เพื่อจัดกลุ่มการ Generate คูปองและติดตามผลรวมในที่เดียว
            </p>
            <Link
              href="/coupon-campaigns/new"
              className={`mt-5 ${buttonVariants({ variant: "outline" })}`}
            >
              <Plus />
              สร้าง Campaign
            </Link>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </section>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CouponCampaign }) {
  return (
    <Link href={`/coupon-campaigns/${campaign.id}`} className="group">
      <Card className="h-full transition-colors group-hover:bg-muted/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Coupon Campaign
              </p>
              <CardTitle className="mt-1 truncate text-lg font-black">
                {campaign.name}
              </CardTitle>
            </div>
            <Badge variant={statusVariants[campaign.status]}>
              {statusLabels[campaign.status]}
            </Badge>
          </div>
          {campaign.description ? (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {campaign.description}
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 border-y border-border/70 py-4">
            <MiniStat label="คูปองทั้งหมด" value={campaign.totalCoupons} />
            <MiniStat label="ใช้แล้ว" value={campaign.usedCoupons} />
            <MiniStat label="คงเหลือ" value={campaign.remainingCoupons} />
          </div>
          <div className="grid grid-cols-2 gap-3 border-b border-border/70 py-4">
            <MiniStat label="Promotion ทั้งหมด" value={campaign.promotionCount} />
            <MiniStat label="Promotion เปิดอยู่" value={campaign.activePromotionCount} />
          </div>
          <div className="grid grid-cols-2 gap-3 border-b border-border/70 py-4">
            <MiniStat label="ใช้ Promotion" value={campaign.promotionUsageCount} />
            <MiniStat
              label="ส่วนลด Promotion"
              value={`฿${campaign.promotionDiscountAmount.toLocaleString()}`}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              {campaign.status === "inactive" ? (
                <CircleOff className="size-4 shrink-0" />
              ) : campaign.status === "upcoming" ? (
                <Clock3 className="size-4 shrink-0" />
              ) : (
                <CalendarDays className="size-4 shrink-0" />
              )}
              <span className="truncate">{formatCampaignPeriod(campaign)}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-lg font-black">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function formatCampaignPeriod(campaign: CouponCampaign) {
  if (!campaign.startDate && !campaign.endDate) return "ไม่จำกัดช่วงเวลา";
  if (!campaign.startDate) return `ถึง ${formatDate(campaign.endDate)}`;
  if (!campaign.endDate) return `เริ่ม ${formatDate(campaign.startDate)}`;
  return `${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}`;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);
}
