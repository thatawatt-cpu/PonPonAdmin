"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Plus,
  Save,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";
import type { AdminProduct } from "@/lib/admin-products";
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
import { cn } from "@/lib/utils";

type FlashProduct = {
  id: string;
  name: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  zortSku: string;
};

const PRESET_SLOTS = ["09:00", "12:00", "15:00", "18:00", "21:00"];

function getGroupName(name: string) {
  return name.replace(/\s*\(สี[^)]*\)\s*$/u, "").trim();
}

export type FlashSaleInitialData = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
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
  const [slots, setSlots] = useState<string[]>(
    initialData?.slots ?? ["09:00", "12:00", "15:00"],
  );
  const [customSlot, setCustomSlot] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<FlashProduct[]>(
    initialData?.products ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((product) => product.id)),
    [selectedProducts],
  );
  const hasBasics = Boolean(name.trim() && startDate && endDate);
  const hasSlots = slots.length > 0;
  const hasProducts = selectedProducts.length > 0;
  const selectedSlotText = slots.length ? slots.join(", ") : "-";

  function toggleSlot(slot: string) {
    setSlots((prev) =>
      prev.includes(slot)
        ? prev.filter((item) => item !== slot)
        : [...prev, slot].sort(),
    );
  }

  function addCustomSlot() {
    const trimmed = customSlot.trim();
    if (!trimmed || slots.includes(trimmed)) return;
    setSlots((prev) => [...prev, trimmed].sort());
    setCustomSlot("");
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

  function removeProduct(id: string) {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== id));
  }

  async function save() {
    if (!name.trim()) {
      setError("กรอกชื่อ Flash Sale ก่อน");
      return;
    }
    if (!startDate) {
      setError("เลือกวันเริ่มต้นก่อน");
      return;
    }
    if (!endDate) {
      setError("เลือกวันสิ้นสุดก่อน");
      return;
    }
    if (slots.length === 0) {
      setError("เพิ่ม time slot อย่างน้อย 1 อัน");
      return;
    }
    if (selectedProducts.length === 0) {
      setError("เลือกสินค้าอย่างน้อย 1 ชิ้น");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const body = {
        name,
        startDate,
        endDate,
        slots,
        products: selectedProducts.map((product) => ({
          productId: product.id,
          salePrice: product.salePrice,
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
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">
            Flash Sale
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            {isEdit ? "แก้ไข Flash Sale" : "สร้าง Flash Sale ใหม่"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            สร้างแคมเปญ Flash Sale พร้อมกำหนดเวลาและเลือกสินค้าราคาพิเศษ
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/flash-sale"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            ยกเลิก
          </Link>
          <Button size="lg" onClick={save} disabled={saving || saved}>
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
                  : "บันทึก Flash Sale"}
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
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
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="วันเริ่มต้น">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-11"
                  />
                </Field>
                <Field label="วันสิ้นสุด">
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="h-11"
                  />
                </Field>
              </div>
            </div>
          </StepCard>

          <StepCard
            step="2"
            title="Time Slots"
            description="กำหนดช่วงเวลาที่ Flash Sale จะเปิดในแต่ละวัน"
            icon={<Clock />}
          >
            <div className="flex flex-wrap gap-3">
              {PRESET_SLOTS.map((slot) => {
                const selected = slots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={cn(
                      "inline-flex h-9 min-w-24 items-center justify-between gap-3 rounded-lg border px-3 text-sm font-black transition",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {slot}
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full",
                        selected ? "bg-white text-primary" : "bg-muted",
                      )}
                    >
                      {selected ? <Check className="size-3" /> : <Plus className="size-3" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {slots.filter((slot) => !PRESET_SLOTS.includes(slot)).length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {slots
                  .filter((slot) => !PRESET_SLOTS.includes(slot))
                  .map((slot) => (
                    <span
                      key={slot}
                      className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
                    >
                      {slot}
                      <button
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className="grid size-5 place-items-center rounded-full bg-white/20 hover:bg-white/30"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="time"
                  value={customSlot}
                  onChange={(event) => setCustomSlot(event.target.value)}
                  className="h-10 pl-9"
                />
              </div>
              <Button type="button" variant="outline" onClick={addCustomSlot}>
                <Plus />
                เพิ่มช่วงเวลา
              </Button>
            </div>

            {slots.length ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 className="size-4" />
                เลือกแล้ว {slots.length} ช่วงเวลา: {selectedSlotText}
              </p>
            ) : null}
          </StepCard>

          <StepCard
            step="3"
            title="สินค้าในแฟลชเซล"
            description="เลือกสินค้าและตั้งราคาพิเศษสำหรับแต่ละช่วงเวลา"
            icon={<ShoppingBag />}
          >
            {selectedProducts.length ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setPickerOpen(true)}
                  className="border-dashed"
                >
                  <Plus />
                  เลือกสินค้า
                </Button>

                <div className="mt-4 overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-muted text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">สินค้า</th>
                        <th className="px-4 py-3">ราคาปกติ</th>
                        <th className="px-4 py-3">ราคา Flash Sale</th>
                        <th className="px-4 py-3">ส่วนลด</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedProducts.map((product) => {
                        const discount = getDiscount(product);
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
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="destructive">-{discount}%</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProduct(product.id)}
                                className="text-muted-foreground hover:text-destructive"
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
                  <Badge variant="secondary">Draft</Badge>
                  <span className="text-xs text-muted-foreground">
                    ยังไม่พร้อมเผยแพร่
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  บันทึกแบบร่างไว้ก่อน คุณค่อยเผยแพร่ภายหลังได้
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
