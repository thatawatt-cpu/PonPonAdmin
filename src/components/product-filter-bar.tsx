"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProductFilterBar({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

  // Sync input when URL changes externally (pagination, browser back/forward)
  useEffect(() => {
    setSearchValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function pushParams(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(overrides)) {
      if (val === null || val === "" || val === "all") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  function handleSearch(value: string) {
    setSearchValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: value }), 350);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        placeholder="ค้นหาชื่อสินค้า หรือ SKU"
        className="flex-1"
        value={searchValue}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <Select
        key={searchParams.get("category") ?? "all"}
        defaultValue={searchParams.get("category") ?? undefined}
        onValueChange={(value) => pushParams({ category: value as string })}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="ทุกหมวดหมู่" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทุกหมวดหมู่</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.name}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
