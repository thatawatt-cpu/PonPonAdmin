"use client";

import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReviewFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const productId = searchParams.get("productId") ?? "";
  const userId = searchParams.get("userId") ?? "";
  const hasFilters = Array.from(searchParams.keys()).some((key) => key !== "page");

  function pushParams(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    router.push(`/reviews?${params.toString()}`);
  }

  function pushDebounced(overrides: Record<string, string | null>) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams(overrides), 350);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          Filters
        </div>
        {hasFilters ? (
          <Link
            href="/reviews"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <X />
            ล้าง filter
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_160px_140px_170px_120px]">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Product ID</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={`product-${productId}`}
              className="pl-9"
              defaultValue={productId}
              placeholder="ค้นหาด้วย product"
              onChange={(event) => {
                pushDebounced({ productId: event.target.value });
              }}
            />
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">User ID</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={`user-${userId}`}
              className="pl-9"
              defaultValue={userId}
              placeholder="ค้นหาด้วย user"
              onChange={(event) => {
                pushDebounced({ userId: event.target.value });
              }}
            />
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Status</span>
          <Select
            key={searchParams.get("status") ?? "all"}
            defaultValue={searchParams.get("status") ?? "all"}
            onValueChange={(value) => pushParams({ status: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="ทุกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Rating</span>
          <Select
            key={searchParams.get("rating") ?? "all"}
            defaultValue={searchParams.get("rating") ?? "all"}
            onValueChange={(value) => pushParams({ rating: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="ทุกดาว" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกดาว</SelectItem>
              {[5, 4, 3, 2, 1].map((rating) => (
                <SelectItem key={rating} value={String(rating)}>
                  {rating} ดาว
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Deleted</span>
          <Select
            key={searchParams.get("includeDeleted") ?? "false"}
            defaultValue={searchParams.get("includeDeleted") ?? "false"}
            onValueChange={(value) => pushParams({ includeDeleted: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Deleted" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">ไม่รวม deleted</SelectItem>
              <SelectItem value="true">รวม deleted</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Page size</span>
          <Select
            key={searchParams.get("pageSize") ?? "20"}
            defaultValue={searchParams.get("pageSize") ?? "20"}
            onValueChange={(value) => pushParams({ pageSize: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="20" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="flex justify-end lg:hidden">
        <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
