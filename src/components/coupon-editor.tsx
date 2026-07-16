"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Power,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Tags,
  Ticket,
  Trash2,
  UserCheck,
} from "lucide-react";
import type {
  CouponCondition,
  CouponCustomerScope,
  CouponScope,
  CouponType,
} from "@/lib/admin-coupons";
import type { CouponCampaign } from "@/lib/admin-coupon-campaigns";
import type { AdminCategory } from "@/lib/admin-products";
import { Button, buttonVariants } from "@/components/ui/button";
import { CouponCustomerPicker } from "@/components/coupon-customer-picker";
import { CouponScopeValuePicker } from "@/components/coupon-scope-value-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StickyActionHeader } from "@/components/sticky-action-header";
import {
  DateShortcutSelector,
  type DateShortcut,
} from "@/components/date-shortcut-selector";
import { cn } from "@/lib/utils";

export type CouponInitialData = {
  id?: string;
  code: string;
  name: string;
  description: string;
  type: CouponType;
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  combinableWithFlashSale: boolean;
  canStackWithPromotions: boolean;
  canStackWithCoupons: boolean;
  maxTotalUsage: number | null;
  maxUsagePerCustomer: number | null;
  isActive: boolean;
  campaignId?: string | null;
  scopes?: CouponScope[];
  customerScopes?: CouponCustomerScope[];
  conditions?: CouponCondition[];
};

type CouponCategoryOption = Pick<AdminCategory, "id" | "name" | "zortCategoryId">;
type CouponCampaignOption = Pick<CouponCampaign, "id" | "name" | "status">;

const COUPON_CODE_PATTERN = /^[A-Z0-9_-]+$/;
const SCOPE_KIND_OPTIONS = [
  { value: "product", label: "เฉพาะบางสินค้า", placeholder: "รหัสสินค้า เช่น prod_123" },
  { value: "variant", label: "เฉพาะรุ่นสินค้า", placeholder: "รหัสรุ่นสินค้า เช่น var_123" },
  { value: "sku", label: "เฉพาะ SKU", placeholder: "SKU เช่น TEA-RED" },
  { value: "category", label: "เฉพาะหมวดหมู่", placeholder: "เลือกหมวดหมู่" },
] as const;

type ScopeMode = "entire" | "scoped";
type ScopeDraftKind = (typeof SCOPE_KIND_OPTIONS)[number]["value"];
type ScopeDraft = {
  id: string;
  kind: ScopeDraftKind;
  value: string;
};

const CUSTOMER_SCOPE_KIND_OPTIONS = [
  { value: "new_customer", label: "ลูกค้าใหม่", description: "ลูกค้าที่ยังไม่เคยซื้อสำเร็จ" },
  { value: "first_order", label: "ออเดอร์แรกเท่านั้น", description: "ใช้ได้กับการสั่งซื้อครั้งแรก" },
  { value: "existing_customer", label: "ลูกค้าเก่า", description: "ลูกค้าที่เคยซื้อสำเร็จแล้ว" },
  { value: "customer", label: "เลือกลูกค้ารายคน", description: "ระบุรหัสลูกค้าที่ต้องการให้ใช้คูปอง" },
] as const;

type CustomerScopeMode = "all" | "scoped";
type CustomerScopeDraftKind = (typeof CUSTOMER_SCOPE_KIND_OPTIONS)[number]["value"];
type CustomerScopeDraft = {
  id: string;
  kind: CustomerScopeDraftKind;
  customerId: string;
};

function toInputValue(value: number | null) {
  return value === null ? "" : String(value);
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toUtcIsoDate(date: string, time: "start" | "end") {
  if (!date) return null;
  return new Date(`${date}T${time === "start" ? "00:00:00" : "23:59:59"}`).toISOString();
}

function scopesToDrafts(scopes: CouponScope[] = []): ScopeDraft[] {
  return scopes
    .map((scope, index): ScopeDraft | null => {
      if (scope.type === "product") {
        return { id: `scope-${index}`, kind: "product", value: scope.productId };
      }
      if (scope.type === "variant") {
        return { id: `scope-${index}`, kind: "variant", value: scope.variantId };
      }
      if (scope.type === "sku") {
        return { id: `scope-${index}`, kind: "sku", value: scope.sku };
      }
      if ("zortCategoryId" in scope) {
        return { id: `scope-${index}`, kind: "category", value: `zort:${scope.zortCategoryId}` };
      }
      return { id: `scope-${index}`, kind: "category", value: `name:${scope.categoryName}` };
    })
    .filter((scope): scope is ScopeDraft => scope !== null);
}

function createScopeDraft(kind: ScopeDraftKind = "product"): ScopeDraft {
  return {
    id: `scope-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    value: "",
  };
}

function buildScopes(scopeMode: ScopeMode, scopeDrafts: ScopeDraft[]) {
  if (scopeMode === "entire") return [];

  return scopeDrafts.reduce<CouponScope[]>((scopes, draft) => {
    const value = draft.value.trim();
    if (!value) return scopes;

    if (draft.kind === "product") {
      scopes.push({ type: "product", productId: value });
    } else if (draft.kind === "variant") {
      scopes.push({ type: "variant", variantId: value });
    } else if (draft.kind === "sku") {
      scopes.push({ type: "sku", sku: value });
    } else if (draft.kind === "category") {
      if (value.startsWith("zort:")) {
        const zortCategoryId = Number(value.replace("zort:", ""));
        if (Number.isInteger(zortCategoryId) && zortCategoryId > 0) {
          scopes.push({ type: "category", zortCategoryId });
        }
      } else if (value.startsWith("name:")) {
        const categoryName = value.replace("name:", "").trim();
        if (categoryName) scopes.push({ type: "category", categoryName });
      }
    }

    return scopes;
  }, []);
}

function getCategoryOptionValue(category: CouponCategoryOption) {
  const zortCategoryId = String(category.zortCategoryId ?? "").trim();
  return zortCategoryId ? `zort:${zortCategoryId}` : `name:${category.name}`;
}

function customerScopesToDrafts(customerScopes: CouponCustomerScope[] = []): CustomerScopeDraft[] {
  return customerScopes.map((customerScope, index) => ({
    id: `customer-scope-${index}`,
    kind: customerScope.type,
    customerId: customerScope.type === "customer" ? customerScope.customerId : "",
  }));
}

function createCustomerScopeDraft(kind: CustomerScopeDraftKind = "existing_customer"): CustomerScopeDraft {
  return {
    id: `customer-scope-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    customerId: "",
  };
}

function buildCustomerScopes(
  customerScopeMode: CustomerScopeMode,
  customerScopeDrafts: CustomerScopeDraft[],
) {
  if (customerScopeMode === "all") return [];

  return customerScopeDrafts.reduce<CouponCustomerScope[]>((customerScopes, draft) => {
    if (draft.kind === "customer") {
      const customerId = draft.customerId.trim();
      if (customerId) customerScopes.push({ type: "customer", customerId });
      return customerScopes;
    }

    customerScopes.push({ type: draft.kind });
    return customerScopes;
  }, []);
}

function todayInputValue() {
  return toDateInputValue(new Date());
}

function addDaysInputValue(days: number) {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + days);
  return toDateInputValue(nextDate);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateInputValue(value: string | null | undefined) {
  if (!value) return "";

  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateOnly) return dateOnly;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toDateInputValue(date);
}

