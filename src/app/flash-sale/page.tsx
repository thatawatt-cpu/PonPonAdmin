import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  CirclePlay,
  Flag,
  Megaphone,
  Package,
  Pencil,
  Percent,
  Plus,
  ShoppingBag,
  Tag,
  Timer,
  Zap,
} from "lucide-react";
import {
  getAdminFlashSales,
  type FlashSale,
  type FlashSaleStatus,
} from "@/lib/admin-flash-sales";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusLabel: Record<FlashSaleStatus, string> = {
  active: "กำลังแสดง",
  upcoming: "แบบร่าง",
  ended: "สิ้นสุดแล้ว",
};

const statusDescription: Record<FlashSaleStatus, string> = {
  active: "กำลังแสดงอยู่ในช่วงเวลา Flash Sale",
  upcoming: "ยังไม่เผยแพร่",
  ended: "จบช่วงเวลา Flash Sale",
};

const statusVariant: Record<FlashSaleStatus, "default" | "secondary" | "outline"> =
  {
    active: "default",
    upcoming: "outline",
    ended: "secondary",
  };

type FlashSaleFilter = "all" | FlashSaleStatus;

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
    new Date(dateStr),
  );
}

function getFlashSaleFilter(status?: string): FlashSaleFilter {
  if (status === "active" || status === "upcoming" || status === "ended") {
    return status;
  }

  return "all";
}

function getFilterLabel(filter: FlashSaleFilter) {
  if (filter === "all") return "ทั้งหมด";
  return statusLabel[filter];
}

export default async function FlashSalePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { authRequired, flashSales, error } = await getAdminFlashSales();

  if (authRequired) redirect("/login");

  const params = await searchParams;
  const activeFilter = getFlashSaleFilter(params.status);
  const activeCount = flashSales.filter((sale) => sale.status === "active").length;
  const upcomingCount = flashSales.filter(
    (sale) => sale.status === "upcoming",
  ).length;
  const endedCount = flashSales.filter((sale) => sale.status === "ended").length;
  const visibleFlashSales =
    activeFilter === "all"
      ? flashSales
      : flashSales.filter((sale) => sale.status === activeFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            โปรโมชั่น
          </p>
          <h1 className="mt-1.5 text-3xl font-black tracking-tight sm:text-4xl">
            แฟลชเซล
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            จัดการแคมเปญ Flash Sale เลือกสินค้า กำหนดช่วงเวลา และวันที่ เพื่อสร้างยอดขายในระยะเวลาจำกัด
          </p>
        </div>
        <Link href="/flash-sale/new" className={buttonVariants()}>
          <Plus />
          สร้าง Flash Sale
        </Link>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>โหลดข้อมูลไม่สำเร็จ: {error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FlashSaleStatCard
          href="/flash-sale"
          icon={<Package />}
          active={activeFilter === "all"}
          label="ทั้งหมด"
          value={flashSales.length}
          description="รวมทุกสถานะ"
          tone="bg-slate-100 text-slate-700"
        />
        <FlashSaleStatCard
          href="/flash-sale?status=active"
          icon={<CirclePlay />}
          active={activeFilter === "active"}
          label="กำลังแสดง"
          value={activeCount}
          description={statusDescription.active}
          tone="bg-emerald-100 text-emerald-700"
        />
        <FlashSaleStatCard
          href="/flash-sale?status=upcoming"
          icon={<Pencil />}
          active={activeFilter === "upcoming"}
          label="แบบร่าง"
          value={upcomingCount}
          description={statusDescription.upcoming}
          tone="bg-amber-100 text-amber-700"
        />
        <FlashSaleStatCard
          href="/flash-sale?status=ended"
          icon={<Flag />}
          active={activeFilter === "ended"}
          label="สิ้นสุดแล้ว"
          value={endedCount}
          description={statusDescription.ended}
          tone="bg-muted text-muted-foreground"
        />
      </section>

      {flashSales.length === 0 ? (
        <EmptyFlashSaleState />
      ) : visibleFlashSales.length === 0 ? (
        <EmptyFilteredState filter={activeFilter} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleFlashSales.map((sale) => (
            <FlashSaleCard key={sale.id} sale={sale} />
          ))}
        </section>
      )}
    </div>
  );
}

