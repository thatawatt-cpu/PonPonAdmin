"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CouponCampaign } from "@/lib/admin-coupon-campaigns";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function PromotionFilterBar({
  campaigns,
}: {
  campaigns: CouponCampaign[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";

  function pushParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.push(query ? `/promotions?${query}` : "/promotions");
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <NativeSelect
        value={campaignId}
        className="w-full"
        aria-label="กรองตาม Campaign"
        onChange={(event) => pushParam("campaignId", event.target.value)}
      >
        <NativeSelectOption value="">ทุก Campaign</NativeSelectOption>
        {campaigns.map((campaign) => (
          <NativeSelectOption key={campaign.id} value={campaign.id}>
            {campaign.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        value={status}
        className="w-full"
        aria-label="กรองตามสถานะ"
        onChange={(event) => pushParam("status", event.target.value)}
      >
        <NativeSelectOption value="">ทุกสถานะ</NativeSelectOption>
        <NativeSelectOption value="active">เปิดใช้งาน</NativeSelectOption>
        <NativeSelectOption value="inactive">ปิดใช้งาน</NativeSelectOption>
      </NativeSelect>
      <NativeSelect
        value={type}
        className="w-full"
        aria-label="กรองตามประเภท Promotion"
        onChange={(event) => pushParam("type", event.target.value)}
      >
        <NativeSelectOption value="">ทุกประเภท</NativeSelectOption>
        <NativeSelectOption value="auto_discount">ส่วนลดอัตโนมัติ</NativeSelectOption>
        <NativeSelectOption value="free_shipping">ส่งฟรี</NativeSelectOption>
        <NativeSelectOption value="special_price">ราคาพิเศษ</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}
