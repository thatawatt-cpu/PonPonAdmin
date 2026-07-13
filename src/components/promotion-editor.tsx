"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarClock, Save, Settings2, Tag } from "lucide-react";
import type { CouponCampaign } from "@/lib/admin-coupon-campaigns";
import type { AdminCategory } from "@/lib/admin-products";
import type {
  Promotion,
  PromotionCondition,
  PromotionCustomerScope,
  PromotionDiscountType,
  PromotionScheduleRule,
  PromotionScheduleRuleType,
  PromotionScope,
  PromotionType,
} from "@/lib/admin-promotions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StickyActionHeader } from "@/components/sticky-action-header";

type CategoryOption = Pick<AdminCategory, "id" | "name">;
type ScopeDraft = PromotionScope & { id: string };
type CustomerScopeDraft = PromotionCustomerScope & { id: string };
type EditablePromotionConditionType = Exclude<PromotionCondition["type"], "payment_method">;
type ConditionDraft = Omit<PromotionCondition, "type"> & {
  id: string;
  type: EditablePromotionConditionType;
};

const enabledTypes: { value: PromotionType; label: string }[] = [
  { value: "auto_discount", label: "ส่วนลดอัตโนมัติ" },
  { value: "free_shipping", label: "ส่งฟรี" },
  { value: "special_price", label: "ราคาพิเศษ" },
];

const discountTypes: { value: PromotionDiscountType; label: string }[] = [
  { value: "percentage", label: "เปอร์เซ็นต์" },
  { value: "fixed", label: "จำนวนเงิน" },
  { value: "special_price", label: "ราคาพิเศษ" },
  { value: "free_shipping", label: "ส่งฟรี" },
];

const scheduleTypes: { value: PromotionScheduleRuleType; label: string }[] = [
  { value: "daily_time", label: "ทุกวันตามช่วงเวลา" },
  { value: "day_of_week", label: "ทุกสัปดาห์ตามวัน" },
  { value: "day_of_month", label: "ทุกเดือนตามวันที่" },
];

