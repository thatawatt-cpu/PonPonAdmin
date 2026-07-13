import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReviewActions } from "@/components/review-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminReview } from "@/lib/admin-reviews";
import { cn } from "@/lib/utils";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getAdminReview(id);

  if (result.authRequired) redirect("/login");
  if (!result.review) notFound();

  const { review } = result;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Moderation"
        title="Review detail"
        description={`รีวิวจาก ${review.userName} สำหรับ ${review.productName}`}
        action={
          <Link href="/reviews" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft />
            กลับหน้ารายการ
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              <span>{review.productName}</span>
              <Badge variant={review.status === "hidden" ? "outline" : "default"}>
                {review.status}
              </Badge>
              {review.isDeleted ? <Badge variant="destructive">Deleted</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="inline-flex items-center gap-1 text-lg font-black">
              <Star className="size-5 fill-amber-400 text-amber-400" />
              {review.rating || "-"}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {review.comment || "ไม่มีข้อความรีวิว"}
            </p>
            {review.media.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {review.media.map((media) => (
                  <a
                    key={media.id}
                    href={media.url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    {media.url ? (
                      <Image
                        alt=""
                        className="aspect-square w-full object-cover"
                        height={640}
                        src={media.thumbnailUrl ?? media.url}
                        unoptimized
                        width={640}
                      />
                    ) : (
                      <div className="aspect-square" />
                    )}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                      <span className="truncate text-muted-foreground">
                        {media.type ?? "media"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-semibold uppercase text-white",
                          media.status === "ready"
                            ? "bg-emerald-600"
                            : media.status === "failed"
                              ? "bg-destructive"
                              : "bg-amber-600",
                        )}
                      >
                        {media.status}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewActions
                reviewId={review.id}
                status={review.status}
                isDeleted={review.isDeleted}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <MetaRow label="Review ID" value={review.id} />
              <MetaRow label="Product ID" value={review.productId || "-"} />
              <MetaRow label="User ID" value={review.userId || "-"} />
              <MetaRow label="Created" value={formatDate(review.createdAt)} />
              <MetaRow label="Updated" value={formatDate(review.updatedAt)} />
              <MetaRow label="Deleted" value={formatDate(review.deletedAt)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
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
