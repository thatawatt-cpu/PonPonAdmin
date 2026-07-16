"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LoaderCircle,
  PackageSearch,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cachedSessionJsonRequest } from "@/lib/client-request-cache";
import { cn } from "@/lib/utils";

export type CouponProductScopeKind = "product" | "variant" | "sku";

type ProductSummary = {
  id: string;
  name?: string | null;
  baseSku?: string | null;
  imageUrl?: string | null;
  availableStock?: number | null;
};

type ProductVariant = {
  id: string;
  sku?: string | null;
  variantCode?: string | null;
  imageUrl?: string | null;
  availableStock?: number | null;
  options?: Array<{ name?: string | null; value?: string | null }> | null;
};

type ProductDetail = ProductSummary & {
  variants?: ProductVariant[] | null;
};

type ProductPage = {
  items?: ProductSummary[];
};

const PRODUCT_LIST_CACHE_MS = 2 * 60 * 1000;
const PRODUCT_DETAIL_CACHE_MS = 5 * 60 * 1000;

export function CouponScopeValuePicker({
  kind,
  value,
  onValueChange,
}: {
  kind: CouponProductScopeKind;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || selectedProduct) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "20" });
        if (query.trim()) params.set("keyword", query.trim());
        const body = await cachedSessionJsonRequest<ProductPage | ProductSummary[]>(
          "coupon-products",
          `/api/backend/admin/products/paged?${params}`,
          PRODUCT_LIST_CACHE_MS,
          "โหลดรายการสินค้าไม่สำเร็จ",
        );
        if (cancelled) return;
        const items = Array.isArray(body) ? body : body.items ?? [];
        setProducts(items);
      } catch (requestError) {
        if (cancelled) return;
        setProducts([]);
        setError(requestError instanceof Error ? requestError.message : "โหลดรายการสินค้าไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, query, selectedProduct]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setSelectedProduct(null);
      setError("");
    }
  }

  async function selectProduct(product: ProductSummary) {
    if (kind === "product") {
      commit(product.id, productLabel(product));
      return;
    }

    setLoading(true);
    setError("");
    try {
      setSelectedProduct(await cachedSessionJsonRequest<ProductDetail>(
        "coupon-products",
        `/api/backend/admin/products/${product.id}`,
        PRODUCT_DETAIL_CACHE_MS,
        "โหลดตัวเลือกสินค้าไม่สำเร็จ",
      ));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "โหลดตัวเลือกสินค้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  function commit(nextValue: string, label: string) {
    onValueChange(nextValue);
    setSelectedLabel(label);
    handleOpenChange(false);
  }

  const pickerLabel = selectedLabel || (value ? "เลือกรายการแล้ว" : placeholderByKind[kind]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-11 w-full min-w-0 justify-between px-3 font-normal",
          !value && "text-muted-foreground",
        )}
        onClick={() => setOpen(true)}
      >
        <span className="min-w-0 truncate">{pickerLabel}</span>
        <PackageSearch className="size-4 text-muted-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[82vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 pb-4 pt-5 pr-14">
            <DialogTitle>{selectedProduct ? productLabel(selectedProduct) : titleByKind[kind]}</DialogTitle>
            <DialogDescription>
              {selectedProduct ? "เลือกตัวเลือกหรือ SKU ที่ต้องการใช้กับคูปอง" : "ค้นหาด้วยชื่อสินค้า หรือ SKU"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 px-5 pb-5">
            {selectedProduct ? (
              <VariantList
                kind={kind}
                product={selectedProduct}
                value={value}
                onBack={() => {
                  setSelectedProduct(null);
                  setError("");
                }}
                onSelect={commit}
              />
            ) : (
              <>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาสินค้า"
                    className="h-11 pl-9"
                    autoFocus
                  />
                </div>
                <PickerState loading={loading} error={error} empty={products.length === 0} />
                {!loading && !error ? (
                  <div className="max-h-[54vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                    {products.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ProductImage src={product.imageUrl} name={product.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{product.name || "ไม่ระบุชื่อสินค้า"}</span>
                          <span className="block truncate text-xs text-muted-foreground">{product.baseSku || "ไม่มี SKU"}</span>
                        </span>
                        {kind === "product" && value === product.id ? <Check className="size-4 text-primary" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VariantList({
  kind,
  product,
  value,
  onBack,
  onSelect,
}: {
  kind: CouponProductScopeKind;
  product: ProductDetail;
  value: string;
  onBack: () => void;
  onSelect: (value: string, label: string) => void;
}) {
  const variants = product.variants ?? [];
  const skuRows = [
    ...(product.baseSku ? [{ value: product.baseSku, label: `${product.name || "สินค้า"} · ${product.baseSku}`, detail: "SKU หลัก" }] : []),
    ...variants
      .filter((variant) => variant.sku)
      .map((variant) => ({ value: variant.sku!, label: variantLabel(product, variant), detail: optionsLabel(variant) })),
  ].filter((row, index, rows) => rows.findIndex((candidate) => candidate.value === row.value) === index);

  return (
    <div className="space-y-3">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft />
        กลับไปเลือกสินค้า
      </Button>
      <div className="max-h-[54vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {kind === "sku"
          ? skuRows.map((row) => (
              <PickerRow key={row.value} label={row.label} detail={row.detail} selected={value === row.value} onClick={() => onSelect(row.value, row.label)} />
            ))
          : variants.map((variant) => (
              <PickerRow
                key={variant.id}
                label={variantLabel(product, variant)}
                detail={optionsLabel(variant)}
                selected={value === variant.id}
                onClick={() => onSelect(variant.id, variantLabel(product, variant))}
              />
            ))}
        {(kind === "sku" ? skuRows.length : variants.length) === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">สินค้านี้ไม่มีรายการให้เลือก</p>
        ) : null}
      </div>
    </div>
  );
}

function PickerRow({ label, detail, selected, onClick }: { label: string; detail: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      {selected ? <Check className="size-4 text-primary" /> : null}
    </button>
  );
}

function PickerState({ loading, error, empty }: { loading: boolean; error: string; empty: boolean }) {
  if (loading) return <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />กำลังโหลดสินค้า</div>;
  if (error) return <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">{error}</p>;
  if (empty) return <p className="py-12 text-center text-sm text-muted-foreground">ไม่พบสินค้าที่ค้นหา</p>;
  return null;
}

function ProductImage({ src, name }: { src?: string | null; name?: string | null }) {
  return src ? (
    <span
      aria-hidden="true"
      className="size-11 shrink-0 rounded-md border border-border bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
    />
  ) : (
    <span className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-muted">
      <PackageSearch className="size-5 text-muted-foreground" />
      <span className="sr-only">{name}</span>
    </span>
  );
}

function productLabel(product: ProductSummary) {
  return [product.name || "ไม่ระบุชื่อสินค้า", product.baseSku].filter(Boolean).join(" · ");
}

function variantLabel(product: ProductSummary, variant: ProductVariant) {
  return [product.name || "สินค้า", variant.sku || variant.variantCode].filter(Boolean).join(" · ");
}

function optionsLabel(variant: ProductVariant) {
  const options = (variant.options ?? []).map((option) => option.value?.trim()).filter(Boolean);
  return options.length ? options.join(" / ") : variant.variantCode || "ตัวเลือกสินค้า";
}

const titleByKind: Record<CouponProductScopeKind, string> = {
  product: "เลือกสินค้า",
  variant: "เลือกตัวเลือกสินค้า",
  sku: "เลือก SKU",
};

const placeholderByKind: Record<CouponProductScopeKind, string> = {
  product: "เลือกสินค้า",
  variant: "เลือกตัวเลือกสินค้า",
  sku: "เลือก SKU",
};
