"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ExternalLink,
  GripVertical,
  ImagePlus,
  Monitor,
  Plus,
  Save,
  Search,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  MAX_HOME_SLIDES,
  type HomeSlide,
  type HomeSlideStatus,
} from "@/lib/home-slides";
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
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type EditableHomeSlide = HomeSlide & {
  isNew?: boolean;
  persistedSortOrder?: number;
};

type SlidePayload = {
  image: string;
  badge: string;
  title: string;
  description: string;
  linkUrl: string;
  ctaLabel: string;
  status: HomeSlideStatus;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
};

type SlideFilter = "all" | "active" | "draft" | "inactive" | "expired";

const statusLabel: Record<HomeSlideStatus, string> = {
  0: "แบบร่าง",
  1: "กำลังแสดง",
  2: "ปิดใช้งาน",
};

const filterLabel: Record<SlideFilter, string> = {
  all: "ทั้งหมด",
  active: "กำลังแสดง",
  draft: "แบบร่าง",
  inactive: "ปิดใช้งาน",
  expired: "หมดเวลาแล้ว",
};

export function HomeSlidesManager({
  initialError,
  initialSlides,
}: {
  initialError?: string;
  initialSlides: HomeSlide[];
}) {
  const [slides, setSlides] = useState<EditableHomeSlide[]>(
    initialSlides.map((slide) => normalizeSlide(slide)),
  );
  const [activeId, setActiveId] = useState(initialSlides[0]?.id ?? "");
  const [filter, setFilter] = useState<SlideFilter>("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(initialError ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAction, setSavedAction] = useState<"slide" | "order" | null>(null);
  const [uploadingImageIds, setUploadingImageIds] = useState<Set<string>>(
    () => new Set(),
  );
  const objectUrlsRef = useRef<string[]>([]);

  const activeSlide = slides.find((slide) => slide.id === activeId) ?? slides[0];
  const activeSlotCount = slides.filter(countsTowardSlideLimit).length;
  const activeIndex = activeSlide
    ? slides.findIndex((slide) => slide.id === activeSlide.id)
    : -1;
  const isMaxed = activeSlotCount >= MAX_HOME_SLIDES;
  const hasUnsavedSlides = slides.some((slide) => slide.isNew);
  const filterOptions = useMemo(() => getFilterOptions(slides), [slides]);
  const filteredSlides = useMemo(
    () =>
      slides.filter(
        (slide) => matchesFilter(slide, filter) && matchesQuery(slide, query),
      ),
    [filter, query, slides],
  );

  const titleMissing = Boolean(activeSlide && !activeSlide.title.trim());
  const imageMissing = Boolean(activeSlide && !activeSlide.image.trim());
  const invalidUrl = Boolean(
    activeSlide?.linkUrl.trim() && !isValidDestination(activeSlide.linkUrl),
  );
  const activeImageUploading = Boolean(
    activeSlide && uploadingImageIds.has(activeSlide.id),
  );

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function updateSlide(id: string, patch: Partial<EditableHomeSlide>) {
    setSavedAction(null);
    setSlides((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)),
    );
  }

  function updateSlideWithLimitCheck(
    slide: EditableHomeSlide,
    patch: Partial<EditableHomeSlide>,
  ) {
    const nextSlide = { ...slide, ...patch };
    const currentCounts = countsTowardSlideLimit(slide);
    const nextCounts = countsTowardSlideLimit(nextSlide);

    if (!currentCounts && nextCounts && activeSlotCount >= MAX_HOME_SLIDES) {
      setMessage(`เพิ่มได้สูงสุด ${MAX_HOME_SLIDES} สไลด์`);
      return;
    }

    updateSlide(slide.id, patch);
    setMessage("");
  }

  function addSlide() {
    if (isMaxed) {
      setMessage(`เพิ่มได้สูงสุด ${MAX_HOME_SLIDES} สไลด์`);
      return;
    }

    const nextSortOrder = Math.max(0, ...slides.map((slide) => slide.sortOrder)) + 1;
    const next = emptySlide(nextSortOrder);
    setSlides((current) => [...current, next]);
    setActiveId(next.id);
    setFilter("all");
    setSavedAction(null);
    setMessage("");
  }

  async function removeSlide(id: string) {
    const target = slides.find((slide) => slide.id === id);
    if (!target) return;

    const confirmed = window.confirm("ลบสไลด์นี้ออกจากระบบอย่างถาวร?");
    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    if (!target.isNew) {
      const response = await fetch(`/api/backend/admin/home-slides/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setSaving(false);
        setMessage(await response.text());
        return;
      }
    }

    setSlides((current) => {
      const next = current
        .filter((slide) => slide.id !== id)
        .map((slide, index) => ({ ...slide, sortOrder: index + 1 }));

      if (activeId === id) {
        setActiveId(next[0]?.id ?? "");
      }

      return next;
    });
    setSaving(false);
    setMessage("ลบสไลด์แล้ว");
  }

  function moveSlide(id: string, direction: -1 | 1) {
    setSavedAction(null);
    setSlides((current) => {
      const index = current.findIndex((slide) => slide.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

      return next.map((slide, order) => ({ ...slide, sortOrder: order + 1 }));
    });
  }

  async function saveSlide(slide: EditableHomeSlide) {
    if (uploadingImageIds.has(slide.id)) {
      setMessage("กำลังอัปโหลดรูปไป Supabase กรุณารอสักครู่ก่อนบันทึก");
      return;
    }

    if (isBlobImage(slide.image)) {
      setMessage("รูปสไลด์ยังเป็นไฟล์ชั่วคราว กรุณาอัปโหลดให้เสร็จก่อนบันทึก");
      return;
    }

    if (
      countsTowardSlideLimit(slide) &&
      slides.filter(
        (item) => item.id !== slide.id && countsTowardSlideLimit(item),
      ).length >= MAX_HOME_SLIDES
    ) {
      setMessage(`เพิ่มได้สูงสุด ${MAX_HOME_SLIDES} สไลด์`);
      return;
    }

    setSaving(true);
    setMessage("");

    const response = await fetch(
      slide.isNew
        ? "/api/backend/admin/home-slides"
        : `/api/backend/admin/home-slides/${slide.id}`,
      {
        body: JSON.stringify(toPayload(slide)),
        headers: { "content-type": "application/json" },
        method: slide.isNew ? "POST" : "PATCH",
      },
    );

    setSaving(false);

    if (!response.ok) {
      setMessage(await response.text());
      return;
    }

    const saved = normalizeSlide((await response.json()) as HomeSlide);
    setSlides((current) =>
      current.map((item) =>
        item.id === slide.id
          ? slide.isNew
            ? saved
            : { ...saved, sortOrder: item.sortOrder }
          : item,
      ),
    );
    setActiveId(saved.id);
    setSavedAction("slide");
    setMessage("บันทึกแล้ว");
  }

  async function saveOrder() {
    if (hasUnsavedSlides) {
      setMessage("บันทึกสไลด์ใหม่ก่อนจัดลำดับ");
      return;
    }

    setSaving(true);
    setMessage("");

    const response = await fetch("/api/backend/admin/home-slides/reorder", {
      body: JSON.stringify({
        slides: slides.map((slide) => ({
          id: slide.id,
          sortOrder: slide.sortOrder,
        })),
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });

    setSaving(false);

    if (!response.ok) {
      setMessage(await response.text());
      return;
    }

    const savedSlides = ((await response.json()) as HomeSlide[]).map(normalizeSlide);
    setSlides(savedSlides);
    setActiveId(savedSlides[0]?.id ?? "");
    setSavedAction("order");
    setMessage("บันทึกลำดับแล้ว");
  }

  async function uploadSlideImage(
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previousImage = slides.find((slide) => slide.id === id)?.image ?? "";
    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);
    updateSlide(id, { image: previewUrl });
    setUploadingImageIds((current) => new Set(current).add(id));
    setMessage("กำลังอัปโหลดรูปไป Supabase...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/backend/admin/uploads", {
        body: formData,
        method: "POST",
      });

      event.target.value = "";

      if (!response.ok) {
        updateSlide(id, { image: previousImage });
        setMessage(await response.text());
        return;
      }

      const payload = (await response.json()) as { url: string };
      updateSlide(id, { image: payload.url });
      setMessage("อัปโหลดรูปแล้ว");
    } catch (error) {
      updateSlide(id, { image: previousImage });
      setMessage(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploadingImageIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-5">
      <header className="sticky top-0 z-20 -mx-4 border-b bg-background/85 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-black uppercase text-muted-foreground">
                Homepage
              </p>
              <Badge variant="secondary">
                {activeSlotCount}/{MAX_HOME_SLIDES}
              </Badge>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-normal">
              จัดการสไลด์หน้าแรก
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              แก้ไขสไลด์ Hero Banner ที่แสดงบนหน้าร้าน PonPon
            </p>
            {isMaxed ? (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                เพิ่มสไลด์ครบ {MAX_HOME_SLIDES} รายการแล้ว
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="http://localhost:3100"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ExternalLink />
              Preview หน้าแรก
            </a>
            <Button disabled={isMaxed} onClick={addSlide}>
              <Plus />
              เพิ่มสไลด์
            </Button>
          </div>
        </div>
      </header>

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <Card className="xl:sticky xl:top-28 xl:max-h-[calc(100vh-8rem)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">สไลด์ทั้งหมด</CardTitle>
                <CardDescription>เลือกสไลด์เพื่อแก้ไข</CardDescription>
              </div>
              <Badge variant="outline">{slides.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาสไลด์"
                className="pl-8"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
                    filter === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      filter === option.value ? "bg-white/20" : "bg-muted"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredSlides.length ? (
                filteredSlides.map((slide) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveId(slide.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      slide.id === activeSlide?.id
                        ? "border-primary bg-muted"
                        : "border-border bg-card hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {slide.image ? (
                          <Image
                            src={slide.image}
                            alt={slide.title || "Homepage slide"}
                            fill
                            unoptimized={isUnoptimizedImage(slide.image)}
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <span className="grid h-full place-items-center text-muted-foreground">
                            <ImagePlus className="size-5" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {slide.title || "ยังไม่มีหัวข้อ"}
                          </span>
                          <span className="shrink-0 text-xs font-bold text-muted-foreground">
                            #{slide.sortOrder}
                          </span>
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge slide={slide} />
                          {slide.isNew ? (
                            <span className="text-[11px] text-muted-foreground">
                              ยังไม่บันทึก
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1.5 block truncate text-xs text-muted-foreground">
                          {getSlideScheduleText(slide)}
                        </span>
                        {slide.linkUrl ? (
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {slide.linkUrl}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </button>
                ))
              ) : slides.length ? (
                <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-center">
                  <p className="text-sm font-semibold">ไม่พบสไลด์ในตัวกรองนี้</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setFilter("all");
                      setQuery("");
                    }}
                  >
                    ดูทั้งหมด
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-center">
                  <ImagePlus className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">
                    ยังไม่มีสไลด์หน้าแรก
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    เพิ่มสไลด์แรกเพื่อเริ่มจัดหน้าแรกของร้าน
                  </p>
                  <Button className="mt-4" size="sm" onClick={addSlide}>
                    <Plus />
                    เพิ่มสไลด์แรก
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {activeSlide ? (
          <>
            <main className="space-y-5">
              <SlideEditorCard
                title="ข้อมูลสไลด์"
                description="เนื้อหาหลักและสถานะการแสดงผล"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="สถานะ">
                    <NativeSelect
                      value={String(activeSlide.status)}
                      onChange={(event) =>
                        updateSlideWithLimitCheck(activeSlide, {
                          status: Number(event.target.value) as HomeSlideStatus,
                        })
                      }
                    >
                      <option value="0">แบบร่าง</option>
                      <option value="1">กำลังแสดง</option>
                      <option value="2">ปิดใช้งาน</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Badge">
                    <Input
                      value={activeSlide.badge}
                      onChange={(event) =>
                        updateSlide(activeSlide.id, { badge: event.target.value })
                      }
                      placeholder="SALE, FLASH SALE, GIFT"
                    />
                  </Field>
                  <Field
                    label="หัวข้อ"
                    className="sm:col-span-2"
                    helper={titleMissing ? "กรุณากรอกหัวข้อสไลด์" : undefined}
                    invalid={titleMissing}
                  >
                    <Input
                      value={activeSlide.title}
                      onChange={(event) =>
                        updateSlide(activeSlide.id, { title: event.target.value })
                      }
                      aria-invalid={titleMissing}
                    />
                  </Field>
                  <Field label="รายละเอียดสั้น" className="sm:col-span-2">
                    <Textarea
                      value={activeSlide.description}
                      onChange={(event) =>
                        updateSlide(activeSlide.id, {
                          description: event.target.value,
                        })
                      }
                      className="min-h-20"
                    />
                  </Field>
                  <Field
                    label="ข้อความปุ่ม"
                    className="sm:col-span-2"
                    helper="เช่น ช้อปเลย, ดูดีล, ซื้อเลย"
                  >
                    <Input
                      value={activeSlide.ctaLabel ?? ""}
                      onChange={(event) =>
                        updateSlide(activeSlide.id, {
                          ctaLabel: event.target.value,
                        })
                      }
                      placeholder="ช้อปเลย"
                    />
                  </Field>
                  <Field
                    label="ลิงก์ปลายทาง"
                    className="sm:col-span-2"
                    helper={
                      invalidUrl
                        ? "ลิงก์ควรขึ้นต้นด้วย / หรือ https://"
                        : "เช่น /products หรือ /products/p1968"
                    }
                    invalid={invalidUrl}
                  >
                    <Input
                      value={activeSlide.linkUrl}
                      onChange={(event) =>
                        updateSlide(activeSlide.id, {
                          linkUrl: event.target.value,
                        })
                      }
                      aria-invalid={invalidUrl}
                    />
                  </Field>
                </div>
              </SlideEditorCard>

              <SlideEditorCard
                title="รูปภาพสไลด์"
                description="อัปโหลดภาพหลักสำหรับ Hero Banner"
              >
                <UploadBox
                  image={activeSlide.image}
                  missing={imageMissing}
                  uploading={activeImageUploading}
                  onChange={(event) => uploadSlideImage(activeSlide.id, event)}
                />
              </SlideEditorCard>

              <SlideEditorCard
                title="ช่วงเวลาแสดงผล"
                description="กำหนดเวลาเริ่มและสิ้นสุดได้ตามแคมเปญ"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="เริ่มแสดง">
                    <Input
                      type="datetime-local"
                      value={activeSlide.startsAt ?? ""}
                      onChange={(event) =>
                        updateSlide(activeSlide.id, {
                          startsAt: event.target.value || null,
                        })
                      }
                    />
                  </Field>
                  <Field label="สิ้นสุด">
                    <Input
                      type="datetime-local"
                      value={activeSlide.endsAt ?? ""}
                      onChange={(event) =>
                        updateSlideWithLimitCheck(activeSlide, {
                          endsAt: event.target.value || null,
                        })
                      }
                    />
                  </Field>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  ถ้าไม่กำหนดเวลา สไลด์จะแสดงตามสถานะที่เลือก
                </p>
              </SlideEditorCard>

              <div className="sticky bottom-4 z-10 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {activeSlide.isNew
                      ? "มีการแก้ไขที่ยังไม่บันทึก"
                      : message === "บันทึกแล้ว"
                        ? "บันทึกแล้ว"
                        : "พร้อมบันทึกการเปลี่ยนแปลง"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveId(slides[0]?.id ?? "")}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      disabled={saving || activeImageUploading}
                      onClick={() => saveSlide(activeSlide)}
                    >
                      <Save />
                      {saving
                        ? "กำลังบันทึก..."
                        : activeImageUploading
                          ? "กำลังอัปโหลดรูป..."
                          : "บันทึกสไลด์"}
                    </Button>
                  </div>
                </div>
              </div>
            </main>

            <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">ตัวอย่างสไลด์</CardTitle>
                  <CardDescription>ตรวจ Desktop และ Mobile ก่อนเผยแพร่</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="desktop">
                    <TabsList className="w-full">
                      <TabsTrigger value="desktop" className="flex-1">
                        <Monitor />
                        Desktop
                      </TabsTrigger>
                      <TabsTrigger value="mobile" className="flex-1">
                        <Smartphone />
                        Mobile
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="desktop" className="mt-4">
                      <SlidePreview slide={activeSlide} mode="desktop" />
                    </TabsContent>
                    <TabsContent value="mobile" className="mt-4">
                      <SlidePreview slide={activeSlide} mode="mobile" />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">สถานะการเผยแพร่</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <SummaryRow label="สถานะ" value={<StatusBadge slide={activeSlide} />} />
                  <SummaryRow label="ลำดับ" value={`#${activeSlide.sortOrder}`} />
                  <SummaryRow
                    label="ช่วงเวลา"
                    value={getSlidePublishState(activeSlide)}
                  />
                  <SummaryRow
                    label="ลิงก์"
                    value={activeSlide.linkUrl || "ยังไม่กำหนด"}
                  />
                  <SummaryRow
                    label="อัปเดตล่าสุด"
                    value={formatDateTime(activeSlide.updatedAt) || "-"}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">จัดการลำดับ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      disabled={activeIndex <= 0}
                      onClick={() => moveSlide(activeSlide.id, -1)}
                    >
                      <ArrowUp />
                      ขึ้น
                    </Button>
                    <Button
                      variant="outline"
                      disabled={activeIndex < 0 || activeIndex >= slides.length - 1}
                      onClick={() => moveSlide(activeSlide.id, 1)}
                    >
                      <ArrowDown />
                      ลง
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={saving}
                    onClick={saveOrder}
                  >
                    <GripVertical />
                    บันทึกลำดับ
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    ลบสไลด์นี้ออกจากระบบอย่างถาวร
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={saving}
                    onClick={() => removeSlide(activeSlide.id)}
                  >
                    <Trash2 />
                    ลบสไลด์
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </>
        ) : (
          <section className="xl:col-span-2 rounded-xl border border-dashed bg-card p-12 text-center">
            <ImagePlus className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-4 font-semibold">ยังไม่มีสไลด์หน้าแรก</p>
            <p className="mt-1 text-sm text-muted-foreground">
              เพิ่มสไลด์แรกเพื่อเริ่มจัดหน้าแรกของร้าน
            </p>
            <Button className="mt-4" disabled={isMaxed} onClick={addSlide}>
              <Plus />
              เพิ่มสไลด์แรก
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}

function SlidePreview({
  mode,
  slide,
}: {
  mode: "desktop" | "mobile";
  slide: EditableHomeSlide;
}) {
  const isMobile = mode === "mobile";

  return (
    <section
      className={`relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-border ${
        isMobile ? "mx-auto aspect-[3/2] w-full max-w-80" : "aspect-video"
      }`}
    >
      {slide.image ? (
        <Image
          src={slide.image}
          alt={slide.title || "Homepage slide preview"}
          fill
          unoptimized={isUnoptimizedImage(slide.image)}
          className={isMobile ? "object-cover" : "object-cover"}
          sizes={isMobile ? "256px" : "360px"}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/55 to-zinc-950/10" />
      <div
        className={`relative flex h-full items-center ${
          isMobile ? "px-5 py-6" : "px-5 py-4"
        }`}
      >
        <div className={isMobile ? "max-w-44 text-white" : "max-w-52 text-white"}>
          <span
            className={`inline-flex rounded-md bg-white font-black uppercase text-red-600 ${
              isMobile ? "px-2 py-1 text-[10px]" : "px-2 py-0.5 text-[9px]"
            }`}
          >
            {slide.badge || "SALE"}
          </span>
          <h2
            className={`font-black leading-tight tracking-normal text-white ${
              isMobile ? "mt-2 line-clamp-3 text-2xl" : "mt-1.5 line-clamp-2 text-lg"
            }`}
          >
            {slide.title || "หัวข้อสไลด์"}
          </h2>
          <p
            className={`font-semibold text-white/85 ${
              isMobile ? "mt-2 line-clamp-2 text-xs" : "mt-1.5 line-clamp-1 text-[11px]"
            }`}
          >
            {slide.description || "รายละเอียดสั้นของสไลด์"}
          </p>
          <span
            className={`inline-flex rounded-full bg-white font-black text-red-600 ${
              isMobile ? "mt-4 px-4 py-2 text-xs" : "mt-2.5 px-3 py-1.5 text-[11px]"
            }`}
          >
            {slide.ctaLabel?.trim() || "ช้อปเลย"}
            <ArrowRight className="ml-2 size-4" />
          </span>
        </div>
      </div>
    </section>
  );
}

function UploadBox({
  image,
  missing,
  onChange,
  uploading,
}: {
  image: string;
  missing: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted">
        {image ? (
          <Image
            src={image}
            alt="รูปภาพสไลด์"
            fill
            unoptimized={isUnoptimizedImage(image)}
            className="object-cover"
            sizes="220px"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <ImagePlus className="size-8" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-3">
        <div>
          <p className="text-sm font-semibold">รูปพื้นหลังสไลด์</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            แนะนำใช้อัตราส่วน 16:9 สำหรับเดสก์ท็อป และตรวจสอบการแสดงผลบนมือถือก่อนเผยแพร่
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            รองรับ JPG, PNG, WebP
          </p>
          {missing ? (
            <p className="mt-2 text-xs font-medium text-destructive">
              กรุณาอัปโหลดรูปสไลด์
            </p>
          ) : null}
        </div>
        <label>
          <span
            className={`inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-semibold transition ${
              uploading
                ? "cursor-wait opacity-70"
                : "cursor-pointer hover:bg-muted"
            }`}
          >
            <ImagePlus className="size-4" />
            {uploading
              ? "กำลังอัปโหลด..."
              : image
                ? "เปลี่ยนรูปภาพ"
                : "อัปโหลดรูป"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={onChange}
          />
        </label>
      </div>
    </div>
  );
}

function SlideEditorCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  children,
  className = "",
  helper,
  invalid = false,
  label,
}: {
  children: ReactNode;
  className?: string;
  helper?: string;
  invalid?: boolean;
  label: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
      {helper ? (
        <p
          className={`text-xs ${
            invalid ? "font-medium text-destructive" : "text-muted-foreground"
          }`}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ slide }: { slide: EditableHomeSlide }) {
  const expired = isSlideExpired(slide);
  const label = expired ? "หมดเวลาแล้ว" : statusLabel[slide.status];

  if (expired) {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700">
        {label}
      </Badge>
    );
  }

  if (slide.status === 1) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        {label}
      </Badge>
    );
  }

  if (slide.status === 2) {
    return <Badge variant="outline">{label}</Badge>;
  }

  return <Badge variant="secondary">{label}</Badge>;
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="max-w-[12rem] truncate text-right font-medium">{value}</span>
      </div>
      <Separator />
    </div>
  );
}

function getFilterOptions(slides: EditableHomeSlide[]) {
  const values: SlideFilter[] = ["all", "active", "draft", "inactive", "expired"];

  return values.map((value) => ({
    count:
      value === "all"
        ? slides.length
        : slides.filter((slide) => matchesFilter(slide, value)).length,
    label: filterLabel[value],
    value,
  }));
}

function matchesFilter(slide: EditableHomeSlide, filter: SlideFilter) {
  if (filter === "all") return true;
  if (filter === "expired") return isSlideExpired(slide);
  if (isSlideExpired(slide)) return false;
  if (filter === "active") return slide.status === 1;
  if (filter === "draft") return slide.status === 0;
  return slide.status === 2;
}

function matchesQuery(slide: EditableHomeSlide, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [slide.title, slide.badge, slide.description, slide.linkUrl, slide.ctaLabel]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalized));
}

function getSlideScheduleText(slide: EditableHomeSlide) {
  const startsAt = formatDateTime(slide.startsAt);
  const endsAt = formatDateTime(slide.endsAt);

  if (startsAt && endsAt) return `${startsAt} - ${endsAt}`;
  if (startsAt) return `เริ่ม ${startsAt}`;
  if (endsAt) return `ถึง ${endsAt}`;

  return "ไม่จำกัดเวลา";
}

function getSlidePublishState(slide: EditableHomeSlide) {
  if (!slide.startsAt && !slide.endsAt) return "ยังไม่กำหนดเวลา";
  if (isSlideExpired(slide)) return "หมดเวลาแล้ว";

  const startsAt = parseDateValue(slide.startsAt);
  if (startsAt && startsAt.getTime() > Date.now()) return "รอแสดง";

  if (slide.status === 1) return "กำลังแสดง";
  return "ยังไม่กำหนดเวลา";
}

function countsTowardSlideLimit(slide: EditableHomeSlide) {
  return slide.status !== 2 && !isSlideExpired(slide);
}

function isSlideExpired(slide: EditableHomeSlide) {
  const endsAt = parseDateValue(slide.endsAt);
  return Boolean(endsAt && endsAt.getTime() < Date.now());
}

function emptySlide(sortOrder: number): EditableHomeSlide {
  return {
    id: `draft-${Date.now()}`,
    image: "/images/products/cookies.png",
    badge: "SALE",
    title: "โปรเด็ดวันนี้",
    description: "ราคาพิเศษเฉพาะวันนี้",
    linkUrl: "/products",
    ctaLabel: "ช้อปเลย",
    status: 0,
    startsAt: null,
    endsAt: null,
    sortOrder,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    isNew: true,
  };
}

function normalizeSlide(slide: HomeSlide): EditableHomeSlide {
  return {
    ...slide,
    badge: slide.badge ?? "",
    ctaLabel: slide.ctaLabel ?? "ช้อปเลย",
    description: slide.description ?? "",
    endsAt: toDateTimeLocal(slide.endsAt),
    persistedSortOrder: slide.sortOrder,
    startsAt: toDateTimeLocal(slide.startsAt),
  };
}

function toPayload(slide: EditableHomeSlide): SlidePayload {
  return {
    image: slide.image,
    badge: slide.badge,
    title: slide.title,
    description: slide.description,
    linkUrl: slide.linkUrl,
    ctaLabel: slide.ctaLabel?.trim() || "ช้อปเลย",
    status: slide.status,
    startsAt: toIsoOrNull(slide.startsAt),
    endsAt: toIsoOrNull(slide.endsAt),
    sortOrder: slide.isNew
      ? slide.sortOrder
      : slide.persistedSortOrder ?? slide.sortOrder,
  };
}

function toDateTimeLocal(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string | null) {
  if (!value) return null;

  const date = parseDateValue(value);

  if (!date) return null;

  return date.toISOString();
}

function parseDateValue(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatDateTime(value: string | null) {
  const date = parseDateValue(value);

  if (!date) return "";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function isValidDestination(value: string) {
  return value.startsWith("/") || value.startsWith("https://");
}

function isBlobImage(src: string) {
  return src.startsWith("blob:");
}

function isUnoptimizedImage(src: string) {
  return isBlobImage(src) || src.startsWith("http");
}