function FlashSaleStatCard({
  active,
  description,
  href,
  icon,
  label,
  tone,
  value,
}: {
  active: boolean;
  description: string;
  href: string;
  icon: React.ReactNode;
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <Link href={href} className="group block">
      <Card
        className={cn(
          "h-full transition-colors group-hover:bg-muted/30",
          active && "ring-2 ring-primary/30",
        )}
      >
        <CardContent className="flex h-full items-center gap-4 p-5">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-full [&_svg]:size-5",
              tone,
            )}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-0.5 text-3xl font-black leading-none">{value}</p>
              </div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyFilteredState({ filter }: { filter: FlashSaleFilter }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-14 text-center">
        <Package className="size-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-lg font-black">
          ไม่มีรายการ{filter === "all" ? "" : `สถานะ${getFilterLabel(filter)}`}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ลองเลือกตัวกรองอื่น หรือสร้าง Flash Sale ใหม่
        </p>
        <Link href="/flash-sale" className={cn("mt-5", buttonVariants({ variant: "outline" }))}>
          ดูทั้งหมด
        </Link>
      </CardContent>
    </Card>
  );
}

function EmptyFlashSaleState() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
          <div className="relative">
            <div className="grid size-28 place-items-center rounded-full bg-muted">
              <ShoppingBag className="size-16 text-muted-foreground" />
            </div>
            <span className="absolute bottom-3 left-1/2 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-amber-100 text-amber-600 ring-4 ring-card">
              <Zap className="size-5 fill-current" />
            </span>
            <Tag className="absolute -left-7 top-12 size-8 -rotate-12 text-muted-foreground/60" />
            <Timer className="absolute -right-8 top-12 size-8 rotate-12 text-muted-foreground/60" />
          </div>

          <h2 className="mt-6 text-xl font-black">ยังไม่มี Flash Sale</h2>
          <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
            สร้าง Flash Sale แรกเพื่อดึงดูดลูกค้าด้วยราคาพิเศษและช่วงเวลาโปรโมชั่น
          </p>
          <Link href="/flash-sale/new" className={cn("mt-5", buttonVariants())}>
            <Plus />
            สร้าง Flash Sale
          </Link>
        </div>

        <div className="border-t p-4">
          <div className="rounded-xl border bg-background p-4">
            <p className="mb-4 text-sm font-black">เคล็ดลับการสร้าง Flash Sale ให้ปัง</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TipItem
                icon={<CalendarDays />}
                title="เลือกช่วงเวลาให้เหมาะ"
                description="เลือกช่วงเวลาที่ลูกค้าออนไลน์เยอะที่สุด"
              />
              <TipItem
                icon={<Tag />}
                title="คัดเลือกสินค้าน่าสนใจ"
                description="เลือกสินค้ายอดนิยม หรือสินค้ามาใหม่"
              />
              <TipItem
                icon={<Percent />}
                title="ตั้งราคาพิเศษที่ดึงดูด"
                description="ส่วนลดที่เหมาะสมช่วยเพิ่มยอดขาย"
              />
              <TipItem
                icon={<Megaphone />}
                title="โปรโมทล่วงหน้า"
                description="ประกาศล่วงหน้าเพื่อสร้างการรับรู้"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TipItem({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex gap-3 md:border-r md:pr-4 md:last:border-r-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full border bg-card text-foreground [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function FlashSaleCard({ sale }: { sale: FlashSale }) {
  const discounts = sale.products
    .filter((product) => product.originalPrice > 0)
    .map((product) =>
      Math.round(
        ((product.originalPrice - product.salePrice) / product.originalPrice) *
          100,
      ),
    );
  const maxDiscount = discounts.length ? Math.max(...discounts) : 0;

  return (
    <Card className="overflow-hidden transition-colors hover:bg-muted/20">
      <CardHeader className="bg-muted/50 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Flash Sale
            </p>
            <CardTitle className="mt-1 truncate">{sale.name}</CardTitle>
          </div>
          <Badge variant={statusVariant[sale.status]}>
            {statusLabel[sale.status]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(sale.startDate)}
          {sale.startDate !== sale.endDate
            ? ` - ${formatDate(sale.endDate)}`
            : ""}
        </p>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {sale.slots.map((slot) => (
            <Badge key={slot} variant="secondary">
              {slot}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold">{sale.products.length}</span>
            <span className="ml-1 text-muted-foreground">สินค้า</span>
            {maxDiscount > 0 ? (
              <Badge variant="destructive" className="ml-3">
                -{maxDiscount}%
              </Badge>
            ) : null}
          </div>
          <Link
            href={`/flash-sale/${sale.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            แก้ไข
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
