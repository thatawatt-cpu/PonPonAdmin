import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, History, Plus, Ticket } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getAdminCoupons } from "@/lib/admin-coupons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CouponListManager } from "@/components/coupon-list-manager";
import { CouponBulkGenerateButton } from "@/components/coupon-bulk-generate-dialog";
import { CouponFilterBar } from "@/components/coupon-filter-bar";
import { getAdminCouponCampaigns } from "@/lib/admin-coupon-campaigns";
import { getAdminCategories } from "@/lib/admin-products";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const {
    page: pageParam,
    q,
    campaignId: campaignIdParam,
    status: statusParam,
    type: typeParam,
  } = await searchParams;
  const currentPage = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);
  const searchQuery = typeof q === "string" ? q.trim() : "";
  const searchTerm = searchQuery.toLocaleLowerCase("th");
  const campaignFilter =
    typeof campaignIdParam === "string" ? campaignIdParam : "";
  const statusFilter = typeof statusParam === "string" ? statusParam : "";
  const typeFilter = typeof typeParam === "string" ? typeParam : "";
  const [couponResult, { categories }, campaignResult] = await Promise.all([
    getAdminCoupons(campaignFilter || undefined),
    getAdminCategories(),
    getAdminCouponCampaigns(),
  ]);
  const { coupons } = couponResult;

  if (couponResult.authRequired || campaignResult.authRequired) redirect("/login");

  let filteredCoupons = coupons;

  if (searchTerm) {
    filteredCoupons = filteredCoupons.filter(
      (coupon) =>
        coupon.name.toLocaleLowerCase("th").includes(searchTerm) ||
        coupon.code.toLocaleLowerCase("th").includes(searchTerm),
    );
  }

  if (statusFilter === "active" || statusFilter === "inactive") {
    const isActive = statusFilter === "active";
    filteredCoupons = filteredCoupons.filter((coupon) => coupon.isActive === isActive);
  }

  if (
    typeFilter === "fixed" ||
    typeFilter === "percentage" ||
    typeFilter === "free_shipping"
  ) {
    filteredCoupons = filteredCoupons.filter((coupon) => coupon.type === typeFilter);
  }

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const visibleCoupons = filteredCoupons.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const replacementCoupons = filteredCoupons.slice(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE,
  );
  const hasFilter = !!(
    searchQuery ||
    campaignFilter ||
    statusFilter ||
    typeFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="โปรโมชัน"
        title="คูปองและโปรโมชัน"
        description="สร้างโค้ดส่วนลด กำหนดเงื่อนไข จำนวนสิทธิ์ และวันหมดอายุ"
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/coupons/bulk-generate-jobs"
              className={buttonVariants({ variant: "outline" })}
            >
              <History />
              ประวัติการสร้าง
            </Link>
            <CouponBulkGenerateButton
              campaigns={campaignResult.campaigns}
              categories={categories}
              initialCampaignId={campaignFilter}
            />
            <Link href="/coupons/new" className={buttonVariants()}>
              <Plus />
              สร้างคูปอง
            </Link>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <CouponFilterBar campaigns={campaignResult.campaigns} />
        </CardContent>
      </Card>

      {couponResult.error || campaignResult.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            โหลดข้อมูลไม่สำเร็จ: {couponResult.error || campaignResult.error}
          </AlertDescription>
        </Alert>
      ) : null}

      {coupons.length === 0 && !hasFilter ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Ticket className="size-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-black">ยังไม่มีคูปอง</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              สร้างคูปองแรกเพื่อมอบส่วนลดให้ลูกค้า
            </p>
            <Link href="/coupons/new" className={`mt-5 ${buttonVariants({ variant: "outline" })}`}>
              <Plus />
              สร้างคูปอง
            </Link>
          </CardContent>
        </Card>
      ) : filteredCoupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14 text-center">
            <Ticket className="size-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-black">ไม่พบคูปอง</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ลองเปลี่ยนคำค้นหา หรือตัวกรองที่เลือก
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <CouponListManager
            coupons={visibleCoupons}
            replacementCoupons={replacementCoupons}
            allMatchingIds={filteredCoupons.map((coupon) => coupon.id)}
          />

          {totalPages > 1 ? (
            <Pagination
              current={page}
              total={totalPages}
              query={{
                q: searchQuery,
                campaignId: campaignFilter,
                status: statusFilter,
                type: typeFilter,
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function Pagination({
  current,
  total,
  query,
}: {
  current: number;
  total: number;
  query: { q: string; campaignId: string; status: string; type: string };
}) {
  const pages = buildPageList(current, total);

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.campaignId) params.set("campaignId", query.campaignId);
    if (query.status) params.set("status", query.status);
    if (query.type) params.set("type", query.type);
    params.set("page", String(page));
    return `/coupons?${params.toString()}`;
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <PaginationLink
        href={pageHref(current - 1)}
        disabled={current <= 1}
        aria-label="หน้าก่อน"
      >
        <ChevronLeft className="size-4" />
      </PaginationLink>

      {pages.map((page, index) =>
        page === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="flex size-9 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <PaginationLink
            key={page}
            href={pageHref(page)}
            isActive={page === current}
            aria-label={`หน้า ${page}`}
            aria-current={page === current ? "page" : undefined}
          >
            {page}
          </PaginationLink>
        ),
      )}

      <PaginationLink
        href={pageHref(current + 1)}
        disabled={current >= total}
        aria-label="หน้าถัดไป"
      >
        <ChevronRight className="size-4" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  isActive,
  disabled,
  children,
  ...props
}: {
  href: string;
  isActive?: boolean;
  disabled?: boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const base =
    "flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors";
  const active = "bg-primary text-primary-foreground";
  const idle = "border border-border hover:bg-accent hover:text-accent-foreground";
  const disabledClass = "pointer-events-none border border-border opacity-40";

  if (disabled) {
    return (
      <span
        className={cn(base, disabledClass)}
        {...(props as React.HTMLAttributes<HTMLSpanElement>)}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={cn(base, isActive ? active : idle)} {...props}>
      {children}
    </Link>
  );
}

function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");
  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page++
  ) {
    pages.push(page);
  }
  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}
