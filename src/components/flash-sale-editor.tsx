"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Lock,
  Plus,
  Save,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";
import type { AdminProduct } from "@/lib/admin-products";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StickyActionHeader } from "@/components/sticky-action-header";
import { cn } from "@/lib/utils";

type FlashProduct = {
  id: string;
  name: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  zortSku: string;
  quantityLimit: number | null;
  reservedQuantity: number;
};

const LEGACY_SLOT_OPTIONS = [
  { start: "09:00", range: "09:00-12:00" },
  { start: "12:00", range: "12:00-15:00" },
  { start: "15:00", range: "15:00-18:00" },
  { start: "18:00", range: "18:00-21:00" },
  { start: "21:00", range: "21:00-23:59" },
] as const;

const FLASH_SALE_TIMEZONE = "Asia/Bangkok (UTC+7)";
const SLOT_RANGE_PATTERN = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = String(Math.floor(index / 4)).padStart(2, "0");
  const minute = String((index % 4) * 15).padStart(2, "0");
  return `${hour}:${minute}`;
});

type SlotFeedback = {
  tone: "error" | "success";
  text: string;
};

function normalizeSlot(slot: string) {
  const preset = LEGACY_SLOT_OPTIONS.find(
    (item) => item.start === slot || item.range === slot,
  );
  return preset?.range ?? slot;
}

function sortSlots(slots: string[]) {
  return [...new Set(slots)].sort();
}

function isValidSlotRange(slot: string) {
  if (!SLOT_RANGE_PATTERN.test(slot)) return false;
  const [start, end] = slot.split("-");
  return start < end;
}

function getGroupName(name: string) {
  return name.replace(/\s*\(สี[^)]*\)\s*$/u, "").trim();
}

export type FlashSaleInitialData = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  slots: string[];
  products: FlashProduct[];
};

