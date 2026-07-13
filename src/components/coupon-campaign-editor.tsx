"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, Save, Tag } from "lucide-react";
import type { CouponCampaign } from "@/lib/admin-coupon-campaigns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StickyActionHeader } from "@/components/sticky-action-header";
import {
  DateShortcutSelector,
  type DateShortcut,
} from "@/components/date-shortcut-selector";

type CampaignInitialData = Pick<
  CouponCampaign,
  "id" | "name" | "description" | "startDate" | "endDate" | "isActive"
>;

export function CouponCampaignEditor({
  initialData,
}: {
  initialData?: CampaignInitialData;
}) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [startDate, setStartDate] = useState(
    initialData ? toDateInput(initialData.startDate) : todayInputValue(),
  );
  const [endDate, setEndDate] = useState(toDateInput(initialData?.endDate));
  const [activeDateShortcut, setActiveDateShortcut] =
    useState<DateShortcut | null>(
      initialData
        ? detectDateShortcut(toDateInput(initialData.startDate), toDateInput(initialData.endDate))
        : "unlimited",
    );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validationMessage = useMemo(() => {
    if (!name.trim()) return "กรอกชื่อ Campaign ก่อนบันทึก";
    if (name.trim().length > 200) return "ชื่อ Campaign ต้องไม่เกิน 200 ตัวอักษร";
    if (startDate && endDate && endDate < startDate) {
      return "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น";
    }
    return "";
  }, [endDate, name, startDate]);

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
          ? `/api/backend/admin/coupon-campaigns/${initialData.id}`
          : "/api/backend/admin/coupon-campaigns",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            startsAtUtc: toUtcDate(startDate, "start"),
            endsAtUtc: toUtcDate(endDate, "end"),
            isActive,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(
            response,
            isEdit ? "บันทึก Campaign ไม่สำเร็จ" : "สร้าง Campaign ไม่สำเร็จ",
          ),
        );
      }

      const result = (await response.json().catch(() => null)) as
        | { id?: string }
        | null;

      if (isEdit) {
        setSuccess("บันทึก Campaign สำเร็จ");
        router.refresh();
      } else {
        router.push(
          result?.id ? `/coupon-campaigns/${result.id}` : "/coupon-campaigns",
        );
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "บันทึก Campaign ไม่สำเร็จ",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <StickyActionHeader
        eyebrow="Coupon Campaign"
        title={isEdit ? `แก้ไข ${initialData.name}` : "สร้าง Coupon Campaign"}
        description="กำหนดชื่อ ช่วงเวลา และสถานะของชุดคูปอง"
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
              href={isEdit ? `/coupon-campaigns/${initialData.id}` : "/coupon-campaigns"}
              className={buttonVariants({ variant: "ghost" })}
            >
              ยกเลิก
            </Link>
            <Button disabled={submitting || !!validationMessage} onClick={submit}>
              <Save />
              {submitting ? "กำลังบันทึก..." : "บันทึก Campaign"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <main className="space-y-6 xl:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Tag className="size-5" />
                </span>
                <div>
                  <CardTitle>ข้อมูล Campaign</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ชื่อนี้จะแสดงในหน้าจัดการและตัวเลือก Bulk Generate
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="ชื่อ Campaign">
                <Input
                  value={name}
                  maxLength={200}
                  placeholder="เช่น VIP Mid-Year 2026"
                  onValueChange={setName}
                />
              </Field>
              <Field label="รายละเอียด">
                <Textarea
                  value={description}
                  rows={5}
                  placeholder="อธิบายวัตถุประสงค์หรือกลุ่มลูกค้าของ Campaign"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <CalendarDays className="size-5" />
                </span>
                <div>
                  <CardTitle>ช่วงเวลา Campaign</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    คูปองจะใช้ไม่ได้เมื่อ Campaign ยังไม่เริ่มหรือหมดอายุแล้ว
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DateShortcutSelector
                active={activeDateShortcut}
                onSelect={applyDateShortcut}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="วันที่เริ่มต้น">
                  <Input
                    type="date"
                    value={startDate}
                    onValueChange={updateStartDate}
                  />
                </Field>
                <Field label="วันที่สิ้นสุด">
                  <Input
                    type="date"
                    min={startDate}
                    value={endDate}
                    onValueChange={updateEndDate}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </main>

        <aside className="xl:col-span-4">
          <Card className="xl:sticky xl:top-32">
            <CardHeader>
              <CardTitle>สถานะ Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <div>
                  <p className="font-bold">
                    {isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    เมื่อปิดใช้งาน คูปองทั้งหมดใน Campaign จะใช้ไม่ได้
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
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

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold">{label}</span>
      {children}
    </label>
  );
}

function todayInputValue() {
  return toDateInputValue(new Date());
}

function addDaysInputValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInput(value: string | null | undefined) {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function detectDateShortcut(
  startDate: string,
  endDate: string,
): DateShortcut | null {
  if (!endDate) return "unlimited";
  if (!startDate) return null;

  const diffDays = Math.round(
    (new Date(`${endDate}T00:00:00`).getTime() -
      new Date(`${startDate}T00:00:00`).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "today";
  if (diffDays === 7) return "7days";
  if (diffDays === 30) return "30days";
  return null;
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
