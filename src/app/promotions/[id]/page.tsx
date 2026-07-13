import { notFound, redirect } from "next/navigation";
import { CalendarClock, Coins, History, Tag, Users } from "lucide-react";
import { PromotionActions } from "@/components/promotion-actions";
import { PromotionUsageDialogLauncher } from "@/components/promotion-usage-dialog-launcher";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getAdminPromotion } from "@/lib/admin-promotions";

export default async function PromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { authRequired, error, promotion } = await getAdminPromotion(id);
  if (authRequired) redirect("/login");
  if (!promotion) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Promotion"
        title={promotion.name}
        description={promotion.description || "รายละเอียดส่วนลดอัตโนมัติ"}
        action={
          <div className="flex flex-wrap gap-2">
            <PromotionUsageDialogLauncher promotion={promotion} />
            <PromotionActions promotionId={promotion.id} promotionName={promotion.name} />
          </div>
        }
      />

      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={promotion.isActive ? "default" : "secondary"}>
          {promotion.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        </Badge>
        <Badge variant="outline">{typeLabel(promotion.type)}</Badge>
        {promotion.campaignName ? (
          <Badge variant="secondary">{promotion.campaignName}</Badge>
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Coins />} label="ส่วนลด" value={discountLabel(promotion)} />
        <StatCard icon={<History />} label="ใช้แล้ว" value={promotion.usedCount.toLocaleString()} />
        <StatCard icon={<Coins />} label="ยอดส่วนลดรวม" value={`฿${promotion.totalDiscountAmount.toLocaleString()}`} />
        <StatCard icon={<Tag />} label="Priority" value={promotion.priority.toLocaleString()} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-5 text-muted-foreground" />
              ช่วงเวลาและ Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="ช่วงวันที่" value={formatPeriod(promotion.startsAtUtc, promotion.endsAtUtc)} />
            <InfoRow label="Timezone" value={promotion.timezone} />
            {promotion.scheduleRules.length === 0 ? (
              <p className="text-muted-foreground">ไม่มี schedule rule เพิ่มเติม</p>
            ) : (
              promotion.scheduleRules.map((rule, index) => (
                <div key={index} className="rounded-xl border border-border p-3">
                  <p className="font-bold">{scheduleLabel(rule.type)}</p>
                  <p className="mt-1 text-muted-foreground">
                    {rule.dayOfWeek != null ? `วัน ${weekdayLabel(rule.dayOfWeek)} · ` : ""}
                    {rule.dayOfMonth != null ? `วันที่ ${rule.dayOfMonth} · ` : ""}
                    {rule.startsAtLocalTime ?? "-"} - {rule.endsAtLocalTime ?? "-"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              การใช้ร่วมกันและ Limit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="ใช้ร่วมกับคูปอง" value={promotion.canStackWithCoupon ? "ได้" : "ไม่ได้"} />
            <InfoRow label="ใช้ร่วมกับ Promotion อื่น" value={promotion.canStackWithPromotions ? "ได้" : "ไม่ได้"} />
            <InfoRow label="ใช้ร่วม Flash Sale" value={promotion.canCombineWithFlashSale ? "ได้" : "ไม่ได้"} />
            <InfoRow label="สิทธิ์ทั้งหมด" value={promotion.maximumTotalUses?.toLocaleString() ?? "ไม่จำกัด"} />
            <InfoRow label="ใช้ต่อคน" value={promotion.maximumUsesPerCustomer?.toLocaleString() ?? "ไม่จำกัด"} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <JsonListCard
          title="สินค้า/หมวดหมู่"
          empty="ใช้ได้ทั้ง order"
          items={promotion.scopes}
        />
        <JsonListCard
          title="ลูกค้าที่ใช้ได้"
          empty="ลูกค้าทุกคน"
          items={promotion.customerScopes}
        />
        <JsonListCard
          title="เงื่อนไขเพิ่มเติม"
          empty="ไม่มีเงื่อนไขเพิ่มเติม"
          items={promotion.conditions}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-black">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function JsonListCard({
  empty,
  items,
  title,
}: {
  empty: string;
  items: unknown[];
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5">
            {JSON.stringify(items, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    auto_discount: "ส่วนลดอัตโนมัติ",
    free_shipping: "ส่งฟรี",
    special_price: "ราคาพิเศษ",
    flash_sale: "Flash Sale",
    bundle: "Bundle",
    buy_x_get_y: "Buy X Get Y",
  };
  return labels[type] ?? type;
}

function discountLabel(promotion: { discountType: string; discountValue: number }) {
  if (promotion.discountType === "free_shipping") return "ส่งฟรี";
  if (promotion.discountType === "percentage") return `${promotion.discountValue.toLocaleString()}%`;
  return `฿${promotion.discountValue.toLocaleString()}`;
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "ไม่จำกัดช่วงเวลา";
  if (!start) return `ถึง ${formatDate(end)}`;
  if (!end) return `เริ่ม ${formatDate(start)}`;
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function scheduleLabel(type: string) {
  if (type === "daily_time") return "ทุกวันตามช่วงเวลา";
  if (type === "day_of_week") return "ทุกสัปดาห์ตามวัน";
  if (type === "day_of_month") return "ทุกเดือนตามวันที่";
  return type;
}

function weekdayLabel(value: number) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][value] ?? String(value);
}
