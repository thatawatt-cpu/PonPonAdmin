"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Filter,
  ImageIcon,
  MessageSquareText,
  MoreHorizontal,
  Package,
  Play,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { hasPermission, useAdminSession } from "@/components/admin-permissions";
import { ReviewMediaImage } from "@/components/review-media-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { AdminReview, AdminReviewMedia, ReviewStatus } from "@/lib/admin-reviews";
import { cn } from "@/lib/utils";

type Props = {
  error?: string;
  page: number;
  pageSize: number;
  reviews: AdminReview[];
  searchParams: Record<string, string>;
  total: number;
  totalPages: number;
};

type ActionIntent =
  | { kind: "status"; review: AdminReview; status: ReviewStatus }
  | { kind: "delete"; review: AdminReview }
  | null;

type MediaFilter = "all" | "with" | "without";
type SortMode = "newest" | "oldest" | "rating-high" | "rating-low" | "media";

export function ReviewModerationDashboard(props: Props) {
  const router = useRouter();
  const { user } = useAdminSession();
  const canManageReviews = hasPermission(user, "reviews.manage");
  const [query, setQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailReview, setDetailReview] = useState<AdminReview | null>(null);
  const [lightbox, setLightbox] = useState<{ review: AdminReview; index: number } | null>(null);
  const [intent, setIntent] = useState<ActionIntent>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const currentStatus = props.searchParams.status;
  const showDeleted = props.searchParams.includeDeleted === "true";
  const visibleReviews = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");
    const filtered = props.reviews.filter((review) => {
      if (showDeleted && !review.isDeleted) return false;
      if (normalizedQuery) {
        const searchable = [review.userName, review.productName, review.comment, review.orderNumber, review.sku]
          .join(" ")
          .toLocaleLowerCase("th-TH");
        if (!searchable.includes(normalizedQuery)) return false;
      }
      if (mediaFilter === "with" && review.media.length === 0) return false;
      if (mediaFilter === "without" && review.media.length > 0) return false;
      return true;
    });

    return filtered.toSorted((left, right) => {
      if (sortMode === "rating-high") return right.rating - left.rating;
      if (sortMode === "rating-low") return left.rating - right.rating;
      if (sortMode === "media") return right.media.length - left.media.length;
      const leftDate = dateValue(left.createdAt);
      const rightDate = dateValue(right.createdAt);
      return sortMode === "oldest" ? leftDate - rightDate : rightDate - leftDate;
    });
  }, [mediaFilter, props.reviews, query, showDeleted, sortMode]);

  const pageCounts = useMemo(
    () => ({
      deleted: props.reviews.filter((review) => review.isDeleted).length,
      hidden: props.reviews.filter((review) => !review.isDeleted && review.status === "hidden").length,
      published: props.reviews.filter((review) => !review.isDeleted && review.status === "published").length,
    }),
    [props.reviews],
  );
  const selectedReviews = props.reviews.filter((review) => selectedIds.includes(review.id));
  const allVisibleSelected = visibleReviews.length > 0 && visibleReviews.every((review) => selectedIds.includes(review.id));
  const hasClientFilters = Boolean(query || mediaFilter !== "all" || sortMode !== "newest");

  function updateParams(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(props.searchParams);
    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    if (!("page" in overrides)) params.delete("page");
    setSelectedIds([]);
    router.push(`/reviews${params.size ? `?${params.toString()}` : ""}`);
  }

  function setTab(tab: "all" | ReviewStatus | "deleted") {
    if (tab === "deleted") {
      updateParams({ includeDeleted: "true", status: null });
      return;
    }
    updateParams({ includeDeleted: null, status: tab === "all" ? null : tab });
  }

  function resetClientFilters() {
    setQuery("");
    setMediaFilter("all");
    setSortMode("newest");
  }

  function toggleSelected(id: string) {
    if (!canManageReviews) return;
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAllVisible() {
    if (!canManageReviews) return;
    const visibleIds = visibleReviews.map((review) => review.id);
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds])),
    );
  }

  async function runStatusUpdate(reviewIds: string[], status: ReviewStatus) {
    if (!canManageReviews) return;
    setPending(true);
    setFeedback(null);
    try {
      const isBulk = reviewIds.length > 1;
      const response = await fetch(
        isBulk
          ? "/api/backend/admin/reviews/bulk/status"
          : `/api/backend/admin/reviews/${reviewIds[0]}/status`,
        {
          body: JSON.stringify(isBulk ? { reviewIds, status } : { status }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        },
      );
      if (!response.ok) throw new Error(await extractError(response, "อัปเดตสถานะรีวิวไม่สำเร็จ"));
      setFeedback({ tone: "success", text: status === "published" ? "เผยแพร่รีวิวแล้ว" : "ซ่อนรีวิวจากหน้าร้านแล้ว" });
      setSelectedIds([]);
      setIntent(null);
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "อัปเดตสถานะรีวิวไม่สำเร็จ" });
    } finally {
      setPending(false);
    }
  }

  async function deleteReview(review: AdminReview) {
    if (!canManageReviews) return;
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/backend/admin/reviews/${review.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await extractError(response, "ลบรีวิวไม่สำเร็จ"));
      setFeedback({ tone: "success", text: "ลบรีวิวแล้ว" });
      setIntent(null);
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "ลบรีวิวไม่สำเร็จ" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">จัดการรีวิว</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            ตรวจสอบรีวิวสินค้า รูปภาพ และจัดการการแสดงผลบนหน้าร้าน
          </p>
        </div>
        <p className="text-xs text-muted-foreground">ข้อมูลหน้า {props.page.toLocaleString("th-TH")} จาก {props.totalPages.toLocaleString("th-TH")}</p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="ภาพรวมรีวิว">
        <SummaryCard label="รีวิวทั้งหมด" value={props.total} icon={<MessageSquareText />} tone="neutral" onClick={() => setTab("all")} />
        <SummaryCard label="เผยแพร่แล้ว" value={pageCounts.published} icon={<Eye />} tone="success" helper="รายการในหน้านี้" onClick={() => setTab("published")} />
        <SummaryCard label="ซ่อนแล้ว" value={pageCounts.hidden} icon={<EyeOff />} tone="muted" helper="รายการในหน้านี้" onClick={() => setTab("hidden")} />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <StatusTabs
          active={showDeleted ? "deleted" : currentStatus === "published" || currentStatus === "hidden" ? currentStatus : "all"}
          counts={{ all: props.total, ...pageCounts }}
          onChange={setTab}
        />
        <FilterToolbar
          mediaFilter={mediaFilter}
          onMediaChange={setMediaFilter}
          onQueryChange={setQuery}
          onRatingChange={(value) => updateParams({ rating: value === "all" ? null : value })}
          onReset={() => {
            resetClientFilters();
            updateParams({ rating: null });
          }}
          onSortChange={setSortMode}
          query={query}
          rating={props.searchParams.rating ?? "all"}
          sortMode={sortMode}
        />
      </section>

      {canManageReviews && selectedIds.length > 0 ? (
        <BulkToolbar
          count={selectedIds.length}
          disabled={pending || selectedReviews.some((review) => review.isDeleted)}
          onClear={() => setSelectedIds([])}
          onStatus={(status) => void runStatusUpdate(selectedIds, status)}
        />
      ) : null}

      {feedback ? (
        <div role="status" className={cn("flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold", feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700")}>
          <span>{feedback.text}</span>
          <button type="button" aria-label="ปิดข้อความ" className="grid size-8 place-items-center rounded-md hover:bg-black/5" onClick={() => setFeedback(null)}><X className="size-4" /></button>
        </div>
      ) : null}

      {props.error ? (
        <StatePanel
          icon={<RotateCcw />}
          title="ไม่สามารถโหลดรีวิวได้"
          description="เกิดข้อผิดพลาดขณะโหลดข้อมูล กรุณาลองใหม่อีกครั้ง"
          action={<Button onClick={() => router.refresh()}><RotateCcw />ลองใหม่</Button>}
        />
      ) : visibleReviews.length === 0 ? (
        <StatePanel
          icon={<MessageSquareText />}
          title={props.reviews.length === 0 ? "ยังไม่มีรีวิวสินค้า" : "ไม่พบรีวิวที่ค้นหา"}
          description={props.reviews.length === 0 ? "รีวิวจากลูกค้าจะแสดงที่นี่เมื่อมีการให้คะแนนหรือแสดงความคิดเห็น" : "ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองที่ใช้งานอยู่"}
          action={hasClientFilters ? <Button variant="outline" onClick={resetClientFilters}><X />ล้างตัวกรอง</Button> : undefined}
        />
      ) : (
        <section className="space-y-3" aria-label="รายการรีวิว">
          {canManageReviews ? <label className="flex min-h-11 items-center gap-3 px-1 text-sm font-semibold text-muted-foreground">
            <input className="size-4 accent-foreground" type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
            เลือกรายการที่แสดงทั้งหมด ({visibleReviews.length.toLocaleString("th-TH")})
          </label> : null}
          {visibleReviews.map((review) => (
            <ReviewCard
              canManage={canManageReviews}
              key={review.id}
              checked={selectedIds.includes(review.id)}
              disabled={pending}
              onChecked={() => toggleSelected(review.id)}
              onDelete={() => setIntent({ kind: "delete", review })}
              onDetail={() => setDetailReview(review)}
              onMedia={(index) => setLightbox({ review, index })}
              onStatus={(status) => setIntent({ kind: "status", review, status })}
              review={review}
            />
          ))}
        </section>
      )}

      <ReviewPagination {...props} onNavigate={updateParams} />

      <ReviewDetailSheet review={detailReview} onOpenChange={(open) => !open && setDetailReview(null)} onMedia={(index) => detailReview && setLightbox({ review: detailReview, index })} />
      <ReviewLightbox state={lightbox} onChange={setLightbox} />
      <ConfirmationDialog
        intent={intent}
        pending={pending}
        onClose={() => !pending && setIntent(null)}
        onConfirm={() => {
          if (!intent) return;
          if (intent.kind === "delete") void deleteReview(intent.review);
          else void runStatusUpdate([intent.review.id], intent.status);
        }}
      />
    </div>
  );
}

function SummaryCard({ label, value, helper, icon, tone, onClick }: { label: string; value: number; helper?: string; icon: React.ReactNode; tone: "neutral" | "success" | "muted"; onClick: () => void }) {
  const tones = {
    neutral: "bg-sky-50 text-sky-700 border-sky-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    muted: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <button type="button" onClick={onClick} className="flex min-h-24 items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <div><p className="text-sm font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString("th-TH")} <span className="text-sm font-semibold text-muted-foreground">รายการ</span></p>{helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}</div>
      <span className={cn("grid size-11 place-items-center rounded-lg border [&_svg]:size-5", tones[tone])}>{icon}</span>
    </button>
  );
}

function StatusTabs({ active, counts, onChange }: { active: "all" | "published" | "hidden" | "deleted"; counts: { all: number; published: number; hidden: number; deleted: number }; onChange: (tab: "all" | "published" | "hidden" | "deleted") => void }) {
  const tabs = [
    { id: "all" as const, label: "ทั้งหมด" },
    { id: "published" as const, label: "เผยแพร่แล้ว" },
    { id: "hidden" as const, label: "ซ่อนแล้ว" },
    { id: "deleted" as const, label: "ถูกลบ" },
  ];
  return (
    <div className="overflow-x-auto border-b border-border px-3">
      <div className="flex min-w-max gap-1" role="tablist" aria-label="สถานะรีวิว">
        {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => onChange(tab.id)} className={cn("relative flex min-h-12 items-center gap-2 px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground", active === tab.id && "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-foreground")}><span>{tab.label}</span><span className={cn("rounded-full bg-muted px-2 py-0.5 text-xs", active === tab.id && "bg-foreground text-background")}>{counts[tab.id].toLocaleString("th-TH")}</span></button>)}
      </div>
    </div>
  );
}