const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function PromotionEditor({
  campaigns,
  categories,
  initialData,
}: {
  campaigns: CouponCampaign[];
  categories: CategoryOption[];
  initialData?: Promotion;
}) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [campaignId, setCampaignId] = useState(initialData?.campaignId ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [type, setType] = useState<PromotionType>(initialData?.type ?? "auto_discount");
  const [discountType, setDiscountType] = useState<PromotionDiscountType>(
    initialData?.discountType ?? "percentage",
  );
  const [discountValue, setDiscountValue] = useState(String(initialData?.discountValue ?? 10));
  const [minimumSubtotal, setMinimumSubtotal] = useState(String(initialData?.minimumSubtotal ?? 0));
  const [maximumDiscount, setMaximumDiscount] = useState(
    initialData?.maximumDiscount == null ? "" : String(initialData.maximumDiscount),
  );
  const [startDate, setStartDate] = useState(toDateInput(initialData?.startsAtUtc));
  const [endDate, setEndDate] = useState(toDateInput(initialData?.endsAtUtc));
  const [priority, setPriority] = useState(String(initialData?.priority ?? 10));
  const [canStackWithCoupon, setCanStackWithCoupon] = useState(initialData?.canStackWithCoupon ?? true);
  const [canStackWithPromotions, setCanStackWithPromotions] = useState(initialData?.canStackWithPromotions ?? true);
  const [canCombineWithFlashSale, setCanCombineWithFlashSale] = useState(initialData?.canCombineWithFlashSale ?? true);
  const [maximumTotalUses, setMaximumTotalUses] = useState(
    initialData?.maximumTotalUses == null ? "" : String(initialData.maximumTotalUses),
  );
  const [maximumUsesPerCustomer, setMaximumUsesPerCustomer] = useState(
    initialData?.maximumUsesPerCustomer == null ? "" : String(initialData.maximumUsesPerCustomer),
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [scheduleRules, setScheduleRules] = useState<PromotionScheduleRule[]>(
    initialData?.scheduleRules.length
      ? initialData.scheduleRules
      : [
          {
            type: "daily_time",
            dayOfWeek: null,
            dayOfMonth: null,
            startsAtLocalTime: "00:00:00",
            endsAtLocalTime: "23:59:00",
          },
        ],
  );
  const [scopes, setScopes] = useState<ScopeDraft[]>(
    initialData?.scopes.length
      ? initialData.scopes.map((scope, index) => ({ ...scope, id: `scope-${index}` }))
      : [],
  );
  const [customerScopes, setCustomerScopes] = useState<CustomerScopeDraft[]>(
    initialData?.customerScopes.length
      ? initialData.customerScopes.map((scope, index) => ({ ...scope, id: `customer-${index}` }))
      : [],
  );
  const [conditions, setConditions] = useState<ConditionDraft[]>(
    initialData?.conditions.length
      ? editablePromotionConditions(initialData.conditions)
      : [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validationMessage = useMemo(() => {
    const parsedDiscountValue = Number(discountValue);
    const parsedMinimumSubtotal = Number(minimumSubtotal || 0);
    const parsedPriority = Number(priority || 0);
    if (!name.trim()) return "กรอกชื่อ Promotion ก่อนบันทึก";
    if (!Number.isFinite(parsedDiscountValue) || parsedDiscountValue < 0) {
      return "มูลค่าส่วนลดต้องเป็น 0 หรือมากกว่า";
    }
    if (discountType === "percentage" && parsedDiscountValue > 100) {
      return "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100%";
    }
    if (!Number.isFinite(parsedMinimumSubtotal) || parsedMinimumSubtotal < 0) {
      return "ยอดสั่งซื้อขั้นต่ำต้องเป็น 0 หรือมากกว่า";
    }
    if (!Number.isInteger(parsedPriority)) return "Priority ต้องเป็นจำนวนเต็ม";
    if (startDate && endDate && endDate < startDate) {
      return "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น";
    }
    if (scopes.some((scope) => !scopeValue(scope))) return "กรอก scope สินค้าให้ครบทุกแถว";
    if (
      customerScopes.some((scope) => scope.type === "customer" && !scope.customerId?.trim())
    ) {
      return "กรอกรหัสลูกค้าให้ครบทุกแถว";
    }
    if (conditions.some((condition) => !condition.value.trim())) {
      return "กรอกเงื่อนไขให้ครบทุกแถว";
    }
    return "";
  }, [
    conditions,
    customerScopes,
    discountType,
    discountValue,
    endDate,
    minimumSubtotal,
    name,
    priority,
    scopes,
    startDate,
  ]);

  function updateType(nextType: PromotionType) {
    setType(nextType);
    if (nextType === "free_shipping") {
      setDiscountType("free_shipping");
      setDiscountValue("0");
    }
    if (nextType === "special_price") {
      setDiscountType("special_price");
    }
    if (nextType === "auto_discount" && discountType === "free_shipping") {
      setDiscountType("percentage");
      setDiscountValue("10");
    }
  }

  async function submit() {
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        isEdit
          ? `/api/backend/admin/promotions/${initialData.id}`
          : "/api/backend/admin/promotions",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            campaignId: campaignId || null,
            name: name.trim(),
            description: description.trim() || null,
            type,
            discountType,
            discountValue: Number(discountValue || 0),
            minimumSubtotal: Number(minimumSubtotal || 0),
            maximumDiscount: nullableNumber(maximumDiscount),
            startsAtUtc: toUtcDate(startDate, "start"),
            endsAtUtc: toUtcDate(endDate, "end"),
            timezone: "Asia/Bangkok",
            priority: Number(priority || 0),
            canStackWithCoupon,
            canStackWithPromotions,
            canCombineWithFlashSale,
            maximumTotalUses: nullableNumber(maximumTotalUses),
            maximumUsesPerCustomer: nullableNumber(maximumUsesPerCustomer),
            isActive,
            scheduleRules,
            scopes: buildPromotionScopes(scopes),
            customerScopes: buildCustomerScopes(customerScopes),
            conditions: conditions.map(stripDraftId),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(
            response,
            isEdit ? "บันทึก Promotion ไม่สำเร็จ" : "สร้าง Promotion ไม่สำเร็จ",
          ),
        );
      }

      const result = (await response.json().catch(() => null)) as { id?: string } | null;
      if (isEdit) {
        setSuccess("บันทึก Promotion สำเร็จ");
        router.refresh();
      } else {
        router.push(result?.id ? `/promotions/${result.id}` : "/promotions");
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "บันทึก Promotion ไม่สำเร็จ",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <StickyActionHeader
        eyebrow="Promotion"
        title={isEdit ? `แก้ไข ${initialData.name}` : "สร้าง Promotion"}
        description="Promotion คือส่วนลดอัตโนมัติ ลูกค้าไม่ต้องกรอกคูปอง สามารถผูกกับ Campaign หรือไม่ผูกก็ได้"
        feedback={
          error || validationMessage ? (
            <span className="text-destructive">{error || validationMessage}</span>
          ) : success ? (
            <span className="text-emerald-600">{success}</span>
          ) : null
        }
        actions={
          <>
            <Link
              href={isEdit ? `/promotions/${initialData.id}` : "/promotions"}
              className={buttonVariants({ variant: "ghost" })}
            >
              ยกเลิก
            </Link>
            <Button disabled={submitting || !!validationMessage} onClick={submit}>
              <Save />
              {submitting ? "กำลังบันทึก..." : "บันทึก Promotion"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <main className="space-y-6 xl:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="size-5 text-muted-foreground" />
                ข้อมูล Promotion
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Campaign">
                <NativeSelect
                  value={campaignId}
                  className="w-full"
                  onChange={(event) => setCampaignId(event.target.value)}
                >
                  <NativeSelectOption value="">ไม่ผูก Campaign</NativeSelectOption>
                  {campaigns.map((campaign) => (
                    <NativeSelectOption key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="ประเภท Promotion">
                <NativeSelect
                  value={type}
                  className="w-full"
                  onChange={(event) => updateType(event.target.value as PromotionType)}
                >
                  {enabledTypes.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="ชื่อ Promotion">
                <Input value={name} onValueChange={setName} placeholder="เช่น Tuesday Sale" />
              </Field>
              <Field label="Priority">
                <Input type="number" value={priority} onValueChange={setPriority} />
              </Field>
              <label className="space-y-2 sm:col-span-2">
                <span className="block text-xs font-bold">รายละเอียด</span>
                <Textarea
                  rows={4}
                  value={description}
                  placeholder="เช่น ลดทุกวันอังคาร"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-5 text-muted-foreground" />
                ส่วนลดและเงื่อนไขการใช้
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="รูปแบบส่วนลด">
                <NativeSelect
                  value={discountType}
                  className="w-full"
                  onChange={(event) => setDiscountType(event.target.value as PromotionDiscountType)}
                >
                  {discountTypes.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="มูลค่าส่วนลด">
                <Input
                  type="number"
                  min={0}
                  disabled={discountType === "free_shipping"}
                  value={discountValue}
                  onValueChange={setDiscountValue}
                />
              </Field>
              <Field label="ยอดสั่งซื้อขั้นต่ำ">
                <Input type="number" min={0} value={minimumSubtotal} onValueChange={setMinimumSubtotal} />
              </Field>
              <Field label="ส่วนลดสูงสุด">
                <Input
                  type="number"
                  min={0}
                  value={maximumDiscount}
                  placeholder="ไม่จำกัด"
                  onValueChange={setMaximumDiscount}
                />
              </Field>
              <Field label="จำนวนสิทธิ์ทั้งหมด">
                <Input
                  type="number"
                  min={1}
                  value={maximumTotalUses}
                  placeholder="ไม่จำกัด"
                  onValueChange={setMaximumTotalUses}
                />
              </Field>
              <Field label="ใช้ต่อคนสูงสุด">
                <Input
                  type="number"
                  min={1}
                  value={maximumUsesPerCustomer}
                  placeholder="ไม่จำกัด"
                  onValueChange={setMaximumUsesPerCustomer}
                />
              </Field>
            </CardContent>
          </Card>

          <ScheduleSection
            endDate={endDate}
            rules={scheduleRules}
            setEndDate={setEndDate}
            setRules={setScheduleRules}
            setStartDate={setStartDate}
            startDate={startDate}
          />

          <ScopeSection categories={categories} scopes={scopes} setScopes={setScopes} />
          <CustomerScopeSection scopes={customerScopes} setScopes={setCustomerScopes} />
          <ConditionSection conditions={conditions} setConditions={setConditions} />
        </main>

        <aside className="space-y-4 xl:col-span-4">
          <Card className="xl:sticky xl:top-32">
            <CardHeader>
              <CardTitle>สถานะและการใช้ร่วมกัน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="เปิดใช้งาน" checked={isActive} onCheckedChange={setIsActive} />
              <ToggleRow
                label="ใช้ร่วมกับคูปองได้"
                checked={canStackWithCoupon}
                onCheckedChange={setCanStackWithCoupon}
              />
              <ToggleRow
                label="ใช้ร่วมกับ Promotion อื่นได้"
                checked={canStackWithPromotions}
                onCheckedChange={setCanStackWithPromotions}
              />
              <ToggleRow
                label="ใช้ร่วมกับ Flash Sale ได้"
                checked={canCombineWithFlashSale}
                onCheckedChange={setCanCombineWithFlashSale}
              />
              <p className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                ถ้าผูก Campaign แล้ว Promotion จะถูกควบคุมด้วยสถานะและช่วงเวลาของ Campaign ด้วย
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function ScheduleSection({
  endDate,
  rules,
  setEndDate,
  setRules,
  setStartDate,
  startDate,
}: {
  endDate: string;
  rules: PromotionScheduleRule[];
  setEndDate: (value: string) => void;
  setRules: (rules: PromotionScheduleRule[]) => void;
  setStartDate: (value: string) => void;
  startDate: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-5 text-muted-foreground" />
          ช่วงเวลาและตารางทำงาน
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="วันที่เริ่มต้น">
            <Input type="date" value={startDate} onValueChange={setStartDate} />
          </Field>
          <Field label="วันที่สิ้นสุด">
            <Input type="date" min={startDate} value={endDate} onValueChange={setEndDate} />
          </Field>
        </div>
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2 xl:grid-cols-[190px_150px_140px_140px_auto]">
              <NativeSelect
                value={rule.type}
                className="w-full"
                onChange={(event) =>
                  setRules(
                    rules.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            type: event.target.value as PromotionScheduleRuleType,
                            dayOfWeek: event.target.value === "day_of_week" ? 1 : null,
                            dayOfMonth: event.target.value === "day_of_month" ? 1 : null,
                          }
                        : item,
                    ),
                  )
                }
              >
                {scheduleTypes.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {rule.type === "day_of_week" ? (
                <NativeSelect
                  value={String(rule.dayOfWeek ?? 1)}
                  className="w-full"
                  onChange={(event) =>
                    updateSchedule(index, rules, setRules, { dayOfWeek: Number(event.target.value) })
                  }
                >
                  {weekdays.map((day, dayIndex) => (
                    <NativeSelectOption key={day} value={dayIndex}>
                      {day}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : rule.type === "day_of_month" ? (
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={String(rule.dayOfMonth ?? 1)}
                  onValueChange={(value) =>
                    updateSchedule(index, rules, setRules, { dayOfMonth: Number(value || 1) })
                  }
                />
              ) : (
                <div className="flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                  ทุกวัน
                </div>
              )}
              <Input
                type="time"
                step={60}
                value={(rule.startsAtLocalTime ?? "00:00:00").slice(0, 5)}
                onValueChange={(value) =>
                  updateSchedule(index, rules, setRules, { startsAtLocalTime: normalizeTime(value) })
                }
              />
              <Input
                type="time"
                step={60}
                value={(rule.endsAtLocalTime ?? "23:59:00").slice(0, 5)}
                onValueChange={(value) =>
                  updateSchedule(index, rules, setRules, { endsAtLocalTime: normalizeTime(value) })
                }
              />
              {rules.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-self-start xl:justify-self-end"
                  onClick={() => setRules(rules.filter((_, i) => i !== index))}
                >
                  ลบ
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRules([
                ...rules,
                {
                  type: "daily_time",
                  dayOfWeek: null,
                  dayOfMonth: null,
                  startsAtLocalTime: "00:00:00",
                  endsAtLocalTime: "23:59:00",
                },
              ])
            }
          >
            เพิ่มช่วงเวลา
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ScopeSection({
  categories,
  scopes,
  setScopes,
}: {
  categories: CategoryOption[];
  scopes: ScopeDraft[];
  setScopes: (scopes: ScopeDraft[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>สินค้า/หมวดหมู่ที่ร่วมรายการ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scopes.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่เลือก scope = ใช้ได้กับทั้ง order</p>
        ) : null}
        {scopes.map((scope) => (
          <div key={scope.id} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_120px_auto]">
            <NativeSelect
              value={scope.type}
              className="w-full"
              onChange={(event) =>
                setScopes(
                  scopes.map((item) =>
                    item.id === scope.id
                      ? { id: item.id, type: event.target.value as PromotionScope["type"], isExclude: item.isExclude }
                      : item,
                  ),
                )
              }
            >
              <NativeSelectOption value="product">สินค้า</NativeSelectOption>
              <NativeSelectOption value="variant">Variant</NativeSelectOption>
              <NativeSelectOption value="sku">SKU</NativeSelectOption>
              <NativeSelectOption value="category">หมวดหมู่</NativeSelectOption>
            </NativeSelect>
            {scope.type === "category" ? (
              <NativeSelect
                value={scope.categoryName ?? ""}
                className="w-full"
                onChange={(event) =>
                  setScopes(scopes.map((item) => (item.id === scope.id ? { ...item, categoryName: event.target.value } : item)))
                }
              >
                <NativeSelectOption value="">เลือกหมวดหมู่</NativeSelectOption>
                {categories.map((category) => (
                  <NativeSelectOption key={category.id} value={category.name}>
                    {category.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <Input
                value={scopeValue(scope)}
                placeholder={scope.type === "sku" ? "เช่น TEA-RED" : "รหัสสินค้า / variant"}
                onValueChange={(value) =>
                  setScopes(scopes.map((item) => (item.id === scope.id ? scopeWithValue(item, value) : item)))
                }
              />
            )}
            <NativeSelect
              value={scope.isExclude ? "exclude" : "include"}
              className="w-full"
              onChange={(event) =>
                setScopes(scopes.map((item) => (item.id === scope.id ? { ...item, isExclude: event.target.value === "exclude" } : item)))
              }
            >
              <NativeSelectOption value="include">ใช้กับ</NativeSelectOption>
              <NativeSelectOption value="exclude">ยกเว้น</NativeSelectOption>
            </NativeSelect>
            <Button type="button" variant="ghost" onClick={() => setScopes(scopes.filter((item) => item.id !== scope.id))}>
              ลบ
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setScopes([...scopes, newScopeDraft()])}>
          เพิ่มสินค้า/หมวดหมู่
        </Button>
      </CardContent>
    </Card>
  );
}

function CustomerScopeSection({
  scopes,
  setScopes,
}: {
  scopes: CustomerScopeDraft[];
  setScopes: (scopes: CustomerScopeDraft[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ลูกค้าที่ใช้ได้</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scopes.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่เลือก = ลูกค้าทุกคนใช้ได้</p>
        ) : null}
        {scopes.map((scope) => (
          <div key={scope.id} className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
            <NativeSelect
              value={scope.type}
              className="w-full"
              onChange={(event) =>
                setScopes(
                  scopes.map((item) =>
                    item.id === scope.id
                      ? ({ id: item.id, type: event.target.value as CustomerScopeDraft["type"], customerId: "" } as CustomerScopeDraft)
                      : item,
                  ),
                )
              }
            >
              <NativeSelectOption value="new_customer">ลูกค้าใหม่</NativeSelectOption>
              <NativeSelectOption value="first_order">ออเดอร์แรก</NativeSelectOption>
              <NativeSelectOption value="existing_customer">ลูกค้าเก่า</NativeSelectOption>
              <NativeSelectOption value="customer">เลือกลูกค้ารายคน</NativeSelectOption>
            </NativeSelect>
            {scope.type === "customer" ? (
              <Input
                value={scope.customerId ?? ""}
                placeholder="รหัสลูกค้า"
                onValueChange={(customerId) =>
                  setScopes(
                    scopes.map((item) =>
                      item.id === scope.id
                        ? { id: item.id, type: "customer", customerId }
                        : item,
                    ),
                  )
                }
              />
            ) : (
              <div className="flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                ลูกค้า match อย่างใดอย่างหนึ่งก็ใช้ได้
              </div>
            )}
            <Button type="button" variant="ghost" onClick={() => setScopes(scopes.filter((item) => item.id !== scope.id))}>
              ลบ
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setScopes([...scopes, newCustomerScopeDraft()])}>
          เพิ่มกลุ่มลูกค้า
        </Button>
      </CardContent>
    </Card>
  );
}

function ConditionSection({
  conditions,
  setConditions,
}: {
  conditions: ConditionDraft[];
  setConditions: (conditions: ConditionDraft[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>เงื่อนไขเพิ่มเติม</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่กำหนดเงื่อนไขเพิ่มเติม</p>
        ) : null}
        {conditions.map((condition) => (
          <div key={condition.id} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
            <NativeSelect
              value={condition.type}
              className="w-full"
              onChange={(event) =>
                setConditions(
                  conditions.map((item) =>
                    item.id === condition.id
                      ? { ...item, type: event.target.value as EditablePromotionConditionType, value: "" }
                      : item,
                  ),
                )
              }
            >
              <NativeSelectOption value="sales_channel">ช่องทางขาย</NativeSelectOption>
              <NativeSelectOption value="shipping_channel">ช่องทางจัดส่ง</NativeSelectOption>
            </NativeSelect>
            <Input
              value={condition.value}
              placeholder="ระบุค่าเงื่อนไข"
              onValueChange={(value) =>
                setConditions(conditions.map((item) => (item.id === condition.id ? { ...item, value } : item)))
              }
            />
            <Button type="button" variant="ghost" onClick={() => setConditions(conditions.filter((item) => item.id !== condition.id))}>
              ลบ
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setConditions([...conditions, newConditionDraft()])}>
          เพิ่มเงื่อนไข
        </Button>
      </CardContent>
    </Card>
  );
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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
      <span className="text-sm font-semibold">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function updateSchedule(
  index: number,
  rules: PromotionScheduleRule[],
  setRules: (rules: PromotionScheduleRule[]) => void,
  patch: Partial<PromotionScheduleRule>,
) {
  setRules(rules.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)));
}

function stripDraftId<T extends { id: string }>(item: T): Omit<T, "id"> {
  const rest = { ...item };
  delete (rest as { id?: string }).id;
  return rest;
}

function buildPromotionScopes(scopes: ScopeDraft[]): PromotionScope[] {
  return scopes.map((scope) => ({
    type: scope.type,
    productId: scope.type === "product" ? scope.productId?.trim() || null : null,
    variantId: scope.type === "variant" ? scope.variantId?.trim() || null : null,
    sku: scope.type === "sku" ? scope.sku?.trim() || null : null,
    categoryName:
      scope.type === "category" ? scope.categoryName?.trim() || null : null,
    isExclude: scope.isExclude ?? false,
  }));
}

function buildCustomerScopes(scopes: CustomerScopeDraft[]): PromotionCustomerScope[] {
  return scopes.map((scope) =>
    scope.type === "customer"
      ? { type: "customer", customerId: scope.customerId.trim() }
      : { type: scope.type, customerId: null },
  );
}

function scopeValue(scope: PromotionScope) {
  if (scope.type === "product") return scope.productId?.trim() ?? "";
  if (scope.type === "variant") return scope.variantId?.trim() ?? "";
  if (scope.type === "sku") return scope.sku?.trim() ?? "";
  return scope.categoryName?.trim() ?? "";
}

function scopeWithValue(scope: ScopeDraft, value: string): ScopeDraft {
  if (scope.type === "product") return { ...scope, productId: value };
  if (scope.type === "variant") return { ...scope, variantId: value };
  if (scope.type === "sku") return { ...scope, sku: value };
  return { ...scope, categoryName: value };
}

function newScopeDraft(): ScopeDraft {
  return {
    id: `promotion-scope-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "product",
    productId: "",
    variantId: null,
    sku: null,
    categoryName: null,
    isExclude: false,
  };
}

function newCustomerScopeDraft(): CustomerScopeDraft {
  return {
    id: `promotion-customer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "new_customer",
    customerId: null,
  };
}

function newConditionDraft(): ConditionDraft {
  return {
    id: `promotion-condition-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "sales_channel",
    value: "",
  };
}

function editablePromotionConditions(conditions: PromotionCondition[]): ConditionDraft[] {
  return conditions
    .filter(isEditablePromotionCondition)
    .map((condition, index) => ({ ...condition, id: `condition-${index}` }));
}

function isEditablePromotionCondition(
  condition: PromotionCondition,
): condition is PromotionCondition & { type: EditablePromotionConditionType } {
  return condition.type === "sales_channel" || condition.type === "shipping_channel";
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value: string) {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
}

function toDateInput(value: string | null | undefined) {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function toUtcDate(value: string, edge: "start" | "end") {
  if (!value) return null;
  return new Date(
    `${value}T${edge === "start" ? "00:00:00" : "23:59:59"}Z`,
  ).toISOString();
}

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || fallback;
  } catch {
    return fallback;
  }
}
