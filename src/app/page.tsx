import Link from "next/link";
import Image from "next/image";
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
  RotateCcw,
  ShoppingCart,
} from "lucide-react";
import { DashboardSalesCard } from "@/components/dashboard-sales-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  getAdminDashboard,
  type DashboardOrder,
  type DashboardAttentionProduct,
  type DashboardPeriod,
  type DashboardSyncRun,
} from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string | string[] }>;
}) {
  const selectedSalesPeriod = parseSalesPeriod(
    (await searchParams)?.period,
  );
  const dashboardResult = await getAdminDashboard(selectedSalesPeriod);
  const { authRequired, dashboard, error, syncRuns } = dashboardResult;

  if (authRequired) {
    redirect("/login");
  }

  if (!dashboard) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>โหลดข้อมูล Dashboard ไม่สำเร็จ</AlertTitle>
        <AlertDescription>
          กรุณาตรวจสอบการเชื่อมต่อ API แล้วลองเปิดหน้าใหม่
          {error ? ` (${error})` : ""}
        </AlertDescription>
      </Alert>
    );
  }

  const attentionProducts = dashboard.inventory.attentionProducts;
  const attentionIssueCounts = countAttentionIssues(attentionProducts);
  const attentionLowStockCount =
    dashboard.inventory.lowStock > 0
      ? dashboard.inventory.lowStock
      : attentionIssueCounts.lowStock;
  const attentionOutOfStockCount =
    dashboard.inventory.outOfStock > 0
      ? dashboard.inventory.outOfStock
      : attentionIssueCounts.outOfStock;
  const attentionVariantCount =
    attentionLowStockCount + attentionOutOfStockCount;

  const urgentTasks = [
    {
      action: "ไปจัดการออเดอร์",
      count: dashboard.orders.awaitingPacking,
      href: "/orders",
      icon: PackageCheck,
      label: "รอแพ็กสินค้า",
      tone: "amber" as const,
    },
    {
      action: "ไปตรวจสอบคำขอ",
      count: dashboard.orders.returnRequests,
      href: "/orders?returnRequestStatus=Pending",
      icon: RotateCcw,
      label: "คำขอคืนสินค้า",
      tone: "sky" as const,
    },
    {
      action: "ไปยืนยันการคืนเงิน",
      count: dashboard.orders.refundRequests,
      href: "/orders?refundRequestStatus=Pending",
      icon: Banknote,
      label: "คำขอคืนเงิน",
      tone: "rose" as const,
    },
    {
      action: "ไปหน้าสินค้า",
      count: attentionVariantCount,
      href: "/products",
      icon: PackageOpen,
      label: "Variant ที่ต้องดูแล",
      tone: "orange" as const,
    },
    {
      action: "เปิด Integration",
      count: dashboard.zortSync.failed,
      href: "/integrations/zort",
      icon: AlertCircle,
      label: "ZORT Sync พบปัญหา",
      tone: "red" as const,
    },
  ];
  const sortedUrgentTasks = [...urgentTasks].sort((a, b) => b.count - a.count);
  const totalUrgentTaskCount = urgentTasks.reduce(
    (total, task) => total + task.count,
    0,
  );
  const actionableOrderCount =
    dashboard.orders.pending +
    dashboard.orders.awaitingPacking +
    dashboard.orders.returnRequests +
    dashboard.orders.refundRequests;

  const stats = [
    {
      icon: ShoppingCart,
      detail: `${dashboard.orders.pending} รอดำเนินการ · ${dashboard.orders.awaitingPacking} รอแพ็ก · ${dashboard.orders.returnRequests} คืนสินค้า · ${dashboard.orders.refundRequests} คืนเงิน`,
      label: "ออเดอร์รอดำเนินการ",
      tone: "amber" as const,
      value: `${actionableOrderCount}`,
    },
    {
      icon: Package,
      detail: inventoryAttentionDetail(
        attentionLowStockCount,
        attentionOutOfStockCount,
      ),
      label: "Variant ที่ต้องดูแล",
      tone: "orange" as const,
      value: `${attentionVariantCount}`,
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
          <Link href="/orders" className={buttonVariants()}>
            <ShoppingCart />
            จัดการออเดอร์
          </Link>
        </div>
      </div>

      {error ? (
        <Alert>
          <AlertCircle />
          <AlertTitle>โหลดประวัติ Sync ไม่สำเร็จ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardSalesCard key={dashboard.period} dashboard={dashboard} />
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              "overflow-hidden",
              summaryToneClasses(stat.tone, Number(stat.value) > 0).card,
            )}
          >
            <CardContent className="flex items-start gap-4 p-5">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-xl",
                  summaryToneClasses(stat.tone, Number(stat.value) > 0).icon,
                )}
              >
                <stat.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "mt-1 text-3xl font-black leading-none tracking-tight",
                    summaryToneClasses(stat.tone, Number(stat.value) > 0).value,
                  )}
                >
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
          <Card
            className={cn(
              totalUrgentTaskCount > 0 &&
                "border-amber-300/80 bg-amber-50/30 shadow-sm dark:border-amber-700/70 dark:bg-amber-950/10",
            )}
          >
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>งานที่ต้องทำวันนี้</CardTitle>
                  <CardDescription>
                    {totalUrgentTaskCount > 0
                      ? "เข้าหน้านี้แล้วเริ่มจากรายการที่มีตัวเลขก่อน"
                      : "ตอนนี้ยังไม่มีงานที่ต้องรีบจัดการ"}
                  </CardDescription>
                </div>
                {totalUrgentTaskCount > 0 ? (
                  <Badge className="h-8 rounded-full bg-amber-500 px-3 text-sm text-white hover:bg-amber-500 dark:bg-amber-600">
                    ต้องทำ {totalUrgentTaskCount.toLocaleString("th-TH")} งาน
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {urgentTasks.some((task) => task.count > 0) ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {sortedUrgentTasks.map((task) => (
                    <TaskRow key={task.label} task={task} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<CheckCircle2 className="size-8" />}
                  title="ไม่มีงานเร่งด่วน"
                  description="ออเดอร์ คำขอคืนสินค้า การคืนเงิน สต็อก และการซิงก์อยู่ในสถานะปกติ"
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
                    {dashboard.orders.latest.length ? (
                      dashboard.orders.latest.map((order, index) => (
                        <TableRow key={latestOrderKey(order, index)}>
                          <TableCell className="px-4">
                            <p className="font-semibold">{order.number}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDate(order.orderDate)}
                            </p>
                          </TableCell>
                          <TableCell>{order.customerName || "ไม่ระบุ"}</TableCell>
                          <TableCell
                            className={cn(
                              "font-medium",
                              paymentStatusClass(order.paymentStatus),
                            )}
                          >
                            {paymentStatusLabel(order.paymentStatus)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatMoney(order.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={orderStatusClass(order.status)}
                            >
                              {orderStatusLabel(order.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          ยังไม่มีออเดอร์
                        </TableCell>
                      </TableRow>
                    )}
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
              {attentionProducts.length ? (
                <div className="space-y-2">
                  {attentionProducts.map((item, index) => (
                    <ProductAttentionRow
                      key={attentionProductKey(item, index)}
                      item={item}
                    />
                  ))}
                </div>
              ) : attentionVariantCount > 0 ? (
                <EmptyState
                  icon={<PackageOpen className="size-8" />}
                  title={`มี ${attentionVariantCount.toLocaleString("th-TH")} Variant ที่ต้องดูแล`}
                  description="Dashboard ได้รับยอดรวมแล้ว แต่ยังไม่มีรายละเอียดสินค้าในรายการนี้ ให้ไปหน้าสินค้าเพื่อดู Variant ที่หมดสต็อกหรือใกล้หมด"
                  action={
                    <Link href="/products" className={buttonVariants({ size: "sm" })}>
                      ไปหน้าสินค้า
                    </Link>
                  }
                />
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
              <CardTitle>สถานะการชำระเงินวันนี้</CardTitle>
              <CardDescription>
                Payment Gateway ทั้งหมด {dashboard.payments.total} รายการ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PaymentSummary
                detail="ระบบยืนยันการชำระเงินแล้ว"
                label="ชำระสำเร็จ"
                tone="emerald"
                value={dashboard.payments.paid}
              />
              <PaymentSummary
                detail="กำลังรอผลจาก Payment Gateway"
                label="รอดำเนินการ"
                tone="amber"
                value={dashboard.payments.pending}
              />
              {dashboard.payments.partialPayment > 0 ? (
                <PaymentSummary
                  detail="ยอดชำระยังไม่ครบ"
                  label="ชำระบางส่วน"
                  tone="orange"
                  value={dashboard.payments.partialPayment}
                />
              ) : null}
              {dashboard.payments.excessPayment > 0 ? (
                <PaymentSummary
                  detail="ยอดชำระมากกว่ายอดออเดอร์"
                  label="ชำระเกิน"
                  tone="sky"
                  value={dashboard.payments.excessPayment}
                />
              ) : null}
              {dashboard.payments.voided > 0 ? (
                <PaymentSummary
                  detail="รายการชำระเงินที่ถูกยกเลิก"
                  label="ยกเลิก"
                  tone="red"
                  value={dashboard.payments.voided}
                />
              ) : null}
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
                  variant={
                    dashboard.zortSync.failed
                      ? "destructive"
                      : dashboard.zortSync.pending
                        ? "outline"
                        : "secondary"
                  }
                  className={cn(
                    !dashboard.zortSync.failed &&
                      !dashboard.zortSync.pending &&
                      "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                  )}
                >
                  {dashboard.zortSync.failed
                    ? "พบปัญหา"
                    : dashboard.zortSync.pending
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
              <SyncRow label="สำเร็จ" tone="emerald" value={dashboard.zortSync.succeeded} />
              <SyncRow label="กำลังดำเนินการ" tone="amber" value={dashboard.zortSync.pending} />
              <SyncRow label="พบปัญหา" tone="red" value={dashboard.zortSync.failed} />
              <p className="pt-1 text-xs text-muted-foreground">
                สำเร็จล่าสุด {formatDate(dashboard.zortSync.lastSuccessfulAt)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ประวัติ Sync</CardTitle>
              <CardDescription>การซิงก์สินค้าและออเดอร์ 20 รายการล่าสุด</CardDescription>
            </CardHeader>
            <CardContent>
              {syncRuns.length ? (
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {syncRuns.map((run) => (
                    <SyncRunRow key={`${run.type}-${run.id}`} run={run} />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  ยังไม่มีประวัติ Sync
                </p>
              )}
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
    href?: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
    tone: "amber" | "orange" | "red" | "rose" | "sky";
  };
}) {
  const needsAction = task.count > 0;
  const tone = taskToneClasses(task.tone);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
        needsAction
          ? tone.row
          : "bg-background opacity-70",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full",
            needsAction
              ? tone.icon
              : "bg-muted text-muted-foreground",
          )}
        >
          <task.icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{task.label}</p>
          <p className="text-xs text-muted-foreground">{task.action}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={needsAction ? "default" : "secondary"}
          className={cn(
            needsAction &&
              "h-8 min-w-8 rounded-full border-0 px-3 text-sm text-white",
            needsAction && tone.badge,
          )}
        >
          {task.count}
        </Badge>
        {task.href ? (
          <Link
            href={task.href}
            className={cn(
              "text-xs font-semibold transition-colors",
              needsAction
                ? tone.link
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            ไป
          </Link>
        ) : null}
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

function latestOrderKey(order: DashboardOrder, index: number) {
  return [order.id, order.number, order.orderDate ?? "no-date", index].join("-");
}

function attentionProductKey(item: DashboardAttentionProduct, index: number) {
  return [
    item.id,
    item.variantId ?? "no-variant",
    item.issue,
    item.sku ?? "no-sku",
    item.variantCode ?? "no-code",
    index,
  ].join("-");
}

function countAttentionIssues(products: DashboardAttentionProduct[]) {
  return products.reduce(
    (counts, product) => {
      if (product.issue === "LowStock") {
        counts.lowStock += 1;
      }
      if (product.issue === "OutOfStock") {
        counts.outOfStock += 1;
      }

      return counts;
    },
    { lowStock: 0, outOfStock: 0 },
  );
}

function ProductAttentionRow({
  item,
}: {
  item: DashboardAttentionProduct;
}) {
  const optionsText = formatProductOptions(item.options);
  const issue = attentionProductIssue(item.issue);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-3 sm:px-4",
        issue.row,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-contain p-1"
              sizes="56px"
            />
          ) : (
            <Package className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          {optionsText ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {optionsText}
            </p>
          ) : null}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.sku || "ไม่มี SKU"} · คงเหลือ {item.availableStock} ชิ้น
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={issue.variant} className={issue.badge}>
          {issue.label}
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

function formatProductOptions(
  options: DashboardAttentionProduct["options"],
) {
  return options
    .filter((option) => option.name && option.value)
    .map((option) => `${option.name}: ${option.value}`)
    .join(" / ");
}

function attentionProductIssue(issue: DashboardAttentionProduct["issue"]) {
  const labels: Record<
    DashboardAttentionProduct["issue"],
    {
      badge: string;
      label: string;
      row: string;
      variant: "destructive" | "outline";
    }
  > = {
    LowStock: {
      badge: "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
      label: "ใกล้หมด",
      row: "border-amber-200 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/10",
      variant: "outline",
    },
    OutOfStock: {
      badge: "bg-red-600 text-white hover:bg-red-600",
      label: "หมด",
      row: "border-red-200 bg-red-50/40 dark:border-red-900/70 dark:bg-red-950/10",
      variant: "destructive",
    },
    SyncIssue: {
      badge: "bg-rose-600 text-white hover:bg-rose-600",
      label: "Sync ผิดพลาด / หายจากต้นทาง",
      row: "border-rose-200 bg-rose-50/40 dark:border-rose-900/70 dark:bg-rose-950/10",
      variant: "destructive",
    },
  };

  return labels[issue];
}

function inventoryAttentionDetail(lowStock: number, outOfStock: number) {
  const details = [
    lowStock > 0 ? `${lowStock} Variant ใกล้หมด` : "",
    outOfStock > 0 ? `${outOfStock} Variant หมดสต็อก` : "",
  ].filter(Boolean);

  return details.length ? details.join(" · ") : "ไม่มี Variant ที่ต้องดูแล";
}

function SyncRunRow({ run }: { run: DashboardSyncRun }) {
  const failed =
    run.status === "Failed" || run.status === "CompletedWithErrors";
  const running = run.status === "Pending" || run.status === "Running";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        failed && "border-red-200 bg-red-50/40 dark:border-red-900/70 dark:bg-red-950/10",
        running && "border-amber-200 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {run.type === "Products" ? "สินค้า" : run.type === "Orders" ? "ออเดอร์" : run.type}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(run.requestedAtUtc)} · ดึง {run.totalFetched} รายการ
          </p>
        </div>
        <Badge variant={failed ? "destructive" : running ? "outline" : "secondary"}>
          {syncStatusLabel(run.status)}
        </Badge>
      </div>
      {run.failed > 0 ? (
        <p className="mt-2 text-xs text-destructive">
          ไม่สำเร็จ {run.failed} รายการ
          {run.errors[0] ? ` · ${run.errors[0]}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function PaymentSummary({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "amber" | "emerald" | "orange" | "red" | "sky";
  value: number;
}) {
  const colors = paymentToneClasses(tone);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border px-4 py-3",
        colors.row,
      )}
    >
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className={cn("text-2xl font-black", colors.value)}>{value}</span>
    </div>
  );
}

function SyncRow({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "amber" | "emerald" | "red";
  value: number;
}) {
  const colors = syncToneClasses(tone);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3",
        colors.row,
      )}
    >
      <p className="text-sm font-medium">{label}</p>
      <Badge variant="secondary" className={colors.badge}>
        {value} รายการ
      </Badge>
    </div>
  );
}

function summaryToneClasses(
  tone: "amber" | "orange",
  active: boolean,
) {
  if (!active) {
    return {
      card: "border-border",
      icon: "bg-muted text-muted-foreground",
      value: "text-foreground",
    };
  }

  if (tone === "amber") {
    return {
      card: "border-amber-300/80 bg-amber-50/30 dark:border-amber-800/70 dark:bg-amber-950/10",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      value: "text-amber-700 dark:text-amber-300",
    };
  }

  return {
    card: "border-orange-300/80 bg-orange-50/30 dark:border-orange-800/70 dark:bg-orange-950/10",
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
    value: "text-orange-700 dark:text-orange-300",
  };
}

function taskToneClasses(
  tone: "amber" | "orange" | "red" | "rose" | "sky",
) {
  const colors = {
    amber: {
      badge: "bg-amber-500 hover:bg-amber-500 dark:bg-amber-600",
      icon: "bg-amber-500 text-white dark:bg-amber-600",
      link: "text-amber-700 hover:text-amber-800 dark:text-amber-300",
      row: "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/15",
    },
    orange: {
      badge: "bg-orange-500 hover:bg-orange-500 dark:bg-orange-600",
      icon: "bg-orange-500 text-white dark:bg-orange-600",
      link: "text-orange-700 hover:text-orange-800 dark:text-orange-300",
      row: "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/15",
    },
    red: {
      badge: "bg-red-600 hover:bg-red-600",
      icon: "bg-red-600 text-white",
      link: "text-red-700 hover:text-red-800 dark:text-red-300",
      row: "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/15",
    },
    rose: {
      badge: "bg-rose-600 hover:bg-rose-600",
      icon: "bg-rose-600 text-white",
      link: "text-rose-700 hover:text-rose-800 dark:text-rose-300",
      row: "border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/15",
    },
    sky: {
      badge: "bg-sky-600 hover:bg-sky-600",
      icon: "bg-sky-600 text-white",
      link: "text-sky-700 hover:text-sky-800 dark:text-sky-300",
      row: "border-sky-300 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-950/15",
    },
  };

  return colors[tone];
}

function paymentToneClasses(
  tone: "amber" | "emerald" | "orange" | "red" | "sky",
) {
  const colors = {
    amber: {
      row: "border-amber-200 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/10",
      value: "text-amber-700 dark:text-amber-300",
    },
    emerald: {
      row: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-emerald-950/10",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    orange: {
      row: "border-orange-200 bg-orange-50/40 dark:border-orange-900/70 dark:bg-orange-950/10",
      value: "text-orange-700 dark:text-orange-300",
    },
    red: {
      row: "border-red-200 bg-red-50/40 dark:border-red-900/70 dark:bg-red-950/10",
      value: "text-red-700 dark:text-red-300",
    },
    sky: {
      row: "border-sky-200 bg-sky-50/40 dark:border-sky-900/70 dark:bg-sky-950/10",
      value: "text-sky-700 dark:text-sky-300",
    },
  };

  return colors[tone];
}

function syncToneClasses(tone: "amber" | "emerald" | "red") {
  const colors = {
    amber: {
      badge: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300",
      row: "border-amber-200 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/10",
    },
    emerald: {
      badge: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300",
      row: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-emerald-950/10",
    },
    red: {
      badge: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300",
      row: "border-red-200 bg-red-50/40 dark:border-red-900/70 dark:bg-red-950/10",
    },
  };

  return colors[tone];
}

function parseSalesPeriod(
  value: string | string[] | undefined,
): DashboardPeriod {
  const period = Array.isArray(value) ? value[0] : value;

  if (period === "month" || period === "year") {
    return period;
  }

  return "day";
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "ยังไม่มีข้อมูล";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ExcessPayment: "ชำระเกิน",
    Paid: "ชำระแล้ว",
    PartialPayment: "ชำระบางส่วน",
    Pending: "รอดำเนินการ",
    Voided: "ยกเลิก",
  };

  return labels[status] ?? status;
}

function paymentStatusClass(status: string) {
  const classes: Record<string, string> = {
    ExcessPayment: "text-sky-700 dark:text-sky-300",
    Paid: "text-emerald-700 dark:text-emerald-300",
    PartialPayment: "text-orange-700 dark:text-orange-300",
    Pending: "text-amber-700 dark:text-amber-300",
    Voided: "text-red-700 dark:text-red-300",
  };

  return classes[status] ?? "text-muted-foreground";
}

function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Completed: "สำเร็จ",
    Pending: "รอดำเนินการ",
    Returned: "ตีกลับ",
    Sent: "จัดส่งแล้ว",
    Voided: "ยกเลิก",
    Waiting: "รอแพ็ก",
  };

  return labels[status] ?? status;
}

function orderStatusClass(status: string) {
  const normalized = status.trim().toLowerCase();

  if (
    normalized === "completed" ||
    normalized === "success" ||
    normalized.includes("สำเร็จ")
  ) {
    return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (
    normalized === "voided" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized.includes("ยกเลิก")
  ) {
    return "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300";
  }

  if (
    normalized === "waiting" ||
    normalized === "packed" ||
    normalized.includes("แพ็ก")
  ) {
    return "bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300";
  }

  if (
    normalized === "sent" ||
    normalized === "shipped" ||
    normalized.includes("จัดส่ง")
  ) {
    return "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300";
  }

  if (normalized === "returned" || normalized.includes("ตีกลับ")) {
    return "bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300";
  }

  if (normalized === "pending" || normalized.includes("รอดำเนินการ")) {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "bg-muted text-muted-foreground hover:bg-muted";
}

function syncStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CompletedWithErrors: "สำเร็จบางส่วน",
    Failed: "ไม่สำเร็จ",
    Pending: "รอดำเนินการ",
    Running: "กำลังซิงก์",
    Succeeded: "สำเร็จ",
  };

  return labels[status] ?? status;
}
