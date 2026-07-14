import { cookies } from "next/headers";
import {
  PONPON_API_BASE_URL,
  PonPonApiError,
  ponponApiJson,
} from "@/lib/ponpon-api";

export type ReviewStatus = "published" | "hidden";
export type ReviewMediaStatus = "processing" | "ready" | "failed" | string;

export type AdminReviewMedia = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  type: string | null;
  status: ReviewMediaStatus;
};

export type AdminReview = {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  isDeleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
  media: AdminReviewMedia[];
};

export type AdminReviewFilters = {
  productId?: string;
  userId?: string;
  status?: ReviewStatus;
  rating?: number;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
};

type ApiReviewMedia = {
  id?: string | null;
  url?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  type?: string | null;
  mediaType?: string | null;
  status?: string | null;
};

type ApiReview = {
  id?: string | null;
  reviewId?: string | null;
  productId?: string | null;
  productName?: string | null;
  product?: { id?: string | null; name?: string | null } | null;
  userId?: string | null;
  userName?: string | null;
  userDisplayName?: string | null;
  user?: { id?: string | null; name?: string | null; displayName?: string | null } | null;
  rating?: number | string | null;
  comment?: string | null;
  content?: string | null;
  body?: string | null;
  status?: string | null;
  isDeleted?: boolean | null;
  deletedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  media?: ApiReviewMedia[] | null;
  medias?: ApiReviewMedia[] | null;
};

type ReviewListResponse =
  | ApiReview[]
  | {
      items?: ApiReview[];
      reviews?: ApiReview[];
      data?: ApiReview[];
      total?: number;
      totalCount?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;
    };

export async function getAdminReviews(filters: AdminReviewFilters = {}): Promise<{
  authRequired: boolean;
  error?: string;
  reviews: AdminReview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = positiveInteger(filters.page, 1);
  const pageSize = positiveInteger(filters.pageSize, 20);

  try {
    const response = await ponponApiJson<ReviewListResponse>(
      `/api/admin/reviews?${buildReviewQuery({ ...filters, page, pageSize })}`,
      { headers: await authHeaders() },
    );
    const items = Array.isArray(response)
      ? response
      : response.items ?? response.reviews ?? response.data ?? [];
    const total = Array.isArray(response)
      ? items.length
      : response.total ?? response.totalCount ?? items.length;
    const totalPages = Array.isArray(response)
      ? Math.max(1, Math.ceil(total / pageSize))
      : response.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

    return {
      authRequired: false,
      reviews: items.map(normalizeReview),
      total,
      page: Array.isArray(response) ? page : response.page ?? page,
      pageSize: Array.isArray(response) ? pageSize : response.pageSize ?? pageSize,
      totalPages,
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true, reviews: [], total: 0, page, pageSize, totalPages: 1 };
    }

    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load reviews",
      reviews: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  }
}

export async function getAdminReview(id: string): Promise<{
  authRequired: boolean;
  error?: string;
  review?: AdminReview;
}> {
  try {
    const response = await ponponApiJson<ApiReview>(`/api/admin/reviews/${id}`, {
      headers: await authHeaders(),
    });

    return { authRequired: false, review: normalizeReview(response) };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return { authRequired: true };
    }

    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load review",
    };
  }
}

function buildReviewQuery(filters: AdminReviewFilters) {
  const params = new URLSearchParams();

  if (filters.productId) params.set("productId", filters.productId);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.status) params.set("status", filters.status);
  if (filters.rating) params.set("rating", String(filters.rating));
  if (typeof filters.includeDeleted === "boolean") {
    params.set("includeDeleted", String(filters.includeDeleted));
  }
  params.set("page", String(positiveInteger(filters.page, 1)));
  params.set("pageSize", String(positiveInteger(filters.pageSize, 20)));

  return params.toString();
}

function normalizeReview(review: ApiReview): AdminReview {
  const productId = review.productId ?? review.product?.id ?? "";
  const userId = review.userId ?? review.user?.id ?? "";
  const productName = review.productName ?? review.product?.name ?? productId;
  const userName =
    review.userName ??
    review.userDisplayName ??
    review.user?.displayName ??
    review.user?.name ??
    userId;
  const status = review.status === "hidden" ? "hidden" : "published";
  const deletedAt = review.deletedAt ?? null;

  return {
    id: review.id ?? review.reviewId ?? "",
    productId,
    productName: productName || "-",
    userId,
    userName: userName || "-",
    rating: positiveInteger(review.rating, 0),
    comment: review.comment ?? review.content ?? review.body ?? "",
    status,
    isDeleted: review.isDeleted ?? Boolean(deletedAt),
    createdAt: review.createdAt ?? null,
    updatedAt: review.updatedAt ?? null,
    deletedAt,
    media: (review.media ?? review.medias ?? []).map(normalizeMedia),
  };
}

function normalizeMedia(media: ApiReviewMedia): AdminReviewMedia {
  const url = normalizeMediaUrl(media.url ?? media.mediaUrl);

  return {
    id: media.id ?? url ?? crypto.randomUUID(),
    url: url ?? "",
    thumbnailUrl: normalizeMediaUrl(media.thumbnailUrl),
    type: media.type ?? media.mediaType ?? null,
    status: media.status ?? "ready",
  };
}

function normalizeMediaUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const mediaUrl = new URL(trimmed, PONPON_API_BASE_URL);
    const apiUrl = new URL(PONPON_API_BASE_URL);

    if (
      mediaUrl.origin === apiUrl.origin &&
      mediaUrl.pathname.startsWith("/api/")
    ) {
      return `/api/backend/${mediaUrl.pathname.slice(5)}${mediaUrl.search}`;
    }

    return mediaUrl.toString();
  } catch {
    return trimmed;
  }
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function authHeaders() {
  const token = (await cookies()).get("pp_admin_access_token")?.value;
  return token ? { authorization: `Bearer ${token}` } : undefined;
}
