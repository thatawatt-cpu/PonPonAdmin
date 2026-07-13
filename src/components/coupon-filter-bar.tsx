"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CouponCampaign } from "@/lib/admin-coupon-campaigns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export function CouponFilterBar({
  campaigns,
}: {
  campaigns: CouponCampaign[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const selectedCampaignId = searchParams.get("campaignId") ?? "";
  const selectedStatus = searchParams.get("status") ?? "";
  const selectedType = searchParams.get("type") ?? "";
  const selectedCampaignName =
    campaigns.find((campaign) => campaign.id === selectedCampaignId)?.name ??
    "ทุก Campaign";

  useEffect(() => {
    if (isSearchFocused) return;
    setSearchValue(searchParams.get("q") ?? "");
  }, [isSearchFocused, searchParams]);

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current);
    },
    [],
  );

  function pushParams(
    overrides: Record<string, string | null>,
    mode: "push" | "replace" = "push",
  ) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    params.delete("page");
    const query = params.toString();
    const href = query ? `/coupons?${query}` : "/coupons";
    if (mode === "replace") {
      router.replace(href);
    } else {
      router.push(href);
    }
  }

  function handleSearch(value: string) {
    setSearchValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => pushParams({ q: value.trim() }, "replace"),
      350,
    );
  }

  function flushSearch() {
    setIsSearchFocused(false);
    clearTimeout(debounceRef.current);
    pushParams({ q: searchValue.trim() }, "replace");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        value={searchValue}
        className="flex-1"
        placeholder="ค้นหาชื่อคูปอง หรือโค้ดคูปอง"
        aria-label="ค้นหาคูปอง"
        onFocus={() => setIsSearchFocused(true)}
        onBlur={flushSearch}
        onChange={(event) => handleSearch(event.target.value)}
      />

      <Select
        key={`campaign-${selectedCampaignId || "all"}`}
        defaultValue={selectedCampaignId || undefined}
        onValueChange={(value) => pushParams({ campaignId: value as string })}
      >
        <SelectTrigger className="w-full sm:w-52" aria-label="กรองตาม Campaign">
          <span className="flex-1 truncate text-left">{selectedCampaignName}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทุก Campaign</SelectItem>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              {campaign.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        key={`status-${selectedStatus || "all"}`}
        defaultValue={selectedStatus || undefined}
        onValueChange={(value) => pushParams({ status: value as string })}
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="กรองตามสถานะ">
          <span className="flex-1 truncate text-left">{statusLabel(selectedStatus)}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทุกสถานะ</SelectItem>
          <SelectItem value="active">เปิดใช้งาน</SelectItem>
          <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
        </SelectContent>
      </Select>

      <Select
        key={`type-${selectedType || "all"}`}
        defaultValue={selectedType || undefined}
        onValueChange={(value) => pushParams({ type: value as string })}
      >
        <SelectTrigger className="w-full sm:w-48" aria-label="กรองตามประเภทส่วนลด">
          <span className="flex-1 truncate text-left">{typeLabel(selectedType)}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">ทุกประเภทส่วนลด</SelectItem>
          <SelectItem value="fixed">ส่วนลดจำนวนเงิน</SelectItem>
          <SelectItem value="percentage">ส่วนลดเปอร์เซ็นต์</SelectItem>
          <SelectItem value="free_shipping">ส่งฟรี</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function statusLabel(value: string) {
  if (value === "active") return "เปิดใช้งาน";
  if (value === "inactive") return "ปิดใช้งาน";
  return "ทุกสถานะ";
}

function typeLabel(value: string) {
  if (value === "fixed") return "ส่วนลดจำนวนเงิน";
  if (value === "percentage") return "ส่วนลดเปอร์เซ็นต์";
  if (value === "free_shipping") return "ส่งฟรี";
  return "ทุกประเภทส่วนลด";
}
