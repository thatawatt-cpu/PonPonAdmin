import { redirect } from "next/navigation";
import { ReviewModerationDashboard } from "@/components/review-moderation-dashboard";
import { getAdminReviews } from "@/lib/admin-reviews";

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

  return (
    <ReviewModerationDashboard
      error={result.error}
      page={result.page}
      pageSize={result.pageSize}
      reviews={result.reviews}
      searchParams={serializableParams(params)}
      total={result.total}
      totalPages={result.totalPages}
    />
  );
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

function serializableParams(params: {
  [key: string]: string | string[] | undefined;
}) {
  return Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string",
    ),
  );
}
