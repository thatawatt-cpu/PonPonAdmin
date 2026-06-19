import { cookies } from "next/headers";
import {
  adminProducts as fallbackProducts,
  type SyncStatus,
} from "@/lib/admin-data";
import { PonPonApiError, ponponApiJson } from "@/lib/ponpon-api";

export type { SyncStatus };

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  "Fashion & Accessories": "แฟชั่น & เครื่องประดับ",
  "Fashion&Accessories": "แฟชั่น & เครื่องประดับ",
  "Food & Beverage": "อาหาร & เครื่องดื่ม",
  "Food&Beverage": "อาหาร & เครื่องดื่ม",
  "Beauty & Health": "ความงาม & สุขภาพ",
  "Beauty&Health": "ความงาม & สุขภาพ",
  "Home & Living": "ของใช้ในบ้าน",
  "Home&Living": "ของใช้ในบ้าน",
  "Toys & Collectibles": "ของเล่น & ของสะสม",
  "Toys&Collectibles": "ของเล่น & ของสะสม",
};

export type AdminProductImage = {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductOption = { name: string; value: string };

export type AdminProduct = {
  id: string;
  zortProductId: string;
  zortSku: string;
  baseSku: string;
  lastSyncedAt: string;
  syncStatus: SyncStatus;
  name: string;
  category: string;
  zortCategoryId: string;
  price: number;
  stock: number;
  availableStock: number;
  sold: number;
  image: string;
  variantImages: string[];
  options: ProductOption[];
  status: "active" | "low" | "soldout";
  isVisibleOnLiff: boolean;
  barcode: string | null;
  purchasePrice: number | null;
  weight: number | null;
  height: number | null;
  length: number | null;
  width: number | null;
  isFeatured: boolean;
  isBestSeller: boolean;
  isOnHomepage: boolean;
  slug: string | null;
  originalPrice: number | null;
  promotionBadge: string | null;
  highlights: string | null;
  richDescription: string | null;
  images: AdminProductImage[];
};

export type AdminCategory = {
  id: string;
  zortCategoryId: number | string | null;
  name: string;
};

type ApiProductImage = {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
};

type ApiProductVariant = {
  id: string;
  zortProductId?: number | string | null;
  zortVariationId?: number | string | null;
  sku?: string | null;
  variantCode?: string | null;
  barcode?: string | null;
  sellPrice?: number | null;
  stock?: number | null;
  availableStock?: number | null;
  unitText?: string | null;
  imageUrl?: string | null;
  isActiveFromZort?: boolean | null;
  isVisibleOnLiff?: boolean | null;
  status?: string | null;
  options?: Array<{ name?: string | null; value?: string | null }> | null;
};

type ApiAdminProduct = {
  id: string;
  zortProductId?: number | string | null;
  name?: string | null;
  baseSku?: string | null;
  sku?: string | null;
  barcode?: string | null;
  sellPrice?: number | null;
  purchasePrice?: number | null;
  stock?: number | null;
  availableStock?: number | null;
  unitText?: string | null;
  imageUrl?: string | null;
  variantImages?: string[] | null;
  zortCategoryId?: number | string | null;
  categoryName?: string | null;
  isActiveFromZort?: boolean | null;
  isVisibleOnLiff?: boolean | null;
  isFeatured?: boolean | null;
  isBestSeller?: boolean | null;
  isOnHomepage?: boolean | null;
  slug?: string | null;
  originalPrice?: number | null;
  promotionBadge?: string | null;
  highlights?: string | null;
  richDescription?: string | null;
  source?: string | null;
  status?: string | null;
  lastSyncedAt?: string | null;
  weight?: number | null;
  height?: number | null;
  length?: number | null;
  width?: number | null;
  images?: ApiProductImage[] | null;
  variants?: ApiProductVariant[] | null;
};

type ApiCategory = {
  id: string;
  zortCategoryId?: number | string | null;
  name?: string | null;
};

type ProductResult = {
  authRequired: boolean;
  error?: string;
  products: AdminProduct[];
  source: "api" | "mock";
};

type CategoryResult = {
  categories: AdminCategory[];
  error?: string;
  source: "api" | "fallback";
};

export async function getAdminProducts(): Promise<ProductResult> {
  try {
    const token = await getAccessToken();
    const [products, categories] = await Promise.all([
      ponponApiJson<ApiAdminProduct[]>(
        "/api/admin/products?page=1&pageSize=100",
        {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        },
      ),
      loadCategories().catch(() => []),
    ]);
    const categoriesByZortId = new Map(
      categories.map((category) => [
        normalizeZortCategoryId(category.zortCategoryId),
        category.name,
      ]),
    );

    return {
      authRequired: false,
      products: products.map((product) =>
        mapApiProduct(product, categoriesByZortId),
      ),
      source: "api",
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return {
        authRequired: true,
        error: error.message,
        products: [],
        source: "api",
      };
    }

    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load products",
      products: fallbackProducts.map((product) => {
        const status = toProductStatus(product.status);

        return {
          ...product,
          baseSku: getSkuGroup(product.zortSku, product.id),
          zortCategoryId: "-",
          isVisibleOnLiff: status !== "soldout",
          status,
          availableStock: product.stock,
          options: [],
          barcode: null,
          purchasePrice: null,
          weight: null,
          height: null,
          length: null,
          width: null,
          isFeatured: false,
          isBestSeller: false,
          isOnHomepage: false,
          slug: null,
          originalPrice: null,
          promotionBadge: null,
          highlights: null,
          richDescription: null,
          variantImages: [],
          images: [],
        };
      }),
      source: "mock",
    };
  }
}

