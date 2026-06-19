import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ExternalLink,
  Package,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Tags,
  Truck,
} from "lucide-react";
import { adminCoupons, adminOrders } from "@/lib/admin-data";
import { getAdminProducts } from "@/lib/admin-products";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function isCancelled(status: string) {
  return status.includes("ยกเลิก");
}

function isCodPayment(payment: string) {
  return payment.toLowerCase().includes("cod") || payment.includes("ปลายทาง");
}

function isSlipWaiting(status: string) {
  return status.includes("สลิป");
}

export default async function DashboardPage() {
  const { authRequired, products } = await getAdminProducts();

  if (authRequired) {
    redirect("/login");
  }

  const activeOrders = adminOrders.filter((order) => !isCancelled(order.status));
  const waitingSlipOrders = adminOrders.filter((order) =>
    isSlipWaiting(order.status),
  );
  const codOrders = adminOrders.filter((order) => isCodPayment(order.payment));
  const gatewayOrders = adminOrders.filter(
    (order) => !isCodPayment(order.payment),
  );
  const lowStock = products.filter((product) => product.stock <= 18);
  const outOfStock = products.filter((product) => product.stock === 0);
  const activeCoupons = adminCoupons.filter((coupon) => coupon.active);
  const packingOrders = activeOrders.filter((order) =>
    order.status.includes("แพ็ก"),
  );
  const completedOrders = adminOrders.filter((order) =>
    order.status.includes("สำเร็จ"),
  );
  const syncedProducts = products.filter((item) => item.syncStatus === "synced");
  const pendingSyncProducts = products.filter(
    (item) => item.syncStatus === "pending",
  );
  const syncErrorProducts = products.filter((item) => item.syncStatus === "error");
  const productsNeedingAttention = products.filter(
    (product) => product.stock <= 18 || product.syncStatus === "error",
  );
  const urgentTasks = [
    {
      action: "ไปตรวจสลิป",
      count: waitingSlipOrders.length,
      href: "/orders",
      icon: ReceiptText,
      label: "รอตรวจสลิป",
    },
    {
      action: "ไปจัดการออเดอร์",
      count: packingOrders.length,
      href: "/orders",
      icon: PackageCheck,
      label: "รอแพ็กสินค้า",
    },
    {
      action: "ไปดู COD",
      count: codOrders.length,
      href: "/orders",
      icon: Truck,
      label: "COD รอยืนยัน",
    },
    {
      action: "ไปหน้าสินค้า",
      count: lowStock.length,
      href: "/products",
      icon: PackageOpen,
      label: "สินค้าใกล้หมด",
    },
    {
      action: "เปิด Integration",
      count: syncErrorProducts.length,
      href: "/integrations/zort",
      icon: AlertCircle,
      label: "ZORT Sync พบปัญหา",
    },
  ];
  const revenue = activeOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = activeOrders.length
    ? Math.round(revenue / activeOrders.length)
    : 0;

  const stats = [
    {
      icon: Banknote,
      detail: `เฉลี่ย ฿${averageOrderValue.toLocaleString()} / ออเดอร์`,
      label: "ยอดขายรวม",
      value: `฿${revenue.toLocaleString()}`,
    },
    {
      icon: ShoppingCart,
      detail: `${waitingSlipOrders.length} รอตรวจสลิป`,
      label: "ออเดอร์ที่ต้องทำ",
      value: `${activeOrders.length}`,
    },
    {
      icon: Package,
      detail: lowStock.length
        ? `${outOfStock.length} หมดสต็อก`
        : "ไม่มีสินค้าสต็อกต่ำ",
      label: "สินค้าใกล้หมด",
      value: `${lowStock.length}`,
    },
    {
      icon: Tags,
      detail: `${activeCoupons.length} คูปองเปิดใช้งาน`,
      label: "โปรโมชั่น",
      value: `${adminCoupons.length}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
            ภาพรวม
          </p>
          <h1 className="mt-1.5 text-3xl font-black tracking-tight sm:text-4xl">
            ภาพรวมร้าน PonPon
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            ยอดขาย ออเดอร์ งานที่ต้องทำ สต็อก การชำระเงิน และสถานะ Sync ในหน้าเดียว
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="http://localhost:3100"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            <ExternalLink />
            เปิดหน้าร้าน
          </a>
          <Link
            href="/integrations/zort"
            className={buttonVariants({ variant: "secondary" })}
          >
            <RefreshCw />
            ซิงก์ ZORT
          </Link>
          <Link href="/orders" className={buttonVariants()}>
            <ShoppingCart />
            จัดการออเดอร์
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.label} className={index === 0 ? "border-primary/25" : ""}>
            <CardContent className="flex items-start gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                <stat.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-3xl font-black leading-none tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{stat.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>งานที่ต้องทำวันนี้</CardTitle>
              <CardDescription>รายการที่แอดมินควรจัดการก่อน</CardDescription>
            </CardHeader>
            <CardContent>
              {urgentTasks.some((task) => task.count > 0) ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {urgentTasks.map((task) => (
                    <TaskRow key={task.label} task={task} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CheckCircle2 className="size-8" />}
                  title="ไม่มีงานเร่งด่วน"
                  description="ออเดอร์ สต็อก และการซิงก์อยู่ในสถานะปกติ"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ออเดอร์ล่าสุด</CardTitle>
              <CardAction>
                <Link href="/orders" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                  ดูทั้งหมด
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table className="min-w-[640px]">
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="px-4">ออเดอร์</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>การชำระเงิน</TableHead>
                      <TableHead>ยอดรวม</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminOrders.slice(0, 5).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="px-4 font-semibold">{order.id}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.payment}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ฿{order.total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>สินค้าที่ต้องดูแล</CardTitle>
              <CardAction>
                <Link href="/products" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                  ไปหน้าสินค้า
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {productsNeedingAttention.length ? (
                <div className="space-y-2">
                  {productsNeedingAttention.slice(0, 5).map((item) => (
                    <ProductAttentionRow key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<PackageCheck className="size-8" />}
                  title="ไม่มีสินค้าที่ต้องดูแล"
                  description="สินค้าทั้งหมดยังมีสต็อกเพียงพอ และไม่มีปัญหาการซิงก์"
                  action={
                    <Link href="/products" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      ไปหน้าสินค้า
                    </Link>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>การชำระเงินวันนี้</CardTitle>
              <CardDescription>แยกช่องทางและรายการที่ต้องตรวจ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PaymentSummary
                detail="จ่ายผ่านระบบหรือต้องตรวจสลิป"
                label="PromptPay / Payment Gateway"
                value={gatewayOrders.length}
              />
              <PaymentSummary
                detail="เก็บเงินปลายทาง"
                label="COD เก็บเงินปลายทาง"
                value={codOrders.length}
              />
              <PaymentSummary
                detail="รายการที่ควรตรวจสอบก่อน"
                label="รอตรวจสลิป"
                value={waitingSlipOrders.length}
              />
              <PaymentSummary
                detail="ออเดอร์ที่ปิดงานแล้ว"
                label="สำเร็จแล้ว"
                value={completedOrders.length}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>สถานะ ZORT Sync</CardTitle>
                  <CardDescription>ภาพรวมสุขภาพการซิงก์สินค้า</CardDescription>
                </div>
                <Badge
                  variant={syncErrorProducts.length ? "destructive" : pendingSyncProducts.length ? "outline" : "secondary"}
                  className={cn(
                    !syncErrorProducts.length &&
                      !pendingSyncProducts.length &&
                      "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                  )}
                >
                  {syncErrorProducts.length
                    ? "พบปัญหา"
                    : pendingSyncProducts.length
                      ? "รอซิงก์"
                      : "ปกติ"}
                </Badge>
              </div>
              <CardAction>
                <Link href="/integrations/zort" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                  เปิด Integration
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2">
              <SyncRow label="ซิงก์แล้ว" value={syncedProducts.length} />
              <SyncRow label="รอซิงก์" value={pendingSyncProducts.length} />
              <SyncRow label="พบปัญหา" value={syncErrorProducts.length} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>คูปองและโปรโมชั่น</CardTitle>
              <CardAction>
                <Link href="/coupons" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                  จัดการคูปอง
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adminCoupons.slice(0, 4).map((coupon) => (
                  <CouponRow key={coupon.code} coupon={coupon} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function TaskRow({
  task,
}: {
  task: {
    action: string;
    count: number;
    href: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
  };
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <task.icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{task.label}</p>
          <p className="text-xs text-muted-foreground">{task.action}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={task.count > 0 ? "default" : "secondary"}>
          {task.count}
        </Badge>
        <Link
          href={task.href}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ไป
        </Link>
      </div>
    </div>
  );
}

function EmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ProductAttentionRow({
  item,
}: {
  item: {
    id: string;
    name: string;
    stock: number;
    syncStatus: string;
    zortSku: string;
  };
}) {
  const hasSyncError = item.syncStatus === "error";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.zortSku} · คงเหลือ {item.stock} ชิ้น
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={hasSyncError || item.stock === 0 ? "destructive" : "outline"}>
          {hasSyncError ? "Sync ผิดพลาด" : item.stock === 0 ? "หมด" : "ใกล้หมด"}
        </Badge>
        <Link
          href={`/products/${item.id}/edit`}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ดูสินค้า
        </Link>
      </div>
    </div>
  );
}

function CouponRow({
  coupon,
}: {
  coupon: {
    active: boolean;
    condition: string;
    limit: number;
    name: string;
    used: number;
  };
}) {
  const progress = coupon.limit
    ? Math.min(100, Math.round((coupon.used / coupon.limit) * 100))
    : 0;

  return (
    <div className="rounded-xl border px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{coupon.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {coupon.condition} · ใช้แล้ว {coupon.used}/{coupon.limit}
          </p>
        </div>
        <Badge
          variant={coupon.active ? "default" : "secondary"}
          className={cn(
            coupon.active && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
          )}
        >
          {coupon.active ? "เปิดอยู่" : "ปิด"}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function PaymentSummary({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-background px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="text-2xl font-black">{value}</span>
    </div>
  );
}

function SyncRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
      <p className="text-sm font-medium">{label}</p>
      <Badge variant="secondary">{value} รายการ</Badge>
    </div>
  );
}