export function FlashSaleEditor({
  products,
  initialData,
}: {
  products: AdminProduct[];
  initialData?: FlashSaleInitialData;
}) {
  const router = useRouter();
  const isEdit = !!initialData?.id;
  const [name, setName] = useState(initialData?.name ?? "");
  const [startDate, setStartDate] = useState(initialData?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialData?.endDate ?? "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? false);
  const [slots, setSlots] = useState<string[]>(
    initialData?.slots ? sortSlots(initialData.slots.map(normalizeSlot)) : [],
  );
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotFeedback, setSlotFeedback] = useState<SlotFeedback | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<FlashProduct[]>(
    initialData?.products ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingMode, setSavingMode] = useState<"draft" | "publish" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((product) => product.id)),
    [selectedProducts],
  );
  const hasBasics = Boolean(name.trim() && startDate && endDate);
  const hasSlots = slots.length > 0;
  const hasProducts = selectedProducts.length > 0;
  const selectedSlotText = slots.length ? slots.join(", ") : "-";
  const hasReservedQuota = selectedProducts.some(
    (product) => (product.reservedQuantity ?? 0) > 0,
  );
  const locked = isEdit && hasReservedQuota;

  function showError(message: string) {
    setError(message);
    window.requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current?.focus({ preventScroll: true });
    });
  }

  function toggleSlot(slot: string) {
    setSlots((prev) =>
      prev.includes(slot)
        ? prev.filter((item) => item !== slot)
        : sortSlots([...prev, slot]),
    );
    setSlotFeedback(null);
  }

  function addCustomSlot() {
    if (!slotStart || !slotEnd) {
      setSlotFeedback({
        tone: "error",
        text: "เลือกเวลาเริ่มและเวลาสิ้นสุดก่อนเพิ่มช่วงเวลา",
      });
      return;
    }

    const nextSlot = `${slotStart}-${slotEnd}`;
    if (!isValidSlotRange(nextSlot)) {
      setSlotFeedback({
        tone: "error",
        text: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม เช่น 10:00-11:30",
      });
      return;
    }
    if (slots.includes(nextSlot)) {
      setSlotFeedback({
        tone: "error",
        text: `ช่วงเวลา ${nextSlot} ถูกเพิ่มไว้แล้ว`,
      });
      return;
    }

    setSlots((prev) => sortSlots([...prev, nextSlot]));
    setSlotStart("");
    setSlotEnd("");
    setSlotFeedback({
      tone: "success",
      text: `เพิ่มช่วงเวลา ${nextSlot} แล้ว`,
    });
    setError("");
  }

  function toggleProduct(product: AdminProduct) {
    if (selectedIds.has(product.id)) {
      setSelectedProducts((prev) => prev.filter((item) => item.id !== product.id));
    } else {
      setSelectedProducts((prev) => [
        ...prev,
        {
          id: product.id,
          name: getGroupName(product.name),
          image: product.image,
          originalPrice: product.price,
          salePrice: Math.round(product.price * 0.85),
          zortSku: product.zortSku,
          quantityLimit: null,
          reservedQuantity: 0,
        },
      ]);
    }
  }

  function updateSalePrice(id: string, price: number) {
    setSelectedProducts((prev) =>
      prev.map((product) =>
        product.id === id ? { ...product, salePrice: price } : product,
      ),
    );
  }

  function updateQuantityLimit(id: string, limit: number | null) {
    setSelectedProducts((prev) =>
      prev.map((product) =>
        product.id === id ? { ...product, quantityLimit: limit } : product,
      ),
    );
  }

  function removeProduct(id: string) {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== id));
  }

  async function save(nextIsActive: boolean) {
    if (locked) {
      showError("ไม่สามารถแก้ไข Flash Sale นี้ได้ เนื่องจากมีออเดอร์จองโควตาอยู่");
      return;
    }
    if (!name.trim()) {
      showError("กรอกชื่อ Flash Sale ก่อน");
      return;
    }
    if (!startDate) {
      showError("เลือกวันเริ่มต้นก่อน");
      return;
    }
    if (!endDate) {
      showError("เลือกวันสิ้นสุดก่อน");
      return;
    }
    if (slots.length === 0) {
      showError("เพิ่ม time slot อย่างน้อย 1 อัน");
      return;
    }
    if (slots.some((slot) => !isValidSlotRange(slot))) {
      showError("ช่วงเวลา Flash Sale ต้องเป็นรูปแบบ HH:mm-HH:mm เช่น 09:00-12:00");
      return;
    }
    setError("");
    setSavingMode(nextIsActive ? "publish" : "draft");

    try {
      const body = {
        name,
        startDate,
        endDate,
        isActive: nextIsActive,
        slots,
        products: selectedProducts.map((product) => ({
          productId: product.id,
          salePrice: product.salePrice,
          quantityLimit: product.quantityLimit,
        })),
      };

      if (isEdit) {
        const res = await fetch(
          `/api/backend/admin/flash-sales/${initialData!.id}`,
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
        setIsActive(nextIsActive);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      } else {
        const res = await fetch("/api/backend/admin/flash-sales", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("สร้างไม่สำเร็จ");
        router.push("/flash-sale");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSavingMode(null);
    }
  }

  return (
    <div className="space-y-6">
      <StickyActionHeader
        eyebrow="Flash Sale"
        title={isEdit ? "แก้ไข Flash Sale" : "สร้าง Flash Sale ใหม่"}
        description="สร้างแคมเปญ Flash Sale พร้อมกำหนดเวลาและเลือกสินค้าราคาพิเศษ"
        feedback={locked ? "Flash Sale นี้มีออเดอร์จองโควตาอยู่แล้ว" : undefined}
        actions={
          <>
            <Link
              href="/flash-sale"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              ยกเลิก
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => save(false)}
              disabled={!!savingMode || saved || locked}
            >
              {savingMode === "draft" ? <SpinnerIcon /> : <Save />}
              {savingMode === "draft" ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              size="lg"
              onClick={() => save(true)}
              disabled={!!savingMode || saved || locked}
            >
              {savingMode === "publish" ? <SpinnerIcon /> : <Send />}
              {savingMode === "publish" ? "Publishing..." : "Publish"}
            </Button>
          </>
        }
      />

      {error ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          className="sticky top-3 z-30 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive shadow-lg outline-none ring-background focus-visible:ring-2"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-black">บันทึกไม่ได้</p>
            <p className="mt-0.5 font-medium">{error}</p>
          </div>
        </div>
      ) : null}

      {locked ? (
        <Alert variant="destructive">
          <Lock />
          <AlertDescription>
            Flash Sale นี้มีออเดอร์จองโควตาสินค้าอยู่แล้ว จึงไม่สามารถแก้ไขหรือลบได้
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="space-y-5">
          <StepCard
            step="1"
            title="ข้อมูลทั่วไป"
            icon={<ClipboardList />}
          >
            <div className="space-y-4">
              <Field label="ชื่อ Flash Sale" className="sm:col-span-2">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="เช่น Flash Sale สุดสัปดาห์"
                  className="h-11"
                  disabled={locked}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="วันเริ่มต้น">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-11"
                    disabled={locked}
                  />
                </Field>
                <Field label="วันสิ้นสุด">
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="h-11"
                    disabled={locked}
                  />
                </Field>
              </div>
            </div>
          </StepCard>

          <StepCard
            step="2"
            title="Time Slots"
            description={`กำหนดช่วงเวลาที่ Flash Sale จะเปิดในแต่ละวัน ตามเวลา ${FLASH_SALE_TIMEZONE}`}
            icon={<Clock />}
          >
            <div className="rounded-xl border bg-muted/10 p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-foreground">เวลาเริ่ม</span>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Select
                      value={slotStart}
                      onValueChange={(value) => {
                        setSlotStart(value ?? "");
                        setSlotFeedback(null);
                      }}
                      disabled={locked}
                    >
                      <SelectTrigger className="h-10 w-full pl-9">
                        <SelectValue placeholder="เลือกเวลาเริ่ม" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-foreground">เวลาสิ้นสุด</span>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Select
                      value={slotEnd}
                      onValueChange={(value) => {
                        setSlotEnd(value ?? "");
                        setSlotFeedback(null);
                      }}
                      disabled={locked}
                    >
                      <SelectTrigger className="h-10 w-full pl-9">
                        <SelectValue placeholder="เลือกเวลาสิ้นสุด" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </label>
                <Button
                  type="button"
                  onClick={addCustomSlot}
                  disabled={locked}
                  className="self-end"
                >
                  <Plus />
                  เพิ่มช่วงเวลา
                </Button>
              </div>

              {slotFeedback ? (
                <div
                  className={cn(
                    "mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                    slotFeedback.tone === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                >
                  {slotFeedback.tone === "error" ? (
                    <AlertCircle className="size-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="size-4 shrink-0" />
                  )}
                  <span>{slotFeedback.text}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-foreground">ช่วงเวลาที่เลือก</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ระบบจะส่งค่าเป็นรูปแบบ HH:mm-HH:mm
                  </p>
                </div>
                {slots.length ? (
                  <Badge variant="secondary">{slots.length} ช่วงเวลา</Badge>
                ) : null}
              </div>

              {slots.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <span
                      key={slot}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-700"
                    >
                      {slot}
                      <button
                        type="button"
                        aria-label={`ลบช่วงเวลา ${slot}`}
                        onClick={() => toggleSlot(slot)}
                        disabled={locked}
                        className="grid size-5 place-items-center rounded-full border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                  ยังไม่มีช่วงเวลา เลือกเวลาเริ่มและเวลาสิ้นสุดแล้วกดเพิ่มช่วงเวลา
                </div>
              )}
            </div>
          </StepCard>

          <StepCard
            step="3"
            title="Flash Sale Products"
            description="เลือกสินค้าและตั้งราคาพิเศษสำหรับแต่ละช่วงเวลา"
            icon={<ShoppingBag />}
          >
            {selectedProducts.length ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setPickerOpen(true)}
                  className="border-dashed"
                  disabled={locked}
                >
                  <Plus />
                  เลือกสินค้า
                </Button>

                <div className="mt-4 overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-muted text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">สินค้า</th>
                        <th className="px-4 py-3">ราคาปกติ</th>
                        <th className="px-4 py-3">ราคา Flash Sale</th>
                        <th className="px-4 py-3">ส่วนลด</th>
                        <th className="px-4 py-3">โควตา</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedProducts.map((product) => {
                        const discount = getDiscount(product);
                        const productLocked = locked || product.reservedQuantity > 0;
                        return (
                          <tr key={product.id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                                  <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    sizes="44px"
                                    className="object-contain p-1"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold">
                                    {product.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {product.zortSku}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground line-through">
                              ฿{product.originalPrice.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">฿</span>
                                <Input
                                  type="number"
                                  value={product.salePrice}
                                  min={0}
                                  max={product.originalPrice}
                                  onChange={(event) =>
                                    updateSalePrice(
                                      product.id,
                                      Number(event.target.value),
                                    )
                                  }
                                  className="h-9 w-28 font-semibold"
                                  disabled={productLocked}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="destructive">-{discount}%</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  min={0}
                                  value={product.quantityLimit ?? ""}
                                  placeholder="ไม่จำกัด"
                                  onChange={(event) =>
                                    updateQuantityLimit(
                                      product.id,
                                      event.target.value === ""
                                        ? null
                                        : Number(event.target.value),
                                    )
                                  }
                                  className="h-9 w-24 font-semibold"
                                  disabled={productLocked}
                                />
                                {product.reservedQuantity > 0 ? (
                                  <Badge variant="secondary" className="text-[10px]">
                                    จองแล้ว {product.reservedQuantity}
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProduct(product.id)}
                                className="text-muted-foreground hover:text-destructive"
                                disabled={productLocked}
                              >
                                ลบ
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/10 px-5 py-7">
                <div className="grid gap-4 text-center sm:grid-cols-[auto_1fr_auto] sm:items-center sm:text-left">
                  <Button
                    variant="outline"
                    onClick={() => setPickerOpen(true)}
                    className="justify-self-center border-dashed sm:justify-self-start"
                  >
                    <Plus />
                    เลือกสินค้า
                  </Button>
                  <div className="flex justify-center sm:justify-end">
                    <ShoppingBag className="size-14 text-muted-foreground/35" />
                  </div>
                  <div className="sm:order-2 sm:col-start-2 sm:row-start-1">
                    <p className="font-semibold">ยังไม่ได้เลือกสินค้า</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      เพิ่มสินค้าที่ต้องการราคาพิเศษในช่วงเวลา Flash Sale
                    </p>
                  </div>
                </div>
              </div>
            )}
          </StepCard>
        </main>

        <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">สรุป Flash Sale</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="ชื่อ" value={name || "ยังไม่ได้ตั้งชื่อ"} />
              <SummaryRow
                label="วันที่"
                value={
                  startDate
                    ? startDate === endDate || !endDate
                      ? formatDateTh(startDate)
                      : `${formatDateTh(startDate)} - ${formatDateTh(endDate)}`
                    : "-"
                }
              />
              <SummaryRow label="Time Slots" value={selectedSlotText} />
              <SummaryRow label="Timezone" value={FLASH_SALE_TIMEZONE} />
              <SummaryRow label="สถานะ" value={isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"} />
              <SummaryRow
                label="จำนวนสินค้า"
                value={`${selectedProducts.length} รายการ`}
                strong
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="size-4 text-muted-foreground" />
                <CardTitle className="text-base">สถานะการเผยแพร่</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center gap-2">
                  <ActiveStatusBadge isActive={isActive} />
                  <span className="text-xs text-muted-foreground">
                    {isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {isActive
                    ? "แสดงบนหน้า shop และใช้คำนวณราคาตามช่วงเวลาที่ตั้งไว้"
                    : "ยังไม่แสดงบนหน้า shop และยังไม่ถูกใช้คำนวณราคา"}
                </p>
                <div className="mt-4 space-y-3 border-t pt-4">
                  <ChecklistItem done={hasBasics}>
                    กรอกข้อมูลทั่วไปให้ครบถ้วน
                  </ChecklistItem>
                  <ChecklistItem done={hasSlots}>
                    เลือกช่วงเวลา Flash Sale
                  </ChecklistItem>
                  <ChecklistItem done={hasProducts}>
                    เพิ่มสินค้าและตั้งราคาพิเศษ
                  </ChecklistItem>
                  <ChecklistItem done={hasBasics && hasSlots && hasProducts}>
                    ตรวจสอบและบันทึกเพื่อเตรียมเผยแพร่
                  </ChecklistItem>
                </div>
              </div>

              <p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground">
                <CalendarDays className="mt-0.5 size-4 shrink-0" />
                Flash Sale จะแสดงเมื่อข้อมูลครบถ้วนและเปิดใช้งานอย่างน้อย 1 รายการ
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {pickerOpen ? (
        <ProductPicker
          products={products}
          selectedCount={selectedProducts.length}
          selectedIds={selectedIds}
          onClose={() => setPickerOpen(false)}
          onToggle={toggleProduct}
        />
      ) : null}
    </div>
  );
}

function ProductPicker({
  onClose,
  onToggle,
  products,
  selectedCount,
  selectedIds,
}: {
  onClose: () => void;
  onToggle: (product: AdminProduct) => void;
  products: AdminProduct[];
  selectedCount: number;
  selectedIds: Set<string>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              เลือกสินค้า
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              เลือกแล้ว {selectedCount} ชิ้น
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-border">
            {products.map((product) => {
              const selected = selectedIds.has(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onToggle(product)}
                  className={cn(
                    "flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/40",
                    selected && "bg-muted/40",
                  )}
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {getGroupName(product.name)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {product.zortSku} · ฿{product.price.toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-black transition",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {selected ? <Check className="size-3" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t px-5 py-4">
          <Button className="w-full" onClick={onClose}>
            ยืนยัน {selectedCount} สินค้า
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  children,
  description,
  icon,
  step,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  step: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
            {step}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="hidden text-muted-foreground sm:inline-flex [&_svg]:size-4">
                {icon}
              </span>
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            {description ? (
              <CardDescription className="mt-1">{description}</CardDescription>
            ) : null}
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
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function SpinnerIcon() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "default" : "outline"}>
      {isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
    </Badge>
  );
}

function SummaryRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "max-w-48 truncate text-right text-xs",
          strong ? "font-black text-foreground" : "font-semibold text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ChecklistItem({
  children,
  done,
}: {
  children: ReactNode;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {done ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : (
        <Circle className="size-4 text-muted-foreground/50" />
      )}
      <span>{children}</span>
    </div>
  );
}

function formatDateTh(dateStr: string) {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
    new Date(dateStr),
  );
}

function getDiscount(product: FlashProduct) {
  if (product.originalPrice <= 0) return 0;
  return Math.max(
    0,
    Math.round(
      ((product.originalPrice - product.salePrice) / product.originalPrice) * 100,
    ),
  );
}
