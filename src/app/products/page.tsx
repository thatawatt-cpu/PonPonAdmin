import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  getAdminCategories,
  getAdminProducts,
  type AdminProduct,
} from "@/lib/admin-products";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductFilterBar } from "@/components/product-filter-bar";
import { ProductGroupCard, type ProductGroup } from "@/components/product-group-card";
import { PermissionGate } from "@/components/admin-permissions";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;


export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { page: pageParam, q, category } = await searchParams;
  const currentPage = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);
  const searchQuery = typeof q === "string" ? q.trim().toLowerCase() : "";
  const categoryFilter = typeof category === "string" ? category : "";

  const [productResult, { categories }] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
  ]);
  const { authRequired, error, products, source } = productResult;

  if (authRequired) {
    redirect("/login");
  }

  let allGroups = groupProductsBySku(products);
  if (searchQuery) {
    allGroups = allGroups.filter((group) =>
      group.products.some(
        (p) =>
          p.name.toLowerCase().includes(searchQuery) ||
          p.zortSku.toLowerCase().includes(searchQuery) ||
          group.groupSku.toLowerCase().includes(searchQuery),
      ),
    );
  }

  if (categoryFilter && categoryFilter !== "all") {
    allGroups = allGroups.filter((group) =>
      group.products.some((p) => p.category === categoryFilter),
    );
  }

  const totalPages = Math.max(1, Math.ceil(allGroups.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const productGroups = allGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="แค็ตตาล็อก"
        title="จัดการสินค้า"
        description="แก้ไขข้อมูลสินค้า ราคา รูปภาพ ตัวเลือก และสต็อกที่แสดงในหน้าร้าน"
        action={(
          <PermissionGate permission="products.manage">
            <button className={buttonVariants()}>+ เพิ่มสินค้า</button>
          </PermissionGate>
        )}
      />

      <Card>
        <CardContent className="pt-4">
          <ProductFilterBar categories={categories} />
        </CardContent>
      </Card>

      {source === "mock" ? (
        <Alert>
          <AlertDescription>
            ใช้ข้อมูล mock อยู่ เพราะเรียก PonPon API ไม่สำเร็จ
            {error ? ` (${error})` : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {productGroups.map((group) => (
          <ProductGroupCard key={group.groupSku} group={group} />
        ))}
      </section>

      {totalPages > 1 ? (
        <Pagination current={page} total={totalPages} query={{ q: searchQuery, category: categoryFilter }} />
      ) : null}
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
  query: { q: string; category: string };
}) {
  const pages = buildPageList(current, total);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.category && query.category !== "all") params.set("category", query.category);
    params.set("page", String(p));
    return `/products?${params.toString()}`;
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <PaginationLink href={pageHref(current - 1)} disabled={current <= 1} aria-label="หน้าก่อน">
        <ChevronLeft className="size-4" />
      </PaginationLink>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="flex size-9 items-center justify-center text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <PaginationLink
            key={p}
            href={pageHref(p)}
            isActive={p === current}
            aria-label={`หน้า ${p}`}
            aria-current={p === current ? "page" : undefined}
          >
            {p}
          </PaginationLink>
        )
      )}

      <PaginationLink href={pageHref(current + 1)} disabled={current >= total} aria-label="หน้าถัดไป">
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
  const base = "flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors";
  const active = "bg-primary text-primary-foreground";
  const idle = "border border-border hover:bg-accent hover:text-accent-foreground";
  const disabledCls = "pointer-events-none opacity-40 border border-border";

  if (disabled) {
    return (
      <span className={cn(base, disabledCls)} {...(props as React.HTMLAttributes<HTMLSpanElement>)}>
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
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}

function groupProductsBySku(products: AdminProduct[]): ProductGroup[] {
  const groups = new Map<string, AdminProduct[]>();

  for (const product of products) {
    const groupSku = product.baseSku || product.id;
    const group = groups.get(groupSku) ?? [];
    group.push(product);
    groups.set(groupSku, group);
  }

  return Array.from(groups, ([groupSku, groupedProducts]) => ({
    groupSku,
    products: groupedProducts.sort((a, b) => a.zortSku.localeCompare(b.zortSku)),
  }));
}
