import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  ImageIcon,
  MessageSquareText,
  Star,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReviewActions } from "@/components/review-actions";
import { ReviewFilterBar } from "@/components/review-filter-bar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getAdminReviews,
  type AdminReview,
  type ReviewStatus,
} from "@/lib/admin-reviews";

const DEFAULT_PAGE_SIZE = 20;

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = positiveIntegerParam(params.page, 1);
  const pageSize = positiveIntegerParam(params.pageSize, DEFAULT_PAGE_SIZE);
  const status = reviewStatusParam(params.status);
  const rating = ratingParam(params.rating);
  const includeDeleted = params.includeDeleted === "true";
  const productId = stringParam(params.productId);
  const userId = stringParam(params.userId);

  const result = await getAdminReviews({
    includeDeleted,
    page,
    pageSize,
    productId,
    rating,
    status,
    userId,
  });

  if (result.authRequired) {
    redirect("/login");
  }

  const visibleReviews = result.reviews.filter((review) => !review.isDeleted);
  const publishedCount = visibleReviews.filter(
    (review) => review.status === "published",
  ).length;
  const hiddenCount = visibleReviews.filter((review) => review.status === "hidden").length;
  const deletedCount = result.reviews.filter((review) => review.isDeleted).length;
  const mediaCount = result.reviews.reduce(
    (sum, review) => sum + review.media.length,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Review moderation"
        description="จัดการรีวิวสินค้า ซ่อนรีวิวที่ไม่เหมาะสม publish กลับ และ soft delete ได้จากหน้านี้"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Reviews"
          value={result.total}
          helper={`หน้า ${result.page.toLocaleString("th-TH")} จาก ${result.totalPages.toLocaleString("th-TH")}`}
          icon={<MessageSquareText className="size-4" />}
        />
        <MetricCard
          label="Published on page"
          value={publishedCount}
          helper="นับเฉพาะรายการที่โหลดอยู่"
          tone="success"
          icon={<Star className="size-4" />}
        />
        <MetricCard
          label="Hidden on page"
          value={hiddenCount}
          helper="ไม่แสดงในหน้าสินค้า"
          tone="warning"
          icon={<EyeOff className="size-4" />}
        />
        <MetricCard
          label="Media on page"
          value={mediaCount}
          helper={deletedCount ? `Deleted ${deletedCount.toLocaleString("th-TH")}` : "ทุกสถานะ media"}
          tone={deletedCount ? "danger" : "neutral"}
          icon={deletedCount ? <Trash2 className="size-4" /> : <ImageIcon className="size-4" />}
        />
      </section>

      <Card>
        <CardContent className="p-4">
          <ReviewFilterBar />
        </CardContent>
      </Card>

      {result.error ? (
        <Alert variant="destructive">
          <AlertDescription>โหลดรีวิวไม่สำเร็จ: {result.error}</AlertDescription>
        </Alert>
      ) : null}

      {result.reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-muted">
              <MessageSquareText className="size-7 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-black">ยังไม่มีรีวิวตาม filter นี้</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              ลองปรับสถานะ คะแนน หรือเปิดรวม deleted เพื่อค้นหารีวิวอีกครั้ง
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-3">
          {result.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          ทั้งหมด {result.total.toLocaleString("th-TH")} รายการ
        </p>
        {result.totalPages > 1 ? (
          <Pagination
            current={result.page}
            total={result.totalPages}
            params={params}
          />
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    danger: "bg-destructive/10 text-destructive",
    neutral: "bg-muted text-muted-foreground",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight">
            {value.toLocaleString("th-TH")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-lg", toneClasses[tone])}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewCard({ review }: { review: AdminReview }) {
  const initials = getInitials(review.userName);

  return (
    <Card className={cn("overflow-hidden", review.isDeleted && "opacity-65")}>
      <CardContent className="p-0">
        <div
          className={cn(
            "h-1",
            review.isDeleted
              ? "bg-destructive"
              : review.status === "hidden"
                ? "bg-amber-500"
                : "bg-emerald-500",
          )}
        />
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0 space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-foreground text-sm font-black text-background">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/reviews/${review.id}`}
                    className="truncate text-base font-black text-foreground hover:underline"
                  >
                    {review.productName}
                  </Link>
                  <StatusBadge status={review.status} />
                  {review.isDeleted ? <Badge variant="destructive">Deleted</Badge> : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Review #{review.id}</span>
                  <span>โดย {review.userName}</span>
                  <span>{formatDate(review.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-sm font-black shadow-sm">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {review.rating || "-"}
              </div>
              <p className="line-clamp-4 text-sm leading-7 text-foreground/85">
                {review.comment || "ไม่มีข้อความรีวิว"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <MetaPill label="Product" value={review.productId || "-"} />
              <MetaPill label="User" value={review.userId || review.userName} />
              <MetaPill label="Updated" value={formatDate(review.updatedAt)} />
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:items-end">
            <MediaPreview review={review} />
            <ReviewActions
              reviewId={review.id}
              status={review.status}
              isDeleted={review.isDeleted}
            />
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  if (status === "hidden") {
    return <Badge variant="outline">Hidden</Badge>;
  }

  return <Badge className="bg-emerald-600 text-white">Published</Badge>;
}

function MediaPreview({ review }: { review: AdminReview }) {
  if (review.media.length === 0) {
    return (
      <div className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground lg:w-48">
        <ImageIcon className="size-4" />
        ไม่มี media
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5 lg:w-48">
      {review.media.slice(0, 4).map((media) => (
        <Link
          key={media.id}
          href={`/reviews/${review.id}`}
          className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-transform hover:-translate-y-0.5"
          title={media.status}
        >
          {media.url ? (
            <Image
              alt=""
              className="size-full object-cover"
              height={64}
              src={media.thumbnailUrl ?? media.url}
              unoptimized
              width={64}
            />
          ) : null}
          <span
            className={cn(
              "absolute bottom-0 left-0 right-0 truncate px-1 py-0.5 text-center text-[9px] font-semibold uppercase leading-none text-white",
              media.status === "ready"
                ? "bg-emerald-600"
                : media.status === "failed"
                  ? "bg-destructive"
                  : "bg-amber-600",
            )}
          >
            {media.status}
          </span>
        </Link>
      ))}
      {review.media.length > 4 ? (
        <Link
          href={`/reviews/${review.id}`}
          className="grid aspect-square place-items-center rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
        >
          +{review.media.length - 4}
        </Link>
      ) : null}
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
      <span className="font-semibold text-foreground">{label}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function Pagination({
  current,
  total,
  params,
}: {
  current: number;
  total: number;
  params: { [key: string]: string | string[] | undefined };
}) {
  const pages = buildPageList(current, total);

  return (
    <nav
      className="flex flex-wrap items-center justify-start gap-1 sm:justify-end"
      aria-label="Pagination"
    >
      <span className="mr-2 w-full text-sm text-muted-foreground sm:w-auto">
        หน้า {current.toLocaleString("th-TH")} / {total.toLocaleString("th-TH")}
      </span>
      <PaginationLink
        href={pageHref(params, current - 1)}
        disabled={current <= 1}
        aria-label="หน้าก่อนหน้า"
      >
        <ChevronLeft className="size-4" />
      </PaginationLink>
      {pages.map((page, index) =>
        page === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="grid size-9 place-items-center text-sm text-muted-foreground"
          >
            ...
          </span>
        ) : (
          <PaginationLink
            key={page}
            href={pageHref(params, page)}
            isActive={page === current}
            aria-current={page === current ? "page" : undefined}
            aria-label={`หน้า ${page}`}
          >
            {page}
          </PaginationLink>
        ),
      )}
      <PaginationLink
        href={pageHref(params, current + 1)}
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
  disabled,
  isActive,
  children,
  ...props
}: {
  href: string;
  disabled?: boolean;
  isActive?: boolean;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const classes =
    "flex size-9 items-center justify-center rounded-md border text-sm font-semibold transition-colors";
  const activeClasses = "border-primary bg-primary text-primary-foreground";
  const idleClasses =
    "border-border bg-background hover:bg-accent hover:text-accent-foreground";

  if (disabled) {
    return (
      <span className={cn(classes, idleClasses, "pointer-events-none opacity-40")}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(classes, isActive ? activeClasses : idleClasses)}
      {...props}
    >
      {children}
    </Link>
  );
}

function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    pages.push("...");
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < total - 1) {
    pages.push("...");
  }

  pages.push(total);
  return pages;
}

function pageHref(
  params: { [key: string]: string | string[] | undefined },
  page: number,
) {
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      nextParams.set(key, value);
    }
  }
  nextParams.set("page", String(page));
  return `/reviews?${nextParams.toString()}`;
}

function stringParam(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function reviewStatusParam(value: string | string[] | undefined) {
  return value === "published" || value === "hidden" ? value : undefined;
}

function ratingParam(value: string | string[] | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : undefined;
}

function positiveIntegerParam(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return "U";
  return trimmed.slice(0, 2).toUpperCase();
}