export async function getAdminProduct(id: string) {
  try {
    const token = await getAccessToken();
    const [product, categories] = await Promise.all([
      ponponApiJson<ApiAdminProduct>(`/api/admin/products/${id}`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      }),
      loadCategories().catch(() => []),
    ]);
    const categoriesByZortId = new Map(
      categories.map((category) => [
        normalizeZortCategoryId(category.zortCategoryId),
        category.name,
      ]),
    );
    const mapped = mapApiProduct(product, categoriesByZortId);
    const variants = (product.variants ?? []).map((v) =>
      mapApiVariant(v, mapped),
    );

    return {
      authRequired: false,
      product: mapped,
      variants,
      source: "api" as const,
    };
  } catch (error) {
    if (error instanceof PonPonApiError && error.status === 401) {
      return {
        authRequired: true,
        error: error.message,
        product: undefined,
        variants: [] as AdminProduct[],
        source: "api" as const,
      };
    }

    const fallbackProduct = fallbackProducts.find(
      (product) => product.id === id,
    );

    return {
      authRequired: false,
      error: error instanceof Error ? error.message : "Cannot load product",
      product: fallbackProduct
        ? {
            ...fallbackProduct,
            baseSku: getSkuGroup(fallbackProduct.zortSku, fallbackProduct.id),
            zortCategoryId: "-",
            isVisibleOnLiff: fallbackProduct.status !== "soldout",
            status: toProductStatus(fallbackProduct.status),
            availableStock: fallbackProduct.stock,
            options: [],
            barcode: null,
            purchasePrice: null,
            weight: null,
            height: null,
            length: null,
            width: null,
            isFeatured: false,
            isBestSeller: false,
            isOnHomepage: false,
            slug: null,
            originalPrice: null,
            promotionBadge: null,
            highlights: null,
            richDescription: null,
            variantImages: [],
            images: [],
          }
        : undefined,
      variants: [] as AdminProduct[],
      source: "mock" as const,
    };
  }
}

export async function getAdminProductGroup(id: string) {
  const detailResult = await getAdminProduct(id);

  if (detailResult.authRequired || !detailResult.product) {
    return {
      ...detailResult,
      groupSku: "",
      variants: [] as AdminProduct[],
    };
  }

  const { product, variants } = detailResult;
  const groupSku = product.baseSku || product.id;
  const variantsById = new Map<string, AdminProduct>();
  for (const variant of variants) {
    variantsById.set(variant.id, variant);
  }
  if (variantsById.size === 0) {
    variantsById.set(product.id, product);
  }

  return {
    ...detailResult,
    groupSku,
    variants: Array.from(variantsById.values()).sort((a, b) =>
      a.zortSku.localeCompare(b.zortSku),
    ),
  };
}