export function CouponEditor({
  categories = [],
  campaigns = [],
  initialData,
}: {
  categories?: CouponCategoryOption[];
  campaigns?: CouponCampaignOption[];
  initialData?: CouponInitialData;
}) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [code, setCode] = useState(initialData?.code ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [campaignId, setCampaignId] = useState(initialData?.campaignId ?? "");
  const [type, setType] = useState<CouponType>(initialData?.type ?? "fixed");
  const [discountValue, setDiscountValue] = useState(
    initialData ? String(initialData.discountValue) : "",
  );
  const [minOrderAmount, setMinOrderAmount] = useState(
    toInputValue(initialData?.minOrderAmount ?? null),
  );
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    toInputValue(initialData?.maxDiscountAmount ?? null),
  );
  const [startDate, setStartDate] = useState(
    initialData ? normalizeDateInputValue(initialData.startDate) : todayInputValue(),
  );
  const [endDate, setEndDate] = useState(
    initialData ? normalizeDateInputValue(initialData.endDate) : "",
  );
  const [activeDateShortcut, setActiveDateShortcut] = useState<DateShortcut | null>(null);
  const [combinableWithFlashSale, setCombinableWithFlashSale] = useState(
    initialData?.combinableWithFlashSale ?? false,
  );
  const [canStackWithPromotions, setCanStackWithPromotions] = useState(
    initialData?.canStackWithPromotions ?? true,
  );
  const [canStackWithCoupons, setCanStackWithCoupons] = useState(
    initialData?.canStackWithCoupons ?? true,
  );
  const [maxTotalUsage, setMaxTotalUsage] = useState(
    toInputValue(initialData?.maxTotalUsage ?? null),
  );
  const [maxUsagePerCustomer, setMaxUsagePerCustomer] = useState(
    toInputValue(initialData?.maxUsagePerCustomer ?? 1),
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const initialScopeDrafts = scopesToDrafts(initialData?.scopes);
  const [scopeMode, setScopeMode] = useState<ScopeMode>(
    initialScopeDrafts.length > 0 ? "scoped" : "entire",
  );
  const [scopeDrafts, setScopeDrafts] = useState<ScopeDraft[]>(
    initialScopeDrafts.length > 0 ? initialScopeDrafts : [{ id: "scope-0", kind: "product", value: "" }],
  );
  const initialCustomerScopeDrafts = customerScopesToDrafts(initialData?.customerScopes);
  const [customerScopeMode, setCustomerScopeMode] = useState<CustomerScopeMode>(
    initialCustomerScopeDrafts.length > 0 ? "scoped" : "all",
  );
  const [customerScopeDrafts, setCustomerScopeDrafts] = useState<CustomerScopeDraft[]>(
    initialCustomerScopeDrafts.length > 0
      ? initialCustomerScopeDrafts
      : [{ id: "customer-scope-0", kind: "existing_customer", customerId: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [duplicatedCode, setDuplicatedCode] = useState("");

  const couponScopes = useMemo(() => buildScopes(scopeMode, scopeDrafts), [scopeDrafts, scopeMode]);
  const couponCustomerScopes = useMemo(
    () => buildCustomerScopes(customerScopeMode, customerScopeDrafts),
    [customerScopeDrafts, customerScopeMode],
  );
  const validation = useMemo(() => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const parsedDiscountValue = Number(discountValue);
    const parsedMaxTotalUsage = toNullableNumber(maxTotalUsage);
    const parsedMaxUsagePerCustomer = toNullableNumber(maxUsagePerCustomer);
    const hasEmptyScopeValue =
      scopeMode === "scoped" && scopeDrafts.some((scopeDraft) => !scopeDraft.value.trim());
    const hasEmptyCustomerId =
      customerScopeMode === "scoped" &&
      customerScopeDrafts.some(
        (customerScopeDraft) =>
          customerScopeDraft.kind === "customer" && !customerScopeDraft.customerId.trim(),
      );

    const codeMessage = !trimmedCode
      ? "กรอกโค้ดคูปอง เช่น WELCOME10"
      : !COUPON_CODE_PATTERN.test(trimmedCode)
        ? "ใช้ได้เฉพาะ A-Z, 0-9, ขีดกลาง และขีดล่าง"
        : duplicatedCode === trimmedCode
          ? "โค้ดคูปองนี้ถูกใช้แล้ว กรุณาใช้โค้ดอื่น"
          : "โค้ดนี้สามารถใช้งานได้";

    const discountMessage = type === "free_shipping"
      ? ""
      : !discountValue
      ? "กรอกมูลค่าส่วนลดก่อนบันทึก"
      : !Number.isFinite(parsedDiscountValue) || parsedDiscountValue <= 0
        ? "มูลค่าส่วนลดต้องมากกว่า 0"
        : type === "percentage" && parsedDiscountValue > 100
          ? "ส่วนลดแบบเปอร์เซ็นต์ต้องไม่เกิน 100%"
          : "";
    const nameErrorMessage =
      trimmedName.length > 256 ? "ชื่อคูปองต้องไม่เกิน 256 ตัวอักษร" : "";
    const nameMessage =
      nameErrorMessage || (!trimmedName ? "ถ้าเว้นว่าง ระบบจะใช้โค้ดคูปองเป็นชื่อ" : "");
    const descriptionMessage =
      trimmedDescription.length > 2000
        ? "รายละเอียดคูปองต้องไม่เกิน 2,000 ตัวอักษร"
        : "";

    const dateMessage =
      startDate && endDate && endDate < startDate
        ? "วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น"
        : "";

    const usageMessage =
      parsedMaxTotalUsage !== null &&
      parsedMaxUsagePerCustomer !== null &&
      parsedMaxUsagePerCustomer > parsedMaxTotalUsage
        ? "สิทธิ์ต่อลูกค้าต้องไม่เกินจำนวนสิทธิ์ทั้งหมด"
        : "";
    const scopeMessage =
      scopeMode === "scoped" && couponScopes.length === 0
        ? "เพิ่มเงื่อนไขอย่างน้อย 1 รายการ หรือเลือกใช้ได้ทั้งตะกร้า"
        : hasEmptyScopeValue
          ? "กรอกข้อมูลสินค้าให้ครบทุกแถวก่อนบันทึก"
          : "";
    const customerScopeMessage =
      customerScopeMode === "scoped" && couponCustomerScopes.length === 0
        ? "เลือกกลุ่มลูกค้าอย่างน้อย 1 รายการ หรือเลือกลูกค้าทุกคน"
        : hasEmptyCustomerId
          ? "กรอกรหัสลูกค้าให้ครบก่อนบันทึก"
          : "";
    return {
      codeMessage,
      codeStatus: (
        !trimmedCode || !COUPON_CODE_PATTERN.test(trimmedCode) || duplicatedCode === trimmedCode
          ? "error"
          : "success"
      ) as "error" | "success",
      discountMessage,
      nameMessage,
      descriptionMessage,
      dateMessage,
      usageMessage,
      scopeMessage,
      customerScopeMessage,
      isValid:
        !!trimmedCode &&
        COUPON_CODE_PATTERN.test(trimmedCode) &&
        duplicatedCode !== trimmedCode &&
        !nameErrorMessage &&
        !descriptionMessage &&
        (type === "free_shipping" ||
          (!!discountValue &&
            Number.isFinite(parsedDiscountValue) &&
            parsedDiscountValue > 0)) &&
        !(type === "percentage" && parsedDiscountValue > 100) &&
        !!startDate &&
        (!endDate || endDate >= startDate) &&
        !usageMessage &&
        !scopeMessage &&
        !customerScopeMessage,
    };
  }, [
    code,
    couponScopes.length,
    couponCustomerScopes.length,
    customerScopeDrafts,
    customerScopeMode,
    duplicatedCode,
    description,
    discountValue,
    endDate,
    maxTotalUsage,
    maxUsagePerCustomer,
    name,
    scopeDrafts,
    scopeMode,
    startDate,
    type,
  ]);

  const saveDisabled = saving || saved || !validation.isValid;

  function updateCode(value: string) {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    setCode(normalized);
    setError("");
    if (duplicatedCode && duplicatedCode !== normalized) {
      setDuplicatedCode("");
    }
  }

  function generateCode() {
    const prefix = name.trim()
      ? name
          .trim()
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 5)
          .toUpperCase()
      : "PON";
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    updateCode(`${prefix}${suffix}`);
  }

  function applyDateShortcut(shortcut: DateShortcut) {
    const today = todayInputValue();
    setStartDate(today);
    setEndDate(
      shortcut === "unlimited"
        ? ""
        : shortcut === "today"
          ? today
          : addDaysInputValue(shortcut === "7days" ? 7 : 30),
    );
    setActiveDateShortcut(shortcut);
  }

  function updateStartDate(value: string) {
    setStartDate(value);
    setActiveDateShortcut(null);
  }

  function updateEndDate(value: string) {
    setEndDate(value);
    setActiveDateShortcut(null);
  }

  function selectScopeMode(nextMode: ScopeMode) {
    setScopeMode(nextMode);
    if (nextMode === "scoped" && scopeDrafts.length === 0) {
      setScopeDrafts([createScopeDraft()]);
    }
  }

  function updateScopeDraft(id: string, patch: Partial<Omit<ScopeDraft, "id">>) {
    setScopeDrafts((currentDrafts) =>
      currentDrafts.map((scopeDraft) =>
        scopeDraft.id === id ? { ...scopeDraft, ...patch } : scopeDraft,
      ),
    );
  }

  function removeScopeDraft(id: string) {
    setScopeDrafts((currentDrafts) => {
      const nextDrafts = currentDrafts.filter((scopeDraft) => scopeDraft.id !== id);
      return nextDrafts.length > 0 ? nextDrafts : [createScopeDraft()];
    });
  }

  function selectCustomerScopeMode(nextMode: CustomerScopeMode) {
    setCustomerScopeMode(nextMode);
    if (nextMode === "scoped" && customerScopeDrafts.length === 0) {
      setCustomerScopeDrafts([createCustomerScopeDraft()]);
    }
  }

  function updateCustomerScopeDraft(
    id: string,
    patch: Partial<Omit<CustomerScopeDraft, "id">>,
  ) {
    setCustomerScopeDrafts((currentDrafts) =>
      currentDrafts.map((customerScopeDraft) =>
        customerScopeDraft.id === id ? { ...customerScopeDraft, ...patch } : customerScopeDraft,
      ),
    );
  }

  function removeCustomerScopeDraft(id: string) {
    setCustomerScopeDrafts((currentDrafts) => {
      const nextDrafts = currentDrafts.filter((customerScopeDraft) => customerScopeDraft.id !== id);
      return nextDrafts.length > 0 ? nextDrafts : [createCustomerScopeDraft()];
    });
  }

  async function save() {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const parsedDiscountValue = Number(discountValue);
    const scopes = buildScopes(scopeMode, scopeDrafts);
    const customerScopes = buildCustomerScopes(customerScopeMode, customerScopeDrafts);

    if (!validation.isValid) {
      setError("กรุณากรอกข้อมูลที่จำเป็นให้ถูกต้องก่อนบันทึก");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const body = {
        code: trimmedCode,
        campaignId: campaignId || null,
        name: trimmedName || undefined,
        couponName: trimmedName || undefined,
        description: trimmedDescription || undefined,
        type,
        value: type === "free_shipping" ? 0 : parsedDiscountValue,
        minimumSubtotal: toNullableNumber(minOrderAmount) ?? 0,
        maximumDiscount:
          type === "percentage" || type === "free_shipping"
            ? toNullableNumber(maxDiscountAmount)
            : null,
        startsAtUtc: toUtcIsoDate(startDate, "start"),
        endsAtUtc: toUtcIsoDate(endDate, "end"),
        canCombineWithFlashSale: combinableWithFlashSale,
        canStackWithPromotions,
        canStackWithCoupons,
        maximumTotalUses: toNullableNumber(maxTotalUsage),
        maximumUsesPerCustomer: toNullableNumber(maxUsagePerCustomer),
        isActive,
        scopes,
        customerScopes,
        conditions: [],
      };

      if (isEdit) {
        const res = await fetch(`/api/backend/admin/coupons/${initialData!.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await extractErrorMessage(res, "บันทึกไม่สำเร็จ"));
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } else {
        const res = await fetch("/api/backend/admin/coupons", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await extractErrorMessage(res, "สร้างไม่สำเร็จ"));
        router.push("/coupons");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "บันทึกไม่สำเร็จ";
      if (message.toLowerCase().includes("duplicate") || message.includes("ถูกใช้")) {
        setDuplicatedCode(trimmedCode);
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <StickyActionHeader
        eyebrow="Coupon Editor"
        title={isEdit ? "แก้ไขคูปอง" : "สร้างคูปองใหม่"}
        description="ตั้งค่าโค้ด ส่วนลด ช่วงเวลา และเงื่อนไขการใช้งานสำหรับลูกค้า"
        actions={
          <>
          <Link href="/coupons" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            ยกเลิก
          </Link>
          <Button
            size="lg"
            onClick={save}
            disabled={saveDisabled}
            className="bg-foreground text-background hover:bg-foreground/90"
            title={!validation.isValid ? "กรุณากรอกข้อมูลที่จำเป็นให้ถูกต้องก่อนบันทึก" : undefined}
          >
            {saving ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save />
            )}
            {saving
              ? "กำลังบันทึก..."
              : saved
                ? "บันทึกแล้ว"
                : isEdit
                  ? "บันทึกการแก้ไข"
                  : "บันทึกคูปอง"}
          </Button>
          </>
        }
      />

      {error ? (
        <p className="flex items-center gap-2 px-1 text-sm font-bold text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <main className="space-y-4 xl:col-span-8">
          <SectionCard
            number="1"
            title="ข้อมูลคูปอง"
            description="ตั้งชื่อและโค้ดที่ลูกค้าจะใช้ตอนชำระเงิน"
            icon={<Ticket />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="โค้ดคูปอง" message={validation.codeMessage} tone={validation.codeStatus}>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onValueChange={updateCode}
                    placeholder="WELCOME10"
                    className="h-11 rounded-xl uppercase"
                    aria-invalid={validation.codeStatus === "error"}
                    disabled={isEdit}
                  />
                  {!isEdit ? (
                    <Button type="button" variant="outline" size="lg" onClick={generateCode}>
                      <RefreshCw />
                      สุ่มโค้ด
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field
                label="ชื่อคูปอง"
                message={validation.nameMessage}
                tone={validation.nameMessage ? "error" : undefined}
              >
                <Input
                  value={name}
                  onValueChange={(nextValue) => setName(nextValue.slice(0, 256))}
                  placeholder="คูปองลด 100 บาท"
                  className="h-11 rounded-xl"
                  aria-invalid={!!validation.nameMessage}
                />
              </Field>
              <Field
                className="md:col-span-2"
                label="รายละเอียดคูปอง"
                message={
                  validation.descriptionMessage ||
                  `${description.length.toLocaleString()} / 2,000 ตัวอักษร`
                }
                tone={validation.descriptionMessage ? "error" : undefined}
              >
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 2000))}
                  placeholder="ใช้ได้เมื่อซื้อครบ 500 บาท"
                  className="min-h-24 rounded-xl"
                  aria-invalid={!!validation.descriptionMessage}
                />
              </Field>
              <Field
                className="md:col-span-2"
                label="Campaign"
                message="ถ้าเลือก Campaign คูปองจะถูกควบคุมด้วยสถานะและช่วงเวลาของ Campaign ด้วย"
              >
                <NativeSelect
                  value={campaignId}
                  onChange={(event) => setCampaignId(event.target.value)}
                  className="h-11 w-full [&_select]:h-11 [&_select]:rounded-xl"
                >
                  <NativeSelectOption value="">ไม่ผูก Campaign</NativeSelectOption>
                  {campaigns.map((campaign) => (
                    <NativeSelectOption key={campaign.id} value={campaign.id}>
                      {campaign.name}
                      {campaign.status === "active" ? "" : " (ปิด/หมดช่วงเวลา)"}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            number="2"
            title="เงื่อนไขส่วนลด"
            description="กำหนดรูปแบบส่วนลด ยอดขั้นต่ำ และเพดานส่วนลด"
            icon={<CircleDollarSign />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ประเภทส่วนลด">
                <NativeSelect
                  value={type}
                  onChange={(event) => {
                    const nextType = event.target.value as CouponType;
                    setType(nextType);
                    if (nextType === "free_shipping") setDiscountValue("0");
                    if (type === "free_shipping" && nextType !== "free_shipping") {
                      setDiscountValue("");
                    }
                    if (nextType === "fixed") setMaxDiscountAmount("");
                  }}
                  className="h-11 w-full [&_select]:h-11 [&_select]:rounded-xl"
                >
                  <NativeSelectOption value="fixed">จำนวนเงิน</NativeSelectOption>
                  <NativeSelectOption value="percentage">เปอร์เซ็นต์</NativeSelectOption>
                  <NativeSelectOption value="free_shipping">ส่งฟรี</NativeSelectOption>
                </NativeSelect>
              </Field>
              {type !== "free_shipping" ? (
                <Field
                  label={type === "percentage" ? "มูลค่าส่วนลด (%)" : "มูลค่าส่วนลด (บาท)"}
                  message={validation.discountMessage}
                  tone={validation.discountMessage ? "error" : undefined}
                >
                  <Input
                    type="number"
                    min={0}
                    max={type === "percentage" ? 100 : undefined}
                    value={discountValue}
                    onValueChange={setDiscountValue}
                    placeholder={type === "percentage" ? "10" : "100"}
                    className="h-11 rounded-xl"
                    aria-invalid={!!validation.discountMessage}
                  />
                </Field>
              ) : null}
              <Field label="ยอดสั่งซื้อขั้นต่ำ (บาท)">
                <Input
                  type="number"
                  min={0}
                  value={minOrderAmount}
                  onValueChange={setMinOrderAmount}
                  placeholder="ไม่มีขั้นต่ำ"
                  className="h-11 rounded-xl"
                />
              </Field>
              {type === "percentage" || type === "free_shipping" ? (
                <Field
                  label={type === "free_shipping" ? "ส่งฟรีสูงสุด (บาท)" : "ส่วนลดสูงสุด (บาท)"}
                  message={
                    type === "free_shipping" && !maxDiscountAmount
                      ? "ไม่กำหนด หมายถึงส่งฟรีเต็มจำนวน"
                      : undefined
                  }
                >
                  <Input
                    type="number"
                    min={0}
                    value={maxDiscountAmount}
                    onValueChange={setMaxDiscountAmount}
                    placeholder={type === "free_shipping" ? "ส่งฟรีเต็มจำนวน" : "ไม่จำกัด"}
                    className="h-11 rounded-xl"
                  />
                </Field>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            number="3"
            title="ช่วงเวลาใช้งาน"
            description="กำหนดวันที่เริ่มต้นและวันที่สิ้นสุดของคูปอง"
            icon={<CalendarDays />}
          >
            <div className="mb-4">
              <DateShortcutSelector
                active={activeDateShortcut}
                onSelect={applyDateShortcut}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="วันที่เริ่มต้น">
                <Input
                  type="date"
                  value={startDate}
                  onValueChange={updateStartDate}
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field
                label="วันที่สิ้นสุด"
                message={validation.dateMessage || (!endDate ? "เว้นว่างเมื่อต้องการไม่จำกัดวันหมดอายุ" : "")}
                tone={validation.dateMessage ? "warning" : undefined}
              >
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onValueChange={updateEndDate}
                  className="h-11 rounded-xl"
                  aria-invalid={!!validation.dateMessage}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            number="4"
            title="สิทธิ์และข้อจำกัด"
            description="จำกัดจำนวนสิทธิ์ทั้งหมดและจำนวนครั้งที่ลูกค้าแต่ละคนใช้ได้"
            icon={<ShieldCheck />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="จำนวนสิทธิ์ทั้งหมด">
                <Input
                  type="number"
                  min={0}
                  value={maxTotalUsage}
                  onValueChange={setMaxTotalUsage}
                  placeholder="ไม่จำกัด"
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field
                label="จำนวนใช้สูงสุดต่อลูกค้า"
                message={validation.usageMessage}
                tone={validation.usageMessage ? "error" : undefined}
              >
                <Input
                  type="number"
                  min={0}
                  value={maxUsagePerCustomer}
                  onValueChange={setMaxUsagePerCustomer}
                  placeholder="1"
                  className="h-11 rounded-xl"
                  aria-invalid={!!validation.usageMessage}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            number="5"
            title="ใช้ได้กับสินค้า"
            description="เลือกว่าส่วนลดนี้ใช้กับสินค้าทั้งตะกร้า หรือใช้กับสินค้าบางรายการเท่านั้น"
            icon={<Tags />}
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <ScopeModeButton
                  active={scopeMode === "entire"}
                  title="สินค้าทุกชิ้นในตะกร้า"
                  description="ลูกค้าใช้คูปองนี้กับยอดรวมทั้งตะกร้าได้"
                  onClick={() => selectScopeMode("entire")}
                />
                <ScopeModeButton
                  active={scopeMode === "scoped"}
                  title="เฉพาะสินค้าที่กำหนด"
                  description="ส่วนลดจะคิดเฉพาะสินค้าที่ตรงเงื่อนไขเท่านั้น"
                  onClick={() => selectScopeMode("scoped")}
                />
              </div>

              {scopeMode === "scoped" ? (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/25 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">รายการสินค้าที่ร่วมคูปอง</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        เพิ่มได้หลายเงื่อนไข เช่น สินค้า รุ่นสินค้า SKU หรือหมวดหมู่
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScopeDrafts((currentDrafts) => [...currentDrafts, createScopeDraft()])}
                    >
                      <Plus />
                      เพิ่มเงื่อนไขสินค้า
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {scopeDrafts.map((scopeDraft) => {
                      return (
                        <div
                          key={scopeDraft.id}
                          className="grid gap-2 rounded-xl border border-border bg-background p-3 md:grid-cols-[190px_minmax(0,1fr)_auto]"
                        >
                          <NativeSelect
                            value={scopeDraft.kind}
                            onChange={(event) =>
                              updateScopeDraft(scopeDraft.id, {
                                kind: event.target.value as ScopeDraftKind,
                                value: "",
                              })
                            }
                            className="h-11 w-full [&_select]:h-11 [&_select]:rounded-xl"
                          >
                            {SCOPE_KIND_OPTIONS.map((option) => (
                              <NativeSelectOption key={option.value} value={option.value}>
                                {option.label}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          {scopeDraft.kind === "category" ? (
                            <NativeSelect
                              value={scopeDraft.value}
                              onChange={(event) =>
                                updateScopeDraft(scopeDraft.id, { value: event.target.value })
                              }
                              disabled={categories.length === 0}
                              className="h-11 w-full [&_select]:h-11 [&_select]:rounded-xl"
                            >
                              <NativeSelectOption value="">
                                {categories.length ? "เลือกหมวดหมู่" : "ยังไม่มีหมวดหมู่ให้เลือก"}
                              </NativeSelectOption>
                              {categories.map((category) => (
                                <NativeSelectOption key={category.id} value={getCategoryOptionValue(category)}>
                                  {category.name}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          ) : (
                            <CouponScopeValuePicker
                              kind={scopeDraft.kind}
                              value={scopeDraft.value}
                              onValueChange={(value) => updateScopeDraft(scopeDraft.id, { value })}
                            />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11 text-muted-foreground hover:text-destructive"
                            onClick={() => removeScopeDraft(scopeDraft.id)}
                            aria-label="ลบเงื่อนไขสินค้า"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {validation.scopeMessage ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <AlertCircle className="size-3.5" />
                      {validation.scopeMessage}
                    </p>
                  ) : null}

                  <div className="grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                    <p>ระบบจะคิดส่วนลดเฉพาะสินค้าที่ตรงเงื่อนไขเท่านั้น</p>
                    <p>ถ้าในตะกร้าไม่มีสินค้าที่ร่วมคูปอง ลูกค้าจะใช้คูปองไม่ได้</p>
                    <p>ถ้าเลือกหมวดหมู่ จะรวมสินค้าจากหมวดย่อยด้วย</p>
                    <p>ถ้าไม่กำหนดสินค้าเพิ่มเติม คูปองจะใช้ได้กับทุกสินค้าในตะกร้า</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
                  คูปองนี้จะลดจากยอดรวมของสินค้าทุกชิ้นในตะกร้า
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            number="6"
            title="ลูกค้าที่ใช้ได้"
            description="เลือกว่าคูปองนี้เปิดให้ลูกค้าทุกคนใช้ได้ หรือจำกัดเฉพาะลูกค้าบางกลุ่ม"
            icon={<UserCheck />}
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <ScopeModeButton
                  active={customerScopeMode === "all"}
                  title="ลูกค้าทุกคน"
                  description="ลูกค้าทุกคนสามารถใช้คูปองนี้ได้"
                  onClick={() => selectCustomerScopeMode("all")}
                />
                <ScopeModeButton
                  active={customerScopeMode === "scoped"}
                  title="เฉพาะลูกค้าที่กำหนด"
                  description="เลือกกลุ่มลูกค้าที่ต้องการให้ใช้คูปองนี้"
                  onClick={() => selectCustomerScopeMode("scoped")}
                />
              </div>

              {customerScopeMode === "scoped" ? (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/25 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">กลุ่มลูกค้าที่ใช้คูปองได้</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        เลือกได้หลายกลุ่ม ลูกค้าอยู่ในกลุ่มใดกลุ่มหนึ่งก็ใช้คูปองได้
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCustomerScopeDrafts((currentDrafts) => [
                          ...currentDrafts,
                          createCustomerScopeDraft(),
                        ])
                      }
                    >
                      <Plus />
                      เพิ่มกลุ่มลูกค้า
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {customerScopeDrafts.map((customerScopeDraft) => {
                      const selectedOption =
                        CUSTOMER_SCOPE_KIND_OPTIONS.find(
                          (option) => option.value === customerScopeDraft.kind,
                        ) ?? CUSTOMER_SCOPE_KIND_OPTIONS[0];

                      return (
                        <div
                          key={customerScopeDraft.id}
                          className="grid gap-2 rounded-xl border border-border bg-background p-3 md:grid-cols-[220px_minmax(0,1fr)_auto]"
                        >
                          <NativeSelect
                            value={customerScopeDraft.kind}
                            onChange={(event) =>
                              updateCustomerScopeDraft(customerScopeDraft.id, {
                                kind: event.target.value as CustomerScopeDraftKind,
                                customerId: "",
                              })
                            }
                            className="h-11 w-full [&_select]:h-11 [&_select]:rounded-xl"
                          >
                            {CUSTOMER_SCOPE_KIND_OPTIONS.map((option) => (
                              <NativeSelectOption key={option.value} value={option.value}>
                                {option.label}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          {customerScopeDraft.kind === "customer" ? (
                            <CouponCustomerPicker
                              value={customerScopeDraft.customerId}
                              onValueChange={(customerId) =>
                                updateCustomerScopeDraft(customerScopeDraft.id, { customerId })
                              }
                              placeholder="รหัสลูกค้า เช่น cus_123"
                              className="h-11 rounded-xl"
                            />
                          ) : (
                            <div className="flex min-h-11 items-center rounded-xl border border-border bg-muted/35 px-3 text-sm text-muted-foreground">
                              {selectedOption.description}
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11 text-muted-foreground hover:text-destructive"
                            onClick={() => removeCustomerScopeDraft(customerScopeDraft.id)}
                            aria-label="ลบกลุ่มลูกค้า"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {validation.customerScopeMessage ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <AlertCircle className="size-3.5" />
                      {validation.customerScopeMessage}
                    </p>
                  ) : null}

                  <div className="grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                    <p>ลูกค้าใหม่ คือคนที่ยังไม่เคยมีคำสั่งซื้อสำเร็จ</p>
                    <p>ลูกค้าเก่า คือคนที่เคยมีคำสั่งซื้อสำเร็จแล้ว</p>
                    <p>เลือกลูกค้ารายคนได้เมื่อต้องการให้สิทธิ์เฉพาะคน</p>
                    <p>ถ้าลูกค้าไม่อยู่ในกลุ่มที่กำหนด จะใช้คูปองนี้ไม่ได้</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-muted/25 p-4 text-sm leading-6 text-muted-foreground">
                  คูปองนี้เปิดให้ลูกค้าทุกคนใช้งานได้
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            number="7"
            title="ตัวเลือกเพิ่มเติม"
            description="ควบคุมการใช้ร่วมกับโปรโมชันอื่นและสถานะการเปิดใช้งาน"
            icon={<Settings2 />}
          >
            <div className="space-y-3">
              <ToggleRow
                title="ใช้ร่วมกับ Flash Sale ได้"
                description="อนุญาตให้ใช้คูปองกับสินค้าร่วมโปรโมชันอื่น"
                checked={combinableWithFlashSale}
                onCheckedChange={setCombinableWithFlashSale}
                activeLabel="เปิด"
                inactiveLabel="ปิด"
              />
              <ToggleRow
                title="ใช้ร่วมกับโปรโมชันได้"
                description="อนุญาตให้คูปองนี้ใช้พร้อมโปรโมชันใน checkout"
                checked={canStackWithPromotions}
                onCheckedChange={setCanStackWithPromotions}
                activeLabel="เปิด"
                inactiveLabel="ปิด"
              />
              <ToggleRow
                title="ใช้ร่วมกับคูปองอื่นได้"
                description="ระบบ checkout จำกัดให้ใช้คู่ได้เฉพาะคูปองส่วนลดสินค้า 1 ใบ กับคูปองส่งฟรี 1 ใบ"
                checked={canStackWithCoupons}
                onCheckedChange={setCanStackWithCoupons}
                activeLabel="เปิด"
                inactiveLabel="ปิด"
              />
              <ToggleRow
                title="เปิดใช้งานคูปอง"
                description="เมื่อเปิด ลูกค้าจะสามารถใช้คูปองนี้ได้ทันที"
                checked={isActive}
                onCheckedChange={setIsActive}
                activeLabel="เปิดใช้งาน"
                inactiveLabel="ปิดใช้งาน"
              />
            </div>
          </SectionCard>
        </main>

        <aside className="xl:col-span-4">
          <div className="space-y-4 xl:sticky xl:top-32">
            <Card className="rounded-2xl border-border/80 bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BadgePercent className="size-4 text-muted-foreground" />
                  <CardTitle className="text-base font-bold">Live Coupon Preview</CardTitle>
                </div>
                <CardDescription>อัปเดตตามข้อมูลที่กรอกแบบเรียลไทม์</CardDescription>
              </CardHeader>
              <CardContent>
                <CouponPreview
                  code={code}
                  categories={categories}
                  description={description}
                  name={name}
                  type={type}
                  discountValue={discountValue}
                  minOrderAmount={minOrderAmount}
                  maxDiscountAmount={maxDiscountAmount}
                  startDate={startDate}
                  endDate={endDate}
                  maxTotalUsage={maxTotalUsage}
                  maxUsagePerCustomer={maxUsagePerCustomer}
                  combinableWithFlashSale={combinableWithFlashSale}
                  canStackWithPromotions={canStackWithPromotions}
                  canStackWithCoupons={canStackWithCoupons}
                  isActive={isActive}
                  scopes={couponScopes}
                  customerScopes={couponCustomerScopes}
                />
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

    </div>
  );
}

async function extractErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { message?: string };
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

function SectionCard({
  children,
  description,
  icon,
  number,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  number: string;
  title: string;
}) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-none">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/50 text-muted-foreground [&_svg]:size-4">
            {icon}
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background">
              {number}
            </span>
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm leading-6">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  children,
  className = "",
  label,
  message,
  tone,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  message?: string;
  tone?: "success" | "error" | "warning";
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-xs font-bold text-foreground">{label}</span>
      {children}
      {message ? (
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            tone === "success" && "text-emerald-700 dark:text-emerald-400",
            tone === "error" && "text-destructive",
            tone === "warning" && "text-amber-700 dark:text-amber-400",
            !tone && "text-muted-foreground",
          )}
        >
          {tone === "success" ? <CheckCircle2 className="size-3.5" /> : null}
          {tone === "error" || tone === "warning" ? <AlertCircle className="size-3.5" /> : null}
          {message}
        </span>
      ) : null}
    </label>
  );
}

function ToggleRow({
  activeLabel,
  checked,
  description,
  inactiveLabel,
  onCheckedChange,
  title,
}: {
  activeLabel: string;
  checked: boolean;
  description: string;
  inactiveLabel: string;
  onCheckedChange: (checked: boolean) => void;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold">{title}</p>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold",
              checked
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {checked ? activeLabel : inactiveLabel}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ScopeModeButton({
  active,
  description,
  onClick,
  title,
}: {
  active: boolean;
  description: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-muted/50",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-black">
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full border",
            active ? "border-background" : "border-border",
          )}
        >
          {active ? <span className="size-2 rounded-full bg-background" /> : null}
        </span>
        {title}
      </span>
      <span className={cn("mt-2 block text-xs leading-5", active ? "text-background/75" : "text-muted-foreground")}>
        {description}
      </span>
    </button>
  );
}

function CouponPreview({
  categories,
  code,
  canStackWithCoupons,
  canStackWithPromotions,
  combinableWithFlashSale,
  customerScopes,
  description,
  discountValue,
  endDate,
  isActive,
  maxDiscountAmount,
  maxTotalUsage,
  maxUsagePerCustomer,
  minOrderAmount,
  name,
  scopes,
  startDate,
  type,
}: {
  categories: CouponCategoryOption[];
  code: string;
  canStackWithCoupons: boolean;
  canStackWithPromotions: boolean;
  combinableWithFlashSale: boolean;
  customerScopes: CouponCustomerScope[];
  description: string;
  discountValue: string;
  endDate: string;
  isActive: boolean;
  maxDiscountAmount: string;
  maxTotalUsage: string;
  maxUsagePerCustomer: string;
  minOrderAmount: string;
  name: string;
  scopes: CouponScope[];
  startDate: string;
  type: CouponType;
}) {
  const discountLabel = type === "free_shipping"
    ? "ส่งฟรี"
    : discountValue
    ? type === "percentage"
      ? `${Number(discountValue).toLocaleString()}% OFF`
      : `฿${Number(discountValue).toLocaleString()} OFF`
    : type === "percentage"
      ? "10% OFF"
      : "฿100 OFF";
  const shopDiscountValue = type === "free_shipping"
    ? "ส่งฟรี"
    : discountValue
    ? type === "percentage"
      ? `${Number(discountValue).toLocaleString()}%`
      : `฿${Number(discountValue).toLocaleString()}`
    : type === "percentage"
      ? "10%"
      : "฿50";
  const shopTitle = name || "ชื่อ";
  const shopDescription = description.trim() || "รายละเอียด";
  const minimumOrderLabel =
    minOrderAmount && Number(minOrderAmount) > 0
      ? `ขั้นต่ำ ${Number(minOrderAmount).toLocaleString()} ฿`
      : "";
  const scopeLabel = formatScopesForPreview(scopes, categories);
  const customerScopeLabel = formatCustomerScopesForPreview(customerScopes);
  const palette = type === "free_shipping"
    ? {
        shellBg: "#d7f8e8",
        shellDark: "dark:bg-emerald-950/20",
        accent: "bg-emerald-600",
        ring: "ring-emerald-100",
        shadow: "shadow-[0_14px_34px_rgba(5,150,105,0.14)]",
        buttonShadow: "shadow-[0_10px_22px_rgba(5,150,105,0.34),inset_0_2px_0_rgba(255,255,255,0.35)]",
      }
    : {
        shellBg: "#fee8ec",
        shellDark: "dark:bg-rose-950/20",
        accent: "bg-[#ef101a]",
        ring: "ring-red-100",
        shadow: "shadow-[0_14px_34px_rgba(239,16,26,0.14)]",
        buttonShadow: "shadow-[0_10px_22px_rgba(239,16,26,0.34),inset_0_2px_0_rgba(255,255,255,0.35)]",
      };

  return (
    <div className="space-y-4">
      <div
        className={cn("rounded-2xl p-2", palette.shellDark)}
        style={{ "--coupon-shell-bg": palette.shellBg, backgroundColor: "var(--coupon-shell-bg)" } as React.CSSProperties}
      >
        <div
          className={cn("relative flex min-h-44 overflow-hidden rounded-[26px] bg-background", palette.shadow)}
          style={{
            WebkitMaskImage:
              "radial-gradient(circle 18px at left 50%, transparent 0 17.5px, #000 18px)",
            maskImage:
              "radial-gradient(circle 18px at left 50%, transparent 0 17.5px, #000 18px)",
          }}
        >
          <div className={cn("relative grid w-[35%] min-w-24 shrink-0 place-items-center px-2 py-5 text-center text-white", palette.accent)}>
            <span className="absolute right-0 top-0 h-full w-px bg-white/35" />
            <div>
              <p className="text-[38px] font-black leading-none tracking-tight">{shopDiscountValue}</p>
              <p className="mt-3 text-[15px] font-black leading-none">{minimumOrderLabel}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-5">
            <div className="min-w-0 space-y-2">
              <p className="line-clamp-2 text-[22px] font-black leading-tight tracking-tight text-[#1f1f25]">
                {shopTitle}
              </p>
              {shopDescription ? (
                <p className="line-clamp-2 text-sm font-semibold leading-5 text-muted-foreground">
                  {shopDescription}
                </p>
              ) : null}
              <p className="truncate text-[15px] font-black tracking-[0.08em] text-muted-foreground">
                CODE <span className="font-mono text-[#1f1f25]">{code || "code"}</span>
              </p>
            </div>
            <div className={cn(
              "grid size-18 shrink-0 place-items-center rounded-full text-base font-black text-white ring-4",
              palette.accent,
              palette.buttonShadow,
              palette.ring,
            )}>
              เก็บ
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-black tracking-tight text-foreground">{discountLabel}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {shopTitle}
            </p>
            {shopDescription ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {shopDescription}
              </p>
            ) : null}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
              isActive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          </span>
        </div>
        <PreviewRow
          label="ช่วงเวลา"
          value={
            startDate
              ? endDate
                ? `${formatDateTh(startDate)} - ${formatDateTh(endDate)}`
                : `ตั้งแต่ ${formatDateTh(startDate)}`
              : "กำหนดวันเริ่มต้น"
          }
        />
        <PreviewRow
          label="ยอดขั้นต่ำ"
          value={minOrderAmount ? `฿${Number(minOrderAmount).toLocaleString()}` : "ไม่มีขั้นต่ำ"}
        />
        {type === "percentage" || type === "free_shipping" ? (
          <PreviewRow
            label={type === "free_shipping" ? "ส่งฟรีสูงสุด" : "ส่วนลดสูงสุด"}
            value={
              maxDiscountAmount
                ? `฿${Number(maxDiscountAmount).toLocaleString()}`
                : type === "free_shipping"
                  ? "ส่งฟรีเต็มจำนวน"
                  : "ไม่จำกัด"
            }
          />
        ) : null}
        <PreviewRow
          label="สิทธิ์ทั้งหมด"
          value={maxTotalUsage ? `${Number(maxTotalUsage).toLocaleString()} ครั้ง` : "ไม่จำกัด"}
        />
        <PreviewRow
          label="สิทธิ์ต่อลูกค้า"
          value={maxUsagePerCustomer ? `${Number(maxUsagePerCustomer).toLocaleString()} ครั้ง` : "1 ครั้ง"}
        />
        <PreviewRow label="ใช้ได้กับ" value={scopeLabel} />
        <PreviewRow label="ลูกค้าที่ใช้ได้" value={customerScopeLabel} />
        <PreviewRow label="ใช้ร่วม Flash Sale" value={combinableWithFlashSale ? "ใช้ได้" : "ใช้ไม่ได้"} />
        <PreviewRow label="ใช้ร่วม Promotion" value={canStackWithPromotions ? "ใช้ได้" : "ใช้ไม่ได้"} />
        <PreviewRow label="ใช้ร่วมคูปองอื่น" value={canStackWithCoupons ? "ใช้ได้" : "ใช้ไม่ได้"} />
        <PreviewRow
          label="สถานะ"
          value={isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          icon={<Power className="size-3.5" />}
          strong
        />
      </div>
    </div>
  );
}

function PreviewRow({
  icon,
  label,
  strong = false,
  value,
}: {
  icon?: ReactNode;
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4 border-b border-border/70 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-xs font-medium leading-5 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "flex max-w-48 items-center gap-1.5 truncate text-right text-xs leading-5",
          strong ? "font-black text-foreground" : "font-bold text-foreground",
        )}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}

function formatDateTh(dateStr: string) {
  const dateValue = normalizeDateInputValue(dateStr);
  if (!dateValue) return "";

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);
}

function formatScopesForPreview(scopes: CouponScope[], categories: CouponCategoryOption[]) {
  if (scopes.length === 0) return "ทั้งตะกร้า";
  if (scopes.length > 1) return `${scopes.length.toLocaleString()} เงื่อนไข`;

  const [scope] = scopes;
  if (scope.type === "product") return "สินค้าเฉพาะ";
  if (scope.type === "variant") return "Variant เฉพาะ";
  if (scope.type === "sku") return `SKU ${scope.sku}`;
  if ("zortCategoryId" in scope) {
    return (
      categories.find(
        (category) => String(category.zortCategoryId ?? "") === String(scope.zortCategoryId),
      )?.name ?? `หมวดหมู่ #${scope.zortCategoryId}`
    );
  }
  return scope.categoryName;
}

function formatCustomerScopesForPreview(customerScopes: CouponCustomerScope[]) {
  if (customerScopes.length === 0) return "ทุกคน";
  if (customerScopes.length > 1) return `${customerScopes.length.toLocaleString()} เงื่อนไข`;

  const [customerScope] = customerScopes;
  if (customerScope.type === "new_customer") return "ลูกค้าใหม่";
  if (customerScope.type === "first_order") return "Order แรก";
  if (customerScope.type === "existing_customer") return "เคยซื้อแล้ว";
  return `Customer ${customerScope.customerId}`;
}
