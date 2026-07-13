"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Layers3,
  LoaderCircle,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import type { CouponCampaign } from "@/lib/admin-coupon-campaigns";
import type {
  CouponBulkGenerateJob,
  CouponCustomerScope,
  CouponScope,
  CouponType,
} from "@/lib/admin-coupons";
import type { AdminCategory } from "@/lib/admin-products";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CategoryOption = Pick<AdminCategory, "id" | "name" | "zortCategoryId">;
type ScopeKind = "product" | "variant" | "sku" | "category";
type ScopeDraft = { id: string; kind: ScopeKind; value: string };
type CustomerScopeKind = "new_customer" | "first_order" | "existing_customer" | "customer";
type CustomerScopeDraft = { id: string; kind: CustomerScopeKind; customerId: string };
const scopeOptions: { value: ScopeKind; label: string; placeholder: string }[] = [
  { value: "product", label: "เฉพาะบางสินค้า", placeholder: "รหัสสินค้า" },
  { value: "variant", label: "เฉพาะรุ่นสินค้า", placeholder: "รหัสรุ่นสินค้า" },
  { value: "sku", label: "เฉพาะ SKU", placeholder: "SKU เช่น TEA-RED" },
  { value: "category", label: "เฉพาะหมวดหมู่", placeholder: "เลือกหมวดหมู่" },
];

const customerScopeOptions: { value: CustomerScopeKind; label: string }[] = [
  { value: "new_customer", label: "ลูกค้าใหม่" },
  { value: "first_order", label: "ออเดอร์แรกเท่านั้น" },
  { value: "existing_customer", label: "ลูกค้าเก่า" },
  { value: "customer", label: "เลือกลูกค้ารายคน" },
];