function FilterToolbar({ query, rating, mediaFilter, sortMode, onQueryChange, onRatingChange, onMediaChange, onSortChange, onReset }: { query: string; rating: string; mediaFilter: MediaFilter; sortMode: SortMode; onQueryChange: (value: string) => void; onRatingChange: (value: string) => void; onMediaChange: (value: MediaFilter) => void; onSortChange: (value: SortMode) => void; onReset: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const filters = <>
    <NativeSelect className="w-full sm:w-40" aria-label="กรองคะแนน" value={rating} onChange={(event) => onRatingChange(event.target.value)}><NativeSelectOption value="all">ทุกคะแนน</NativeSelectOption>{[5,4,3,2,1].map((value) => <NativeSelectOption key={value} value={value}>{value} ดาว</NativeSelectOption>)}</NativeSelect>
    <NativeSelect className="w-full sm:w-40" aria-label="กรองรูปภาพ" value={mediaFilter} onChange={(event) => onMediaChange(event.target.value as MediaFilter)}><NativeSelectOption value="all">รูปภาพทั้งหมด</NativeSelectOption><NativeSelectOption value="with">มีรูปภาพ</NativeSelectOption><NativeSelectOption value="without">ไม่มีรูปภาพ</NativeSelectOption></NativeSelect>
    <NativeSelect className="w-full sm:w-44" aria-label="เรียงรีวิว" value={sortMode} onChange={(event) => onSortChange(event.target.value as SortMode)}><NativeSelectOption value="newest">ใหม่ล่าสุด</NativeSelectOption><NativeSelectOption value="oldest">เก่าสุด</NativeSelectOption><NativeSelectOption value="rating-high">คะแนนสูงสุด</NativeSelectOption><NativeSelectOption value="rating-low">คะแนนต่ำสุด</NativeSelectOption><NativeSelectOption value="media">มีรูปภาพก่อน</NativeSelectOption></NativeSelect>
  </>;
  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-9" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="ค้นหาชื่อลูกค้า ชื่อสินค้า หรือข้อความรีวิว" aria-label="ค้นหารีวิว" />{query ? <button type="button" aria-label="ล้างคำค้นหา" onClick={() => onQueryChange("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md hover:bg-muted"><X className="size-4" /></button> : null}</div>
        <Button type="button" variant="outline" className="sm:hidden" size="icon-lg" aria-label="เปิดตัวกรอง" onClick={() => setMobileOpen(true)}><Filter /></Button>
      </div>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">{filters}<Button variant="ghost" onClick={onReset}><RotateCcw />ล้างตัวกรอง</Button></div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl"><SheetHeader><SheetTitle>ตัวกรองรีวิว</SheetTitle><SheetDescription>เลือกคะแนน รูปภาพ และลำดับการแสดงผล</SheetDescription></SheetHeader><div className="grid gap-3 px-4">{filters}</div><div className="grid grid-cols-2 gap-2 p-4"><Button variant="outline" onClick={onReset}>ล้างตัวกรอง</Button><Button onClick={() => setMobileOpen(false)}>แสดงผลลัพธ์</Button></div></SheetContent></Sheet>
    </div>
  );
}