export async function getAdminCategories(): Promise<CategoryResult> {
  try {
    const categories = await loadCategories();

    return {
      categories,
      source: "api",
    };
  } catch (error) {
    const names = Array.from(
      new Set(
        fallbackProducts
          .map((product) => product.category.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "th"));

    return {
      categories: names.map((name) => ({
        id: `fallback-${name}`,
        zortCategoryId: null,
        name,
      })),
      error:
        error instanceof Error ? error.message : "Cannot load categories",
      source: "fallback",
    };
  }
}

async function loadCategories(): Promise<AdminCategory[]> {
  const categories = await ponponApiJson<ApiCategory[]>("/api/categories");

  return categories
    .filter((category) => category.name?.trim())
    .map((category) => ({
      id: category.id,
      zortCategoryId: category.zortCategoryId ?? null,
      name: category.name!.trim(),
    }));
}

function mapApiProduct(
  product: ApiAdminProduct,
  categoriesByZortId: Map<string, string>,
): AdminProduct {
  const stock = product.stock ?? 0;
  const availableStock = product.availableStock ?? stock;
  const isVisibleOnLiff = product.isVisibleOnLiff ?? false;
  const zortCategoryId = normalizeZortCategoryId(product.zortCategoryId);
  const rawCategory =
    categoriesByZortId.get(zortCategoryId) ??
    product.categoryName ??
    "ไม่ระบุหมวดหมู่";
  const category = CATEGORY_TRANSLATIONS[rawCategory] ?? rawCategory;

  let syncStatus: SyncStatus;
  if (product.status === "MissingFromSource") {
    syncStatus = "error";
  } else if (product.status === "Draft") {
    syncStatus = "pending";
  } else if (product.status != null) {
    syncStatus = "synced";
  } else {
    syncStatus = product.isActiveFromZort === false ? "error" : "synced";
  }

  return {
    id: product.id,
    zortProductId: String(product.zortProductId ?? "-"),
    zortSku: product.sku ?? "-",
    baseSku: product.baseSku ?? getSkuGroup(product.sku ?? product.id, product.id),
    lastSyncedAt: formatDate(product.lastSyncedAt),
    syncStatus,
    name: product.name ?? "Untitled product",
    category,
    zortCategoryId: zortCategoryId || "-",
    price: product.sellPrice ?? 0,
    stock,
    availableStock,
    sold: 0,
    image: product.imageUrl || "/images/products/cookies.png",
    variantImages: product.variantImages?.filter((u): u is string => !!u) ?? [],
    options: [],
    status: availableStock <= 0 ? "soldout" : availableStock <= 18 ? "low" : "active",
    isVisibleOnLiff,
    barcode: product.barcode ?? null,
    purchasePrice: product.purchasePrice ?? null,
    weight: product.weight ?? null,
    height: product.height ?? null,
    length: product.length ?? null,
    width: product.width ?? null,
    isFeatured: product.isFeatured ?? false,
    isBestSeller: product.isBestSeller ?? false,
    isOnHomepage: product.isOnHomepage ?? false,
    slug: product.slug ?? null,
    originalPrice: product.originalPrice ?? null,
    promotionBadge: product.promotionBadge ?? null,
    highlights: product.highlights ?? null,
    richDescription: product.richDescription ?? null,
    images: product.images ?? [],
  };
}

function mapApiVariant(
  variant: ApiProductVariant,
  parent: AdminProduct,
): AdminProduct {
  const stock = variant.stock ?? 0;
  const availableStock = variant.availableStock ?? stock;
  const isVisibleOnLiff = variant.isVisibleOnLiff ?? parent.isVisibleOnLiff;

  return {
    id: variant.id,
    zortProductId: String(variant.zortProductId ?? "-"),
    zortSku: variant.sku ?? "-",
    baseSku: parent.baseSku,
    lastSyncedAt: parent.lastSyncedAt,
    syncStatus: variant.isActiveFromZort === false ? "error" : "synced",
    name: parent.name,
    category: parent.category,
    zortCategoryId: parent.zortCategoryId,
    price: variant.sellPrice ?? 0,
    stock,
    availableStock,
    sold: 0,
    image: variant.imageUrl || parent.image,
    variantImages: [],
    options: (variant.options ?? [])
      .filter((o): o is { name: string; value: string } =>
        typeof o.name === "string" && !!o.name && typeof o.value === "string",
      )
      .map((o) => ({ name: o.name, value: o.value })),
    status: availableStock <= 0 ? "soldout" : availableStock <= 18 ? "low" : "active",
    isVisibleOnLiff,
    barcode: variant.barcode ?? null,
    purchasePrice: null,
    weight: null,
    height: null,
    length: null,
    width: null,
    isFeatured: false,
    isBestSeller: false,
    isOnHomepage: false,
    slug: null,
    originalPrice: null,
    promotionBadge: null,
    highlights: null,
    richDescription: null,
    images: [],
  };
}

function normalizeZortCategoryId(value?: number | string | null) {
  return value == null ? "" : String(value);
}

function getSkuGroup(sku: string, fallbackId: string) {
  const normalizedSku = sku.trim();
  if (!normalizedSku || normalizedSku === "-") return fallbackId;
  const separatorIndex = normalizedSku.indexOf("-");
  if (separatorIndex <= 0) return normalizedSku;
  return normalizedSku.slice(0, separatorIndex);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "ยังไม่ระบุ";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toProductStatus(status: string): AdminProduct["status"] {
  if (status === "low" || status === "soldout") {
    return status;
  }

  return "active";
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("pp_admin_access_token")?.value;
}