export function CouponBulkGenerateButton({
  campaigns,
  categories,
  initialCampaignId = "",
}: {
  campaigns: CouponCampaign[];
  categories: CategoryOption[];
  initialCampaignId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Layers3 />
        Bulk Generate
      </Button>
      <CouponBulkGenerateDialog
        campaigns={campaigns}
        categories={categories}
        initialCampaignId={initialCampaignId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function CouponBulkGenerateDialog({
  campaigns,
  categories,
  initialCampaignId,
  onOpenChange,
  open,
}: {
  campaigns: CouponCampaign[];
  categories: CategoryOption[];
  initialCampaignId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const router = useRouter();
  const [prefix, setPrefix] = useState("VIP");
  const [couponName, setCouponName] = useState("");
  const [couponDescription, setCouponDescription] = useState("");
  const [count, setCount] = useState("100");
  const [codeLength, setCodeLength] = useState("8");
  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const [type, setType] = useState<CouponType>("fixed");
  const [value, setValue] = useState("100");
  const [minimumSubtotal, setMinimumSubtotal] = useState("0");
  const [maximumDiscount, setMaximumDiscount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [canCombineWithFlashSale, setCanCombineWithFlashSale] = useState(true);
  const [canStackWithPromotions, setCanStackWithPromotions] = useState(true);
  const [canStackWithCoupons, setCanStackWithCoupons] = useState(true);
  const [maximumTotalUses, setMaximumTotalUses] = useState("1");
  const [maximumUsesPerCustomer, setMaximumUsesPerCustomer] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [scopeMode, setScopeMode] = useState<"all" | "scoped">("all");
  const [scopeDrafts, setScopeDrafts] = useState<ScopeDraft[]>([
    { id: "bulk-scope-0", kind: "product", value: "" },
  ]);
  const [customerScopeMode, setCustomerScopeMode] = useState<"all" | "scoped">("all");
  const [customerScopeDrafts, setCustomerScopeDrafts] = useState<CustomerScopeDraft[]>([
    { id: "bulk-customer-scope-0", kind: "existing_customer", customerId: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [job, setJob] = useState<CouponBulkGenerateJob | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const codesLoading =
    job?.status === "completed" && codes.length === 0 && !error;

  useEffect(() => {
    if (
      !open ||
      !job?.jobId ||
      (job.status !== "pending" && job.status !== "running")
    ) {
      return;
    }

    let cancelled = false;
    let polling = false;
    const interval = window.setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const response = await fetch(
          `/api/backend/admin/coupons/bulk-generate-jobs/${job.jobId}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, "โหลดสถานะงานไม่สำเร็จ"));
        }
        const nextJob = normalizeJobResponse(
          (await response.json()) as Record<string, unknown>,
        );
        if (!cancelled) setJob(nextJob);
      } catch (pollError) {
        if (!cancelled) {
          setError(
            pollError instanceof Error
              ? pollError.message
              : "โหลดสถานะงานไม่สำเร็จ",
          );
        }
      } finally {
        polling = false;
      }
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [job?.jobId, job?.status, open]);

  useEffect(() => {
    if (!open || job?.status !== "completed" || !job.jobId || codes.length > 0) {
      return;
    }

    let cancelled = false;
    void fetch(`/api/backend/admin/coupons/bulk-generate-jobs/${job.jobId}/codes`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, "โหลดรายการโค้ดไม่สำเร็จ"));
        }
        return normalizeCodesResponse(await response.json());
      })
      .then((nextCodes) => {
        if (!cancelled) {
          setCodes(nextCodes);
          router.refresh();
        }
      })
      .catch((codesError) => {
        if (!cancelled) {
          setError(
            codesError instanceof Error
              ? codesError.message
              : "โหลดรายการโค้ดไม่สำเร็จ",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [codes.length, job?.jobId, job?.status, open, router]);

  const validationMessage = useMemo(() => {
    const parsedCount = Number(count);
    const parsedCodeLength = Number(codeLength);
    const parsedValue = Number(value);
    const parsedMinimumSubtotal = Number(minimumSubtotal || 0);
    const parsedMaximumDiscount = maximumDiscount.trim() ? Number(maximumDiscount) : null;
    const parsedMaximumTotalUses = maximumTotalUses.trim() ? Number(maximumTotalUses) : null;
    const parsedMaximumUsesPerCustomer = maximumUsesPerCustomer.trim()
      ? Number(maximumUsesPerCustomer)
      : null;

    if (!prefix.trim()) return "กรอก Prefix ก่อนสร้างโค้ด";
    if (couponName.trim().length > 256) return "ชื่อคูปองต้องไม่เกิน 256 ตัวอักษร";
    if (couponDescription.trim().length > 2000) {
      return "รายละเอียดคูปองต้องไม่เกิน 2,000 ตัวอักษร";
    }
    if (prefix.trim().length > 32) return "Prefix ต้องไม่เกิน 32 ตัวอักษร";
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 20000) {
      return "จำนวนโค้ดต้องอยู่ระหว่าง 1 ถึง 20,000";
    }
    if (!Number.isInteger(parsedCodeLength) || parsedCodeLength < 4 || parsedCodeLength > 32) {
      return "ความยาวโค้ดต้องอยู่ระหว่าง 4 ถึง 32 ตัวอักษร";
    }
    if (
      type !== "free_shipping" &&
      (!Number.isFinite(parsedValue) || parsedValue <= 0)
    ) return "มูลค่าส่วนลดต้องมากกว่า 0";
    if (type === "percentage" && parsedValue > 100) return "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100%";
    if (!Number.isFinite(parsedMinimumSubtotal) || parsedMinimumSubtotal < 0) {
      return "ยอดสั่งซื้อขั้นต่ำต้องเป็น 0 หรือมากกว่า";
    }
    if (
      parsedMaximumDiscount !== null &&
      (!Number.isFinite(parsedMaximumDiscount) || parsedMaximumDiscount <= 0)
    ) {
      return "ส่วนลดสูงสุดต้องมากกว่า 0";
    }
    if (
      parsedMaximumTotalUses !== null &&
      (!Number.isInteger(parsedMaximumTotalUses) || parsedMaximumTotalUses < 1)
    ) {
      return "จำนวนสิทธิ์ต่อโค้ดต้องเป็นจำนวนเต็มมากกว่า 0";
    }
    if (
      parsedMaximumUsesPerCustomer !== null &&
      (!Number.isInteger(parsedMaximumUsesPerCustomer) || parsedMaximumUsesPerCustomer < 1)
    ) {
      return "จำนวนใช้สูงสุดต่อลูกค้าต้องเป็นจำนวนเต็มมากกว่า 0";
    }
    if (
      parsedMaximumTotalUses !== null &&
      parsedMaximumUsesPerCustomer !== null &&
      parsedMaximumUsesPerCustomer > parsedMaximumTotalUses
    ) {
      return "จำนวนใช้ต่อลูกค้าต้องไม่เกินจำนวนสิทธิ์ต่อโค้ด";
    }
    if (startDate && endDate && endDate < startDate) return "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น";
    if (scopeMode === "scoped" && scopeDrafts.some((draft) => !draft.value.trim())) {
      return "กรอกหรือเลือกข้อมูลสินค้าให้ครบทุกแถว";
    }
    if (
      customerScopeMode === "scoped" &&
      customerScopeDrafts.some((draft) => draft.kind === "customer" && !draft.customerId.trim())
    ) {
      return "กรอกรหัสลูกค้าให้ครบทุกแถว";
    }
    return "";
  }, [
    codeLength,
    count,
    couponDescription,
    couponName,
    customerScopeDrafts,
    customerScopeMode,
    endDate,
    minimumSubtotal,
    maximumDiscount,
    maximumTotalUses,
    maximumUsesPerCustomer,
    prefix,
    scopeDrafts,
    scopeMode,
    startDate,
    type,
    value,
  ]);

  async function submit() {
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/backend/admin/coupons/bulk-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prefix: prefix.trim(),
          count: Number(count),
          codeLength: Number(codeLength),
          campaignId: campaignId || null,
          template: {
            name: couponName.trim() || undefined,
            couponName: couponName.trim() || undefined,
            description: couponDescription.trim() || undefined,
            type,
            value: type === "free_shipping" ? 0 : Number(value),
            minimumSubtotal: Number(minimumSubtotal || 0),
            maximumDiscount:
              (type === "percentage" || type === "free_shipping") && maximumDiscount.trim()
                ? Number(maximumDiscount)
                : null,
            startsAtUtc: toUtcDate(startDate, "start"),
            endsAtUtc: toUtcDate(endDate, "end"),
            canCombineWithFlashSale,
            canStackWithPromotions,
            canStackWithCoupons,
            maximumTotalUses: nullableNumber(maximumTotalUses),
            maximumUsesPerCustomer: nullableNumber(maximumUsesPerCustomer),
            isActive,
            scopes: buildScopes(scopeMode, scopeDrafts),
            customerScopes: buildCustomerScopes(customerScopeMode, customerScopeDrafts),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "สร้างคูปองแบบกลุ่มไม่สำเร็จ"));
      }

      const data = normalizeJobResponse(
        (await response.json()) as Record<string, unknown>,
      );
      setJob(data);
      setCodes([]);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "สร้างคูปองแบบกลุ่มไม่สำเร็จ",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCodes() {
    if (codes.length === 0) return;
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadCsv() {
    if (!job || codes.length === 0) return;
    const rows = ["code", ...codes.map(csvEscape)];
    const blob = new Blob([`\uFEFF${rows.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `coupon-codes-${job.batchId || job.jobId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Layers3 className="size-5" />
            Bulk Generate Coupons
          </DialogTitle>
          <DialogDescription>สร้างโค้ดคูปองจำนวนมากจากเงื่อนไขเดียวกัน</DialogDescription>
        </DialogHeader>

        {job ? (
          <div className="space-y-4">
            <BulkResult
              job={job}
              codes={codes}
              codesLoading={codesLoading}
              copied={copied}
              onCopy={copyCodes}
              onDownload={downloadCsv}
              onReset={() => {
                setJob(null);
                setCodes([]);
                setCopied(false);
                setError("");
              }}
            />
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Coupon Campaign">
                <NativeSelect
                  value={campaignId}
                  className="w-full"
                  onChange={(event) => setCampaignId(event.target.value)}
                >
                  <NativeSelectOption value="">ไม่ระบุ Campaign</NativeSelectOption>
                  {campaigns.map((campaign) => (
                    <NativeSelectOption key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Prefix">
                <Input
                  value={prefix}
                  onValueChange={(nextValue) => setPrefix(nextValue.toUpperCase().slice(0, 32))}
                  placeholder="VIP"
                />
              </Field>
              <Field label="ชื่อคูปอง">
                <Input
                  value={couponName}
                  onValueChange={(nextValue) => setCouponName(nextValue.slice(0, 256))}
                  placeholder="คูปองลูกค้าใหม่"
                />
              </Field>
              <Field label="รายละเอียดคูปอง">
                <Textarea
                  value={couponDescription}
                  onChange={(event) => setCouponDescription(event.target.value.slice(0, 2000))}
                  placeholder="ลด 100 บาท สำหรับลูกค้าใหม่"
                  className="min-h-24"
                />
              </Field>
              <Field label="จำนวนโค้ด">
                <Input type="number" min={1} max={20000} value={count} onValueChange={setCount} />
              </Field>
              <Field label="ความยาวโค้ด">
                <Input
                  type="number"
                  min={4}
                  max={32}
                  value={codeLength}
                  onValueChange={setCodeLength}
                />
              </Field>
            </section>

            <section className="space-y-4 rounded-xl border border-border p-4">
              <div>
                <h3 className="font-bold">เงื่อนไขคูปองต้นแบบ</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  คูปองทุกโค้ดในชุดนี้จะใช้เงื่อนไขเดียวกัน
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="ประเภทส่วนลด">
                  <NativeSelect
                    value={type}
                    onChange={(event) => {
                      const nextType = event.target.value as CouponType;
                      setType(nextType);
                      if (nextType === "free_shipping") setValue("0");
                      if (type === "free_shipping" && nextType !== "free_shipping") setValue("100");
                      if (nextType === "fixed") setMaximumDiscount("");
                    }}
                    className="w-full"
                  >
                    <NativeSelectOption value="fixed">จำนวนเงิน</NativeSelectOption>
                    <NativeSelectOption value="percentage">เปอร์เซ็นต์</NativeSelectOption>
                    <NativeSelectOption value="free_shipping">ส่งฟรี</NativeSelectOption>
                  </NativeSelect>
                </Field>
                {type !== "free_shipping" ? (
                  <Field label={type === "percentage" ? "มูลค่าส่วนลด (%)" : "มูลค่าส่วนลด (บาท)"}>
                    <Input type="number" min={0} value={value} onValueChange={setValue} />
                  </Field>
                ) : null}
                <Field label="ยอดสั่งซื้อขั้นต่ำ (บาท)">
                  <Input
                    type="number"
                    min={0}
                    value={minimumSubtotal}
                    onValueChange={setMinimumSubtotal}
                  />
                </Field>
                {type === "percentage" || type === "free_shipping" ? (
                  <Field label={type === "free_shipping" ? "ส่งฟรีสูงสุด (บาท)" : "ส่วนลดสูงสุด (บาท)"}>
                    <Input
                      type="number"
                      min={0}
                      value={maximumDiscount}
                      onValueChange={setMaximumDiscount}
                      placeholder={type === "free_shipping" ? "ส่งฟรีเต็มจำนวน" : "ไม่จำกัด"}
                    />
                  </Field>
                ) : null}
                <Field label="วันที่เริ่มต้น">
                  <Input type="date" value={startDate} onValueChange={setStartDate} />
                </Field>
                <Field label="วันที่สิ้นสุด">
                  <Input type="date" min={startDate} value={endDate} onValueChange={setEndDate} />
                </Field>
                <Field label="จำนวนสิทธิ์ต่อโค้ด">
                  <Input
                    type="number"
                    min={1}
                    value={maximumTotalUses}
                    onValueChange={setMaximumTotalUses}
                    placeholder="ไม่จำกัด"
                  />
                </Field>
                <Field label="จำนวนใช้สูงสุดต่อลูกค้า">
                  <Input
                    type="number"
                    min={1}
                    value={maximumUsesPerCustomer}
                    onValueChange={setMaximumUsesPerCustomer}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleRow
                  label="ใช้ร่วมกับ Flash Sale ได้"
                  checked={canCombineWithFlashSale}
                  onCheckedChange={setCanCombineWithFlashSale}
                />
                <ToggleRow
                  label="ใช้ร่วมกับโปรโมชันได้"
                  checked={canStackWithPromotions}
                  onCheckedChange={setCanStackWithPromotions}
                />
                <ToggleRow
                  label="ใช้ร่วมกับคูปองอื่นได้"
                  checked={canStackWithCoupons}
                  onCheckedChange={setCanStackWithCoupons}
                />
                <ToggleRow
                  label="เปิดใช้งานทันที"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </section>

            <ScopeEditor
              categories={categories}
              mode={scopeMode}
              drafts={scopeDrafts}
              onModeChange={setScopeMode}
              onDraftsChange={setScopeDrafts}
            />
            <CustomerScopeEditor
              mode={customerScopeMode}
              drafts={customerScopeDrafts}
              onModeChange={setCustomerScopeMode}
              onDraftsChange={setCustomerScopeDrafts}
            />

            {error || validationMessage ? (
              <Alert variant="destructive">
                <AlertDescription>{error || validationMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button disabled={submitting || !!validationMessage} onClick={submit}>
                <Layers3 />
                {submitting ? "กำลังสร้าง..." : `สร้าง ${Number(count || 0).toLocaleString()} โค้ด`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScopeEditor({
  categories,
  drafts,
  mode,
  onDraftsChange,
  onModeChange,
}: {
  categories: CategoryOption[];
  drafts: ScopeDraft[];
  mode: "all" | "scoped";
  onDraftsChange: (drafts: ScopeDraft[]) => void;
  onModeChange: (mode: "all" | "scoped") => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <div>
        <h3 className="font-bold">ใช้ได้กับสินค้า</h3>
        <p className="mt-1 text-xs text-muted-foreground">เลือกให้ใช้กับทั้งตะกร้าหรือเฉพาะสินค้า</p>
      </div>
      <ModeButtons
        firstActive={mode === "all"}
        firstLabel="สินค้าทุกชิ้นในตะกร้า"
        secondLabel="เฉพาะสินค้าที่กำหนด"
        onFirst={() => onModeChange("all")}
        onSecond={() => onModeChange("scoped")}
      />
      {mode === "scoped" ? (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div key={draft.id} className="grid gap-2 sm:grid-cols-[190px_minmax(0,1fr)_auto]">
              <NativeSelect
                value={draft.kind}
                onChange={(event) =>
                  onDraftsChange(
                    drafts.map((item) =>
                      item.id === draft.id
                        ? { ...item, kind: event.target.value as ScopeKind, value: "" }
                        : item,
                    ),
                  )
                }
                className="w-full"
              >
                {scopeOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {draft.kind === "category" ? (
                <NativeSelect
                  value={draft.value}
                  onChange={(event) =>
                    onDraftsChange(
                      drafts.map((item) =>
                        item.id === draft.id ? { ...item, value: event.target.value } : item,
                      ),
                    )
                  }
                  disabled={categories.length === 0}
                  className="w-full"
                >
                  <NativeSelectOption value="">
                    {categories.length ? "เลือกหมวดหมู่" : "ยังไม่มีหมวดหมู่"}
                  </NativeSelectOption>
                  {categories.map((category) => (
                    <NativeSelectOption key={category.id} value={categoryValue(category)}>
                      {category.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  value={draft.value}
                  onValueChange={(nextValue) =>
                    onDraftsChange(
                      drafts.map((item) =>
                        item.id === draft.id ? { ...item, value: nextValue } : item,
                      ),
                    )
                  }
                  placeholder={scopeOptions.find((option) => option.value === draft.kind)?.placeholder}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="ลบเงื่อนไขสินค้า"
                onClick={() => {
                  const next = drafts.filter((item) => item.id !== draft.id);
                  onDraftsChange(next.length ? next : [newScopeDraft()]);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onDraftsChange([...drafts, newScopeDraft()])}>
            <Plus />
            เพิ่มเงื่อนไขสินค้า
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function CustomerScopeEditor({
  drafts,
  mode,
  onDraftsChange,
  onModeChange,
}: {
  drafts: CustomerScopeDraft[];
  mode: "all" | "scoped";
  onDraftsChange: (drafts: CustomerScopeDraft[]) => void;
  onModeChange: (mode: "all" | "scoped") => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <div>
        <h3 className="font-bold">ลูกค้าที่ใช้ได้</h3>
        <p className="mt-1 text-xs text-muted-foreground">เลือกให้ลูกค้าทุกคนใช้ได้ หรือจำกัดเฉพาะบางกลุ่ม</p>
      </div>
      <ModeButtons
        firstActive={mode === "all"}
        firstLabel="ลูกค้าทุกคน"
        secondLabel="เฉพาะลูกค้าที่กำหนด"
        onFirst={() => onModeChange("all")}
        onSecond={() => onModeChange("scoped")}
      />
      {mode === "scoped" ? (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div key={draft.id} className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
              <NativeSelect
                value={draft.kind}
                onChange={(event) =>
                  onDraftsChange(
                    drafts.map((item) =>
                      item.id === draft.id
                        ? {
                            ...item,
                            kind: event.target.value as CustomerScopeKind,
                            customerId: "",
                          }
                        : item,
                    ),
                  )
                }
                className="w-full"
              >
                {customerScopeOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {draft.kind === "customer" ? (
                <Input
                  value={draft.customerId}
                  onValueChange={(customerId) =>
                    onDraftsChange(
                      drafts.map((item) => (item.id === draft.id ? { ...item, customerId } : item)),
                    )
                  }
                  placeholder="รหัสลูกค้า"
                />
              ) : (
                <div className="flex min-h-9 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                  {customerScopeOptions.find((option) => option.value === draft.kind)?.label}
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="ลบกลุ่มลูกค้า"
                onClick={() => {
                  const next = drafts.filter((item) => item.id !== draft.id);
                  onDraftsChange(next.length ? next : [newCustomerScopeDraft()]);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDraftsChange([...drafts, newCustomerScopeDraft()])}
          >
            <Plus />
            เพิ่มกลุ่มลูกค้า
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function BulkResult({
  codes,
  codesLoading,
  copied,
  job,
  onCopy,
  onDownload,
  onReset,
}: {
  codes: string[];
  codesLoading: boolean;
  copied: boolean;
  job: CouponBulkGenerateJob;
  onCopy: () => void;
  onDownload: () => void;
  onReset: () => void;
}) {
  const status = jobStatusMeta(job.status);
  const StatusIcon = status.icon;
  const isProcessing = job.status === "pending" || job.status === "running";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", status.iconClassName)}>
          <StatusIcon className={cn("size-5", isProcessing && "animate-spin")} />
        </span>
        <div className="min-w-0">
          <p className="font-black">{status.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{status.description}</p>
          {isProcessing ? (
            <p className="mt-2 text-xs text-muted-foreground">
              ระบบตรวจสอบสถานะให้อัตโนมัติทุก 4 วินาที สามารถปิดหน้าต่างนี้ได้
            </p>
          ) : null}
          {job.status === "failed" && job.error ? (
            <p className="mt-2 text-sm font-medium text-destructive">{job.error}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">จำนวนที่ขอสร้าง</p>
          <p className="mt-1 text-2xl font-black">
            {job.requestedCount.toLocaleString()} โค้ด
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Batch ID</p>
          <p className="mt-1 break-all font-mono text-sm font-bold">
            {job.batchId || "-"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Job ID</p>
          <p className="mt-1 break-all font-mono text-sm font-bold">{job.jobId}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onReset}>
          <Plus />
          สร้างชุดใหม่
        </Button>
        {job.status === "completed" ? (
          <>
            <Button variant="outline" disabled={codesLoading || codes.length === 0} onClick={onCopy}>
              {codesLoading ? <LoaderCircle className="animate-spin" /> : <Copy />}
              {copied ? "คัดลอกแล้ว" : "Copy codes"}
            </Button>
            <Button
              variant="outline"
              disabled={codesLoading || codes.length === 0}
              onClick={onDownload}
            >
              {codesLoading ? <LoaderCircle className="animate-spin" /> : <Download />}
              Download CSV
            </Button>
          </>
        ) : null}
      </div>

      {job.status === "completed" ? (
        codesLoading ? (
          <div className="flex min-h-32 items-center justify-center gap-2 rounded-xl border border-border text-sm text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin text-[#ef101a]" />
            กำลังโหลดรายการโค้ด...
          </div>
        ) : (
          <div className="max-h-[48vh] overflow-y-auto rounded-xl border border-border">
            <div className="sticky top-0 grid grid-cols-[70px_minmax(0,1fr)] border-b border-border bg-muted px-4 py-2 text-xs font-bold">
              <span>ลำดับ</span>
              <span>Code</span>
            </div>
            {codes.slice(0, 500).map((code, index) => (
              <div
                key={`${code}-${index}`}
                className="grid grid-cols-[70px_minmax(0,1fr)] border-b border-border px-4 py-2 text-sm last:border-b-0"
              >
                <span className="text-muted-foreground">{index + 1}</span>
                <span className="font-mono font-semibold">{code}</span>
              </div>
            ))}
            {codes.length > 500 ? (
              <p className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
                แสดง 500 รายการแรก จากทั้งหมด {codes.length.toLocaleString()} รายการ
                ใช้ Download CSV เพื่อดูทั้งหมด
              </p>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

function normalizeJobResponse(data: Record<string, unknown>): CouponBulkGenerateJob {
  const rawStatus = String(data.status ?? "pending").toLowerCase();
  const status =
    rawStatus === "running" ||
    rawStatus === "completed" ||
    rawStatus === "failed"
      ? rawStatus
      : "pending";

  return {
    jobId: String(data.jobId ?? data.id ?? ""),
    batchId: data.batchId ? String(data.batchId) : null,
    backgroundJobId: data.backgroundJobId ? String(data.backgroundJobId) : null,
    status,
    requestedCount: Number(data.requestedCount ?? 0),
    createdCount: Number(
      data.createdCount ?? data.generatedCount ?? data.completedCount ?? 0,
    ),
    error: data.error
      ? String(data.error)
      : data.errorMessage
        ? String(data.errorMessage)
        : null,
    createdAtUtc: data.createdAtUtc ? String(data.createdAtUtc) : null,
    startedAtUtc: data.startedAtUtc ? String(data.startedAtUtc) : null,
    completedAtUtc: data.completedAtUtc ? String(data.completedAtUtc) : null,
  };
}

function normalizeCodesResponse(data: unknown) {
  if (Array.isArray(data)) return data.map(String);
  if (data && typeof data === "object" && "codes" in data) {
    const codes = (data as { codes?: unknown }).codes;
    return Array.isArray(codes) ? codes.map(String) : [];
  }
  return [];
}

function jobStatusMeta(status: CouponBulkGenerateJob["status"]) {
  if (status === "running") {
    return {
      label: "กำลังสร้างคูปอง",
      description: "ระบบกำลังสร้างและบันทึกคูปองในเบื้องหลัง",
      icon: LoaderCircle,
      iconClassName: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    };
  }
  if (status === "completed") {
    return {
      label: "สร้างคูปองสำเร็จ",
      description: "ดาวน์โหลดหรือคัดลอกรหัสคูปองได้แล้ว",
      icon: CheckCircle2,
      iconClassName:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    };
  }
  if (status === "failed") {
    return {
      label: "สร้างคูปองไม่สำเร็จ",
      description: "งานหยุดทำงาน กรุณาตรวจสอบข้อความผิดพลาด",
      icon: XCircle,
      iconClassName: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    };
  }
  return {
    label: "รอเริ่มงาน",
    description: "ระบบรับคำขอแล้วและกำลังรอประมวลผล",
    icon: Clock3,
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-bold">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
      <span className="text-sm font-semibold">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ModeButtons({
  firstActive,
  firstLabel,
  onFirst,
  onSecond,
  secondLabel,
}: {
  firstActive: boolean;
  firstLabel: string;
  onFirst: () => void;
  onSecond: () => void;
  secondLabel: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={onFirst}
        className={cn(
          "rounded-xl border px-4 py-3 text-left text-sm font-bold",
          firstActive ? "border-foreground bg-foreground text-background" : "border-border",
        )}
      >
        {firstLabel}
      </button>
      <button
        type="button"
        onClick={onSecond}
        className={cn(
          "rounded-xl border px-4 py-3 text-left text-sm font-bold",
          !firstActive ? "border-foreground bg-foreground text-background" : "border-border",
        )}
      >
        {secondLabel}
      </button>
    </div>
  );
}

function buildScopes(mode: "all" | "scoped", drafts: ScopeDraft[]): CouponScope[] {
  if (mode === "all") return [];

  return drafts.reduce<CouponScope[]>((scopes, draft) => {
    const value = draft.value.trim();
    if (!value) return scopes;
    if (draft.kind === "product") scopes.push({ type: "product", productId: value });
    if (draft.kind === "variant") scopes.push({ type: "variant", variantId: value });
    if (draft.kind === "sku") scopes.push({ type: "sku", sku: value });
    if (draft.kind === "category" && value.startsWith("zort:")) {
      scopes.push({ type: "category", zortCategoryId: Number(value.slice(5)) });
    }
    if (draft.kind === "category" && value.startsWith("name:")) {
      scopes.push({ type: "category", categoryName: value.slice(5) });
    }
    return scopes;
  }, []);
}

function buildCustomerScopes(
  mode: "all" | "scoped",
  drafts: CustomerScopeDraft[],
): CouponCustomerScope[] {
  if (mode === "all") return [];
  return drafts.map((draft) =>
    draft.kind === "customer"
      ? { type: "customer", customerId: draft.customerId.trim() }
      : { type: draft.kind },
  );
}

function categoryValue(category: CategoryOption) {
  const zortCategoryId = String(category.zortCategoryId ?? "").trim();
  return zortCategoryId ? `zort:${zortCategoryId}` : `name:${category.name}`;
}

function newScopeDraft(): ScopeDraft {
  return {
    id: `bulk-scope-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "product",
    value: "",
  };
}

function newCustomerScopeDraft(): CustomerScopeDraft {
  return {
    id: `bulk-customer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "existing_customer",
    customerId: "",
  };
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toUtcDate(value: string, edge: "start" | "end") {
  if (!value) return null;
  return new Date(`${value}T${edge === "start" ? "00:00:00" : "23:59:59"}`).toISOString();
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}