function ReviewCard({ review, checked, disabled, canManage, onChecked, onDetail, onMedia, onStatus, onDelete }: { review: AdminReview; checked: boolean; disabled: boolean; canManage: boolean; onChecked: () => void; onDetail: () => void; onMedia: (index: number) => void; onStatus: (status: ReviewStatus) => void; onDelete: () => void }) {
  return (
    <article className={cn("group rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/25 hover:bg-muted/10 sm:p-5", review.isDeleted && "opacity-70")}>
      <div className="flex items-start gap-3 sm:gap-4">
        {canManage ? <input type="checkbox" className="mt-3 size-4 shrink-0 accent-foreground" aria-label={`เลือกรีวิวของ ${review.userName}`} checked={checked} onChange={onChecked} /> : null}
        <Avatar review={review} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <button type="button" className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onDetail}>
              <p className="truncate text-base font-black text-foreground">{review.userName}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">รีวิวสินค้า: <span className="font-semibold text-foreground">{review.productName}</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
            </button>
            <StatusBadge review={review} />
          </div>

          <div className="mt-4"><Rating value={review.rating} /><p className="mt-3 line-clamp-4 whitespace-pre-wrap text-[15px] leading-7 text-foreground">{review.comment || "ไม่มีข้อความรีวิว"}</p>{review.comment.length > 240 ? <button type="button" onClick={onDetail} className="mt-1 text-sm font-semibold underline underline-offset-4">อ่านเพิ่มเติม</button> : null}</div>
          <MediaGallery review={review} onOpen={onMedia} />

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {review.orderNumber ? <span className="inline-flex items-center gap-1.5"><ShoppingBag className="size-3.5" />ออเดอร์ #{review.orderNumber}</span> : null}
              {review.sku ? <span className="inline-flex items-center gap-1.5"><Box className="size-3.5" />SKU {review.sku}</span> : null}
              {!review.orderNumber && !review.sku ? <span>ไม่มีข้อมูลออเดอร์เพิ่มเติม</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {review.productSlug ? <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/products/${review.productSlug}`} />}><Package />ดูสินค้า</Button> : null}
              {review.orderId ? <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/orders/${review.orderId}`} />}><ShoppingBag />ดูออเดอร์</Button> : null}
              {canManage && !review.isDeleted ? <Button variant="outline" size="sm" disabled={disabled} onClick={() => onStatus(review.status === "published" ? "hidden" : "published")}>{review.status === "published" ? <EyeOff /> : <Eye />}{review.status === "published" ? "ซ่อนจากหน้าร้าน" : "เผยแพร่บนหน้าร้าน"}</Button> : null}
              <ReviewOverflow review={review} canManage={canManage} onDetail={onDetail} onDelete={onDelete} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Avatar({ review }: { review: AdminReview }) {
  if (review.userAvatarUrl) return <ReviewMediaImage src={review.userAvatarUrl} alt={`รูปโปรไฟล์ ${review.userName}`} className="size-11 shrink-0 rounded-full border border-border object-cover sm:size-12" />;
  return <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-black text-sky-800 sm:size-12">{initials(review.userName)}</span>;
}

function Rating({ value }: { value: number }) {
  return <div className="flex items-center gap-2" aria-label={`${value} จาก 5 ดาว`}><span className="flex gap-0.5">{[1,2,3,4,5].map((star) => <Star key={star} className={cn("size-4", star <= value ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")} />)}</span><span className="text-sm font-bold">{value ? value.toFixed(1) : "-"}</span></div>;
}

function StatusBadge({ review }: { review: AdminReview }) {
  if (review.isDeleted) return <Badge className="w-fit border border-red-200 bg-red-50 text-red-700">ถูกลบ</Badge>;
  return review.status === "published" ? <Badge className="w-fit border border-emerald-200 bg-emerald-50 text-emerald-700"><Check />เผยแพร่แล้ว</Badge> : <Badge className="w-fit border border-slate-200 bg-slate-100 text-slate-700"><EyeOff />ซ่อนแล้ว</Badge>;
}

function MediaGallery({ review, onOpen }: { review: AdminReview; onOpen: (index: number) => void }) {
  if (!review.media.length) return <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ImageIcon className="size-3.5" />ไม่มีสื่อแนบ</p>;
  return <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{review.media.slice(0,4).map((media, index) => <button key={media.id} type="button" onClick={() => onOpen(index)} className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><MediaThumbnail media={media} productName={review.productName} index={index} />{index === 3 && review.media.length > 4 ? <span className="absolute inset-0 grid place-items-center bg-black/60 text-sm font-bold text-white">+{review.media.length - 4}</span> : null}</button>)}</div>;
}

function MediaThumbnail({ media, productName, index }: { media: AdminReviewMedia; productName: string; index: number }) {
  if (!isVideoMedia(media)) {
    return <ReviewMediaImage src={media.thumbnailUrl ?? media.url} fallbackSrc={media.url} alt={`รูปรีวิว ${productName} ลำดับที่ ${index + 1}`} className="size-full object-cover" />;
  }

  return <><video src={media.url} poster={media.thumbnailUrl ?? undefined} preload="metadata" muted playsInline aria-label={`วิดีโอรีวิว ${productName} ลำดับที่ ${index + 1}`} className="size-full object-cover" /><span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/15"><span className="grid size-8 place-items-center rounded-full bg-black/70 text-white"><Play className="ml-0.5 size-4 fill-current" /></span></span></>;
}

function ReviewOverflow({ review, canManage, onDetail, onDelete }: { review: AdminReview; canManage: boolean; onDetail: () => void; onDelete: () => void }) {
  return <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`คำสั่งเพิ่มเติมสำหรับรีวิวของ ${review.userName}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={onDetail}><MessageSquareText />ดูรายละเอียด</DropdownMenuItem>{review.productSlug ? <DropdownMenuItem render={<Link href={`/products/${review.productSlug}`} />}><Package />ดูสินค้า</DropdownMenuItem> : null}{review.orderId ? <DropdownMenuItem render={<Link href={`/orders/${review.orderId}`} />}><ShoppingBag />ดูออเดอร์</DropdownMenuItem> : null}<DropdownMenuItem onClick={() => void navigator.clipboard.writeText(review.id)}><Copy />คัดลอก Review ID</DropdownMenuItem>{canManage && !review.isDeleted ? <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 />ลบรีวิว</DropdownMenuItem></> : null}</DropdownMenuContent></DropdownMenu>;
}

function BulkToolbar({ count, disabled, onClear, onStatus }: { count: number; disabled: boolean; onClear: () => void; onStatus: (status: ReviewStatus) => void }) {
  return <div className="sticky top-3 z-20 flex flex-col gap-3 rounded-xl border border-foreground/15 bg-foreground px-4 py-3 text-background shadow-lg sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-bold">เลือกแล้ว {count.toLocaleString("th-TH")} รายการ</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={disabled} onClick={() => onStatus("published")}><Eye />เผยแพร่</Button><Button size="sm" variant="secondary" disabled={disabled} onClick={() => onStatus("hidden")}><EyeOff />ซ่อน</Button><Button size="sm" variant="ghost" className="text-background hover:bg-white/10 hover:text-background" onClick={onClear}><X />ล้างการเลือก</Button></div></div>;
}

function ReviewDetailSheet({ review, onOpenChange, onMedia }: { review: AdminReview | null; onOpenChange: (open: boolean) => void; onMedia: (index: number) => void }) {
  return <Sheet open={Boolean(review)} onOpenChange={onOpenChange}><SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">{review ? <><SheetHeader className="border-b border-border pr-14"><SheetTitle className="text-xl font-black">รายละเอียดรีวิว</SheetTitle><SheetDescription>ข้อมูลลูกค้า สินค้า และการแสดงผลรีวิว</SheetDescription></SheetHeader><div className="space-y-6 p-4"><div className="flex items-center gap-3"><Avatar review={review} /><div className="min-w-0"><p className="truncate font-black">{review.userName}</p><p className="truncate text-sm text-muted-foreground">{review.productName}</p></div><div className="ml-auto"><StatusBadge review={review} /></div></div><section><Rating value={review.rating} /><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{review.comment || "ไม่มีข้อความรีวิว"}</p></section>{review.media.length ? <section><h3 className="mb-3 font-bold">รูปภาพและวิดีโอรีวิว</h3><div className="grid grid-cols-3 gap-2">{review.media.map((media,index) => <button type="button" key={media.id} onClick={() => onMedia(index)} className="relative aspect-square overflow-hidden rounded-lg border bg-muted"><MediaThumbnail media={media} productName={review.productName} index={index} /></button>)}</div></section> : null}<section className="rounded-lg bg-muted/50 p-4"><h3 className="font-bold">ข้อมูลที่เกี่ยวข้อง</h3><dl className="mt-3 grid gap-3 text-sm"><DetailRow label="ออเดอร์" value={review.orderNumber || "ไม่มีข้อมูล"} /><DetailRow label="SKU" value={review.sku || "ไม่มีข้อมูล"} /><DetailRow label="สร้างเมื่อ" value={formatDate(review.createdAt)} /><DetailRow label="อัปเดตเมื่อ" value={formatDate(review.updatedAt)} />{review.editedAt ? <DetailRow label="แก้ไขเมื่อ" value={formatDate(review.editedAt)} /> : null}</dl></section><details className="rounded-lg border border-border p-4"><summary className="cursor-pointer font-bold">ข้อมูลทางเทคนิค</summary><dl className="mt-3 grid gap-3 text-xs"><DetailRow label="Review ID" value={review.id} /><DetailRow label="Product ID" value={review.productId || "-"} /><DetailRow label="Customer ID" value={review.userId || "-"} /></dl></details>{review.actionHistory.length ? <section><h3 className="font-bold">ประวัติการจัดการ</h3><p className="mt-2 text-sm text-muted-foreground">มี {review.actionHistory.length.toLocaleString("th-TH")} รายการ</p></section> : null}</div></> : null}</SheetContent></Sheet>;
}

function DetailRow({ label, value }: { label: string; value: string }) { return <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="break-all font-medium">{value}</dd></div>; }

function ReviewLightbox({ state, onChange }: { state: { review: AdminReview; index: number } | null; onChange: (value: { review: AdminReview; index: number } | null) => void }) {
  useEffect(() => {
    if (!state) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") onChange({ ...state!, index: (state!.index - 1 + state!.review.media.length) % state!.review.media.length });
      if (event.key === "ArrowRight") onChange({ ...state!, index: (state!.index + 1) % state!.review.media.length });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onChange, state]);
  const media = state?.review.media[state.index];
  return <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onChange(null)}><DialogContent className="max-w-5xl border-0 bg-black p-2 text-white sm:p-4">{state && media ? <div className="relative flex min-h-[60vh] items-center justify-center">{isVideoMedia(media) ? <video key={media.id} src={media.url} poster={media.thumbnailUrl ?? undefined} controls autoPlay playsInline className="max-h-[80vh] max-w-full" aria-label={`วิดีโอรีวิว ${state.index + 1} จาก ${state.review.media.length}`} /> : <ReviewMediaImage src={media.url} fallbackSrc={media.thumbnailUrl} alt={`รูปรีวิว ${state.index + 1} จาก ${state.review.media.length}`} className="max-h-[80vh] max-w-full object-contain" />}{state.review.media.length > 1 ? <><Button variant="secondary" size="icon-lg" className="absolute left-2" aria-label="สื่อก่อนหน้า" onClick={() => onChange({ ...state, index: (state.index - 1 + state.review.media.length) % state.review.media.length })}><ChevronLeft /></Button><Button variant="secondary" size="icon-lg" className="absolute right-2" aria-label="สื่อถัดไป" onClick={() => onChange({ ...state, index: (state.index + 1) % state.review.media.length })}><ChevronRight /></Button></> : null}<span className="absolute bottom-2 rounded-full bg-black/70 px-3 py-1 text-xs">{state.index + 1} / {state.review.media.length}</span></div> : null}</DialogContent></Dialog>;
}

function ConfirmationDialog({ intent, pending, onClose, onConfirm }: { intent: ActionIntent; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!intent) return null;
  const isDelete = intent.kind === "delete";
  const isHide = intent.kind === "status" && intent.status === "hidden";
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle className="text-lg font-black">{isDelete ? "ลบรีวิวนี้?" : isHide ? "ซ่อนรีวิวจากหน้าร้าน?" : "เผยแพร่รีวิวบนหน้าร้าน?"}</DialogTitle><DialogDescription>{isDelete ? "รีวิวจะถูกนำออกจากระบบตามเงื่อนไขของหลังบ้าน การดำเนินการนี้อาจย้อนกลับไม่ได้" : isHide ? "รีวิวนี้จะไม่แสดงบนหน้าสินค้า แต่ข้อมูลจะยังคงอยู่ในระบบ" : "รีวิวนี้จะแสดงบนหน้าสินค้าและลูกค้าจะสามารถมองเห็นได้"}</DialogDescription></DialogHeader><div className="rounded-lg bg-muted/50 p-3"><p className="font-bold">{intent.review.userName}</p><p className="text-sm text-muted-foreground">{intent.review.productName}</p><p className="mt-2 line-clamp-2 text-sm">{intent.review.comment || "ไม่มีข้อความรีวิว"}</p></div><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={pending} onClick={onClose}>{isDelete ? "กลับ" : "ยกเลิก"}</Button><Button variant={isDelete ? "destructive" : "default"} disabled={pending} onClick={onConfirm}>{pending ? <Spinner /> : isDelete ? <Trash2 /> : isHide ? <EyeOff /> : <Eye />}{pending ? "กำลังบันทึก..." : isDelete ? "ยืนยันการลบ" : isHide ? "ยืนยันการซ่อน" : "ยืนยันการเผยแพร่"}</Button></div></DialogContent></Dialog>;
}

function ReviewPagination({ page, pageSize, total, totalPages, onNavigate }: Props & { onNavigate: (overrides: Record<string, string | null>) => void }) {
  if (!total) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = buildPageList(page, totalPages);
  return <footer className="flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between"><p className="text-sm text-muted-foreground">แสดง {start.toLocaleString("th-TH")}–{end.toLocaleString("th-TH")} จาก {total.toLocaleString("th-TH")} รายการ</p><div className="flex flex-wrap items-center gap-2"><NativeSelect className="w-44" value={String(pageSize)} onChange={(event) => onNavigate({ pageSize: event.target.value, page: "1" })} aria-label="จำนวนรายการต่อหน้า">{[10,20,50,100].map((size) => <NativeSelectOption key={size} value={size}>{size} รายการต่อหน้า</NativeSelectOption>)}</NativeSelect><nav className="flex items-center gap-1" aria-label="แบ่งหน้า"><Button variant="outline" size="icon-sm" disabled={page <= 1} aria-label="หน้าก่อนหน้า" onClick={() => onNavigate({ page: String(page - 1) })}><ChevronLeft /></Button>{pages.map((item,index) => item === "..." ? <span key={`dots-${index}`} className="grid size-9 place-items-center text-muted-foreground">…</span> : <Button key={item} variant={item === page ? "default" : "ghost"} size="icon-sm" aria-current={item === page ? "page" : undefined} onClick={() => onNavigate({ page: String(item) })}>{item}</Button>)}<Button variant="outline" size="icon-sm" disabled={page >= totalPages} aria-label="หน้าถัดไป" onClick={() => onNavigate({ page: String(page + 1) })}><ChevronRight /></Button></nav></div></footer>;
}

function StatePanel({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) { return <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-6 text-center"><span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">{icon}</span><h2 className="mt-4 text-lg font-black">{title}</h2><p className="mt-1 max-w-lg text-sm text-muted-foreground">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>; }

function buildPageList(current: number, total: number): (number | "...")[] { if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1); const list: (number | "...")[] = [1]; if (current > 3) list.push("..."); for (let value = Math.max(2, current - 1); value <= Math.min(total - 1, current + 1); value += 1) list.push(value); if (current < total - 2) list.push("..."); list.push(total); return list; }
function initials(value: string) { const trimmed = value.trim(); return !trimmed || trimmed === "-" ? "U" : trimmed.slice(0, 2).toUpperCase(); }
function dateValue(value: string | null) { const parsed = value ? new Date(value).getTime() : 0; return Number.isNaN(parsed) ? 0 : parsed; }
function isVideoMedia(media: AdminReviewMedia) { const type = media.type?.toLowerCase() ?? ""; const url = media.url.toLowerCase().split("?")[0]; return type.includes("video") || /\.(mp4|webm|mov|m4v|ogv)$/.test(url); }
function formatDate(value: string | null) { if (!value) return "ไม่ระบุวันที่"; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date); }
async function extractError(response: Response, fallback: string) { try { const body = await response.json() as { message?: string; error?: string }; return body.message || body.error || fallback; } catch { return fallback; } }
