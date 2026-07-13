"use client";

import Image from "next/image";
import {
  Bold,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Lock,
  Plus,
  Strikethrough,
  Underline,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProduct } from "@/lib/admin-products";
import { ShadcnProductContentEditor } from "@/components/shadcn-product-content-editor";
import { StickyActionHeader } from "@/components/sticky-action-header";

type StorefrontMedia = {
  label: string;
  src: string;
  id?: string;
  file?: File;
};

const categoryDescriptions: Record<string, string> = {
  ขนม: "อบสดใหม่ หอมอร่อย แพ็กพร้อมส่ง เหมาะสำหรับทานเองและเป็นของฝาก",
  เครื่องดื่ม: "ชงสดตามออเดอร์ เลือกระดับความหวานได้ และแพ็กกันกระแทกก่อนส่ง",
  แฟชั่น: "วัสดุคุณภาพดี ใส่สบาย มีตัวเลือกสีและไซซ์ พร้อมตารางขนาดสินค้า",
  ความงาม: "เนื้อสัมผัสบางเบา สีชัด ใช้งานง่าย และเก็บให้พ้นแสงแดดโดยตรง",
  ของใช้: "สินค้าน่ารักสไตล์ PonPon เหมาะสำหรับใช้งานและมอบเป็นของขวัญ",
};

export function ProductEditor({
  id,
  groupSku,
  product,
  variants,
}: {
  id: string;
  groupSku: string;
  product: AdminProduct;
  variants: AdminProduct[];
}) {
  const [active, setActive] = useState(product.isVisibleOnLiff);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeStorefrontImage, setActiveStorefrontImage] = useState(0);
  const [storefrontImages, setStorefrontImages] = useState<StorefrontMedia[]>(
    product.images.map(img => ({ label: img.url, src: img.url, id: img.id })),
  );
  const storefrontImageInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const variantProducts = variants.length ? variants : [product];
  const totalStock = variantProducts.reduce(
    (sum, variant) => sum + variant.stock,
    0,
  );
  const visibleVariants = variantProducts.filter(
    (variant) => variant.isVisibleOnLiff,
  ).length;
  const groupName = getGroupName(product.name);
  const description =
    categoryDescriptions[product.category] ??
    "จัดข้อมูลสินค้าให้พร้อมสำหรับแสดงบนหน้าร้าน PonPon";
  const initialProductContentHtml = `<h2>รายละเอียดสินค้า</h2><p>${escapeHtml(description)}</p><p>เหมาะสำหรับซื้อใช้เองหรือเป็นของฝาก แพ็กสินค้ากันกระแทกก่อนส่งทุกออเดอร์</p>`;
  const [productContentHtml, setProductContentHtml] = useState(
    product.richDescription ?? initialProductContentHtml,
  );
  const [slug, setSlug] = useState(product.slug ?? `ponpon-product-${groupSku.toLowerCase()}`);
  const [originalPrice, setOriginalPrice] = useState<number>(product.originalPrice ?? product.price + 40);
  const [promotionBadge, setPromotionBadge] = useState(product.promotionBadge ?? "ขายดี");
  const [highlights, setHighlights] = useState(product.highlights ?? description);
  const [isFeatured, setIsFeatured] = useState(product.isFeatured);
  const [isBestSeller, setIsBestSeller] = useState(product.isBestSeller);
  const [isOnHomepage, setIsOnHomepage] = useState(product.isOnHomepage);
  const [optionNames, setOptionNames] = useState<string[]>(() => {
    const names = new Set<string>();
    for (const v of variantProducts) {
      for (const opt of v.options) names.add(opt.name);
    }
    return Array.from(names);
  });
  const [variantOptions, setVariantOptions] = useState<Map<string, Record<string, string>>>(() => {
    const map = new Map<string, Record<string, string>>();
    for (const v of variantProducts) {
      const opts: Record<string, string> = {};
      for (const opt of v.options) opts[opt.name] = opt.value;
      map.set(v.id, opts);
    }
    return map;
  });

  const addOptionName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || optionNames.includes(trimmed)) return;
    setOptionNames(prev => [...prev, trimmed]);
  };

  const removeOptionName = (name: string) => {
    setOptionNames(prev => prev.filter(n => n !== name));
    setVariantOptions(prev => {
      const next = new Map(prev);
      for (const [vid, opts] of next) {
        const updated = { ...opts };
        delete updated[name];
        next.set(vid, updated);
      }
      return next;
    });
  };

  const setVariantOptionValue = (variantId: string, optName: string, value: string) => {
    setVariantOptions(prev => {
      const next = new Map(prev);
      const opts = { ...(next.get(variantId) ?? {}) };
      opts[optName] = value;
      next.set(variantId, opts);
      return next;
    });
  };

  const storefrontSlots: Array<StorefrontMedia | null> = [
    ...storefrontImages,
    null,
  ];

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const createStorefrontMedia = (file: File): StorefrontMedia => {
    const src = URL.createObjectURL(file);

    objectUrlsRef.current.push(src);

    return { label: file.name, src, file };
  };

  const uploadStorefrontImages = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (!files.length) return;

    const nextImages = files.map(createStorefrontMedia);

    setStorefrontImages((current) => [...current, ...nextImages]);
    setActiveStorefrontImage((current) =>
      storefrontImages.length === 0 ? 0 : current,
    );
    event.target.value = "";
  };

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const resolvedImages: StorefrontMedia[] = [];
      for (const img of storefrontImages) {
        if (img.file) {
          const formData = new FormData();
          formData.append("file", img.file);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30_000);
          let uploadRes: Response;
          try {
            uploadRes = await fetch(
              `/api/backend/admin/products/${id}/images/upload`,
              { method: "POST", body: formData, signal: controller.signal },
            );
          } finally {
            clearTimeout(timeoutId);
          }
          if (!uploadRes.ok) {
            let message = "อัปโหลดรูปไม่สำเร็จ";
            try {
              const body = await uploadRes.json() as Record<string, unknown>;
              if (typeof body.message === "string") message = body.message;
            } catch { /* ignore */ }
            throw new Error(message);
          }
          const { url } = (await uploadRes.json()) as { url: string };
          resolvedImages.push({ label: img.label, src: url });
        } else {
          resolvedImages.push(img);
        }
      }

      // Upload blob: images inside rich content before saving
      let resolvedContentHtml = productContentHtml;
      const contentDoc = new DOMParser().parseFromString(productContentHtml, "text/html");
      const blobImgs = Array.from(contentDoc.querySelectorAll("img[src^='blob:']"));
      for (const imgEl of blobImgs) {
        const blobUrl = imgEl.getAttribute("src")!;
        const blobRes = await fetch(blobUrl);
        const blob = await blobRes.blob();
        const formData = new FormData();
        formData.append("file", blob, "content-image.png");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);
        let uploadRes: Response;
        try {
          uploadRes = await fetch(
            `/api/backend/admin/products/${id}/images/upload`,
            { method: "POST", body: formData, signal: controller.signal },
          );
        } finally {
          clearTimeout(timeoutId);
        }
        if (!uploadRes.ok) {
          let message = "อัปโหลดรูปใน content ไม่สำเร็จ";
          try {
            const body = await uploadRes.json() as Record<string, unknown>;
            if (typeof body.message === "string") message = body.message;
          } catch { /* ignore */ }
          throw new Error(message);
        }
        const { url } = await uploadRes.json() as { url: string };
        imgEl.setAttribute("src", url);
      }
      if (blobImgs.length > 0) {
        resolvedContentHtml = contentDoc.body.innerHTML;
      }

      await Promise.all([
        fetch(`/api/backend/admin/products/${id}/images`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            images: resolvedImages.map((img, i) => ({
              url: img.src,
              sortOrder: i,
              isPrimary: i === 0,
            })),
          }),
        }).then((res) => { if (!res.ok) throw new Error("บันทึกรูปไม่สำเร็จ"); }),
        fetch(`/api/backend/admin/products/${id}/ponpon-settings`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug,
            originalPrice,
            promotionBadge,
            highlights,
            richDescription: resolvedContentHtml,
            isFeatured, isBestSeller, isOnHomepage,
            // ถ้า variant ตัวนี้คือ product หลัก (id เดียวกัน) ให้รวม options ในนี้
            // เพื่อป้องกัน 2 PUT ไปที่ endpoint เดียวกันพร้อมกัน แล้ว options โดน overwrite เป็น null
            ...(variants.some(v => v.id === id) ? {
              options: optionNames
                .map(name => ({ name, value: variantOptions.get(id)?.[name] ?? "" }))
                .filter(o => o.value),
            } : {}),
          }),
        }).then((res) => { if (!res.ok) throw new Error("บันทึก settings ไม่สำเร็จ"); }),
        ...variants
          .filter(v => v.id !== id)
          .map(v =>
            fetch(`/api/backend/admin/products/${v.id}/ponpon-settings`, {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                options: optionNames
                  .map(name => ({ name, value: variantOptions.get(v.id)?.[name] ?? "" }))
                  .filter(o => o.value),
              }),
            }).then(res => { if (!res.ok) throw new Error("บันทึก options ไม่สำเร็จ"); })
          ),
      ]);

      setStorefrontImages(resolvedImages);
      if (blobImgs.length > 0) setProductContentHtml(resolvedContentHtml);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      const message = err instanceof Error
        ? err.name === "AbortError" ? "อัปโหลดนานเกินไป (30s) ลองใหม่อีกครั้ง" : err.message
        : "บันทึกไม่สำเร็จ";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async () => {
    const next = !active;
    setActive(next);
    await fetch(`/api/backend/admin/products/${id}/visibility`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isVisibleOnLiff: next }),
    });
  };

  return (
    <div>
      <StickyActionHeader
        eyebrow="Product Editor"
        title={groupName}
        description={`SKU Group ${groupSku} · ${variantProducts.length} ตัวเลือก · สต็อกรวม ${totalStock} ชิ้น`}
        feedback={saveError ? <span className="text-destructive">{saveError}</span> : undefined}
        actions={
          <>
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                Preview
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => window.location.href = "/products"}>
                ยกเลิก
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>
                {saving && (
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {saving ? "กำลังบันทึก..." : saved ? "✓ บันทึกแล้ว" : "บันทึกการแก้ไข"}
              </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: Main form */}
        <div className="space-y-5">
          <EditorCard
            title="ข้อมูลหน้าร้าน (PonPon)"
            description="แก้เฉพาะข้อมูลที่ใช้แสดงบนเว็บ ส่วนชื่อสินค้าล็อกตาม ZORT"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <LockedField label="ชื่อที่แสดงบนเว็บไซต์จาก ZORT" value={groupName} />
              </div>
              <Field label="Slug ของหน้าสินค้า">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </Field>
              <Field label="ราคาเต็มก่อนลด (PonPon)">
                <Input
                  type="number"
                  value={String(originalPrice)}
                  onChange={(e) => setOriginalPrice(Number(e.target.value))}
                />
              </Field>
              <Field label="Badge โปรโมชัน">
                <NativeSelect
                  value={promotionBadge}
                  onChange={(e) => setPromotionBadge(e.target.value)}
                  className="w-full"
                >
                  <option value="ไม่มี">ไม่มี</option>
                  <option value="ขายดี">ขายดี</option>
                  <option value="มาใหม่">มาใหม่</option>
                  <option value="แนะนำ">แนะนำ</option>
                  <option value="ลดราคา">ลดราคา</option>
                </NativeSelect>
              </Field>
              <Field label="จุดเด่นสินค้า" className="sm:col-span-2">
                <Textarea
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  className="min-h-28"
                />
              </Field>
            </div>
          </EditorCard>

          <EditorCard
            title="ตัวเลือกสินค้าจาก ZORT"
            description={`ล็อกข้อมูลจาก ZORT · หมวดหมู่ ${product.category} · แสดงบน LIFF ${visibleVariants}/${variantProducts.length} · ซิงก์ล่าสุด ${product.lastSyncedAt}`}
          >
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
              <LockedField
                label="ต้นทุน (ZORT)"
                value={
                  product.purchasePrice !== null
                    ? `฿${product.purchasePrice.toLocaleString()}`
                    : "-"
                }
              />
              <LockedField
                label="น้ำหนัก"
                value={product.weight !== null ? `${product.weight} g` : "-"}
              />
              <LockedField
                label="ขนาด (W × H × L)"
                value={
                  product.width !== null || product.height !== null || product.length !== null
                    ? `${product.width ?? "?"} × ${product.height ?? "?"} × ${product.length ?? "?"} cm`
                    : "-"
                }
              />
            </div>
            <VariantTable
              groupSku={groupSku}
              variants={variantProducts}
              optionNames={optionNames}
              variantOptions={variantOptions}
              onAddOption={addOptionName}
              onRemoveOption={removeOptionName}
              onOptionValueChange={setVariantOptionValue}
            />
          </EditorCard>

          <ShadcnProductContentEditor
            contentHtml={productContentHtml}
            description={description}
            onContentHtmlChange={setProductContentHtml}
          />
        </div>

        {/* Right panel */}
        <div className="space-y-5 xl:sticky xl:top-[73px] xl:self-start">
          {/* Image card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">รูปหน้าร้าน (PonPon)</CardTitle>
              <CardDescription>
                Gallery ที่ลูกค้าเห็นบนหน้าสินค้า อัปโหลดแยกจากรูปสี/ไซซ์ของ ZORT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={storefrontImageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={uploadStorefrontImages}
              />
              <div className="overflow-hidden rounded-xl border bg-muted/30">
                {storefrontImages[0] ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
                    <Image
                      src={storefrontImages[activeStorefrontImage]?.src}
                      alt={storefrontImages[activeStorefrontImage]?.label ?? groupName}
                      fill
                      unoptimized
                      className="object-contain p-5"
                      sizes="380px"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => storefrontImageInputRef.current?.click()}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background text-center transition hover:border-foreground/30 hover:bg-muted/50"
                  >
                    <span className="text-4xl font-light leading-none text-muted-foreground">+</span>
                    <span className="text-sm font-semibold text-foreground">
                      อัปโหลดรูปหลักหน้าสินค้า
                    </span>
                    <span className="max-w-52 text-xs leading-5 text-muted-foreground">
                      รูปนี้จะแสดงเป็นรูปแรกบนหน้าสินค้าที่ลูกค้าเห็น
                    </span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {storefrontSlots.map((image, index) => (
                  <button
                    key={image ? `${image.src}-${index}` : `upload-${index}`}
                    type="button"
                    onClick={() =>
                      image
                        ? setActiveStorefrontImage(index)
                        : storefrontImageInputRef.current?.click()
                    }
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                      image && index === activeStorefrontImage
                        ? "border-primary"
                        : "border-border bg-muted hover:border-foreground/30"
                    }`}
                  >
                    {image ? (
                      <Image
                        src={image.src}
                        alt={image.label}
                        fill
                        unoptimized
                        className="object-contain p-1.5"
                        sizes="100px"
                      />
                    ) : (
                      <span className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                        <span className="text-2xl font-light leading-none">+</span>
                        <span className="text-[10px] font-bold">อัปโหลด</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="rounded-lg bg-muted px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
                รูป ZORT ใช้กับตัวเลือกสี/ไซซ์เท่านั้น รูปหน้าร้านต้องอัปโหลดใน PonPon เอง
              </p>
            </CardContent>
          </Card>

          {/* Visibility card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">การแสดงผลหน้าร้าน (PonPon)</CardTitle>
              <CardDescription>ตัวเลือกเฉพาะ ecommerce ไม่ส่งกลับ ZORT</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {(
                  [
                    ["เปิดขายสินค้า", active, toggleVisibility],
                    ["สินค้าแนะนำ", isFeatured, () => setIsFeatured(v => !v)],
                    ["สินค้าขายดี", isBestSeller, () => setIsBestSeller(v => !v)],
                    ["แสดงบนหน้าแรก", isOnHomepage, () => setIsOnHomepage(v => !v)],
                  ] as [string, boolean, () => void][]
                ).map(([label, enabled, onClick]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg px-1 py-2.5"
                  >
                    <Label className="cursor-pointer text-sm font-medium">{label}</Label>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => onClick()}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">SEO และการแชร์</CardTitle>
              <CardDescription>ข้อมูลสำหรับลิงก์สินค้าและผลการค้นหา</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="SEO Title">
                <Input defaultValue={`${product.name} | PonPon Shop`} />
              </Field>
              <Field label="Meta Description">
                <Textarea defaultValue={description} className="min-h-24" />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>

      {previewOpen ? (
        <ProductPreviewModal
          groupSku={groupSku}
          productContentHtml={productContentHtml}
          product={product}
          originalPrice={originalPrice}
          storefrontImages={storefrontImages}
          variants={variantProducts}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function LegacyProductContentEditor({
  description,
}: {
  description: string;
}) {
  const initialContent = `<h2>รายละเอียดสินค้า</h2><p>${description}</p><p>เหมาะสำหรับซื้อใช้เองหรือเป็นของฝาก แพ็กสินค้ากันกระแทกก่อนส่งทุกออเดอร์</p>`;
  const [activeTab, setActiveTab] = useState("editor");
  const [title, setTitle] = useState("รายละเอียดสินค้า");
  const [content, setContent] = useState(initialContent);
  const editorRef = useRef<HTMLDivElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const editorSelectionRef = useRef<Range | null>(null);

  const syncEditorContent = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const saveEditorSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (
      editor.contains(range.commonAncestorContainer) ||
      editor === range.commonAncestorContainer
    ) {
      editorSelectionRef.current = range.cloneRange();
    }
  };

  const restoreEditorSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = editorSelectionRef.current;

    if (!editor || !selection || !range) {
      editor?.focus();
      return;
    }

    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const focusEditorEnd = () => {
    window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      const selection = window.getSelection();

      if (!editor || !selection) return;

      editor.focus();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  };

  const handleTabChange = (value: string) => {
    if (activeTab === "editor") {
      syncEditorContent();
    }

    setActiveTab(value);
  };

  const insertIntoHtml = (before: string, after = "") => {
    const textarea = htmlTextareaRef.current;

    if (!textarea) {
      setContent((value) => `${value}${before}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const nextContent =
      content.slice(0, start) + before + selected + after + content.slice(end);

    updateHtml(nextContent);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + before.length + selected.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const runCommand = (command: string, value?: string) => {
    if (activeTab === "html") {
      const htmlFormats: Record<string, [string, string]> = {
        bold: ["<strong>", "</strong>"],
        italic: ["<em>", "</em>"],
        underline: ["<u>", "</u>"],
        strikeThrough: ["<s>", "</s>"],
        insertUnorderedList: ["\n<ul>\n  <li>", "</li>\n</ul>"],
        insertOrderedList: ["\n<ol>\n  <li>", "</li>\n</ol>"],
      };

      if (command === "formatBlock") {
        insertIntoHtml(value === "h2" ? "<h2>" : "<p>", value === "h2" ? "</h2>" : "</p>");
        return;
      }

      const format = htmlFormats[command];

      if (format) {
        insertIntoHtml(format[0], format[1]);
      }

      return;
    }

    if (activeTab !== "editor") {
      setActiveTab("editor");
    }

    restoreEditorSelection();
    document.execCommand(command, false, value);
    saveEditorSelection();
  };

  const applyTextSize = (value: string | null) => {
    if (!value) return;

    const tagBySize: Record<string, string> = {
      p: "p",
      h1: "h1",
      h2: "h2",
      h3: "h3",
      small: "small",
    };
    const tag = tagBySize[value] ?? "p";

    if (activeTab === "html") {
      insertIntoHtml(`<${tag}>`, `</${tag}>`);
      return;
    }

    if (tag === "small") {
      restoreEditorSelection();
      document.execCommand("fontSize", false, "2");
      saveEditorSelection();
      return;
    }

    runCommand("formatBlock", tag);
  };

  const insertHtml = (html: string) => {
    if (activeTab === "html") {
      insertIntoHtml(html);
      return;
    }

    if (activeTab === "editor" && editorRef.current) {
      restoreEditorSelection();
      document.execCommand("insertHTML", false, html);
      saveEditorSelection();
      return;
    }

    const nextContent = `${content}${html}`;
    setContent(nextContent);

    if (editorRef.current) {
      editorRef.current.innerHTML = nextContent;
    }

    setActiveTab("editor");
    focusEditorEnd();
  };

  const updateHtml = (html: string) => {
    setContent(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  };

  const addLink = () => {
    const url = window.prompt("URL");

    if (url) {
      if (activeTab === "html") {
        insertIntoHtml(`<a href="${url}">`, "</a>");
        return;
      }

      runCommand("createLink", url);
    }
  };

  const uploadMedia = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video",
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const url = URL.createObjectURL(file);
    const html =
      type === "image"
        ? `<figure><img src="${url}" alt="${file.name}" /><figcaption>${file.name}</figcaption></figure>`
        : `<figure><video src="${url}" controls style="max-width:100%;border-radius:12px"></video><figcaption>${file.name}</figcaption></figure>`;

    insertHtml(html);
    event.target.value = "";
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-3">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="blocks">Blocks</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
            </TabsList>
          </Tabs>
          <Badge variant="outline">Draft</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => uploadMedia(event, "image")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => uploadMedia(event, "video")}
        />

        <div
          className="flex flex-wrap items-center gap-1 rounded-lg border bg-background p-2"
          onMouseDown={saveEditorSelection}
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => runCommand("formatBlock", "p")}
          >
            Paragraph
          </Button>
          <NativeSelect
            defaultValue="p"
            onChange={(e) => applyTextSize(e.target.value)}
            className="h-9"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="small">Small</option>
          </NativeSelect>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Toggle
            type="button"
            variant="outline"
            size="lg"
            aria-label="Bold"
            onPressedChange={() => runCommand("bold")}
          >
            <Bold />
          </Toggle>
          <Toggle
            type="button"
            variant="outline"
            size="lg"
            aria-label="Italic"
            onPressedChange={() => runCommand("italic")}
          >
            <Italic />
          </Toggle>
          <Toggle
            type="button"
            variant="outline"
            size="lg"
            aria-label="Underline"
            onPressedChange={() => runCommand("underline")}
          >
            <Underline />
          </Toggle>
          <Toggle
            type="button"
            variant="outline"
            size="lg"
            aria-label="Strikethrough"
            onPressedChange={() => runCommand("strikeThrough")}
          >
            <Strikethrough />
          </Toggle>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Toggle
            type="button"
            variant="outline"
            size="lg"
            aria-label="Bullet list"
            onPressedChange={() => runCommand("insertUnorderedList")}
          >
            <List />
          </Toggle>
          <Toggle
            type="button"
            variant="outline"
            size="lg"
            aria-label="Numbered list"
            onPressedChange={() => runCommand("insertOrderedList")}
          >
            <ListOrdered />
          </Toggle>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon />
            รูป
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => videoInputRef.current?.click()}
          >
            <Video />
            วิดีโอ
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={addLink}>
            <LinkIcon />
            ลิงก์
          </Button>
        </div>

        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-14 text-base font-black"
        />
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="editor">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={() => {
                saveEditorSelection();
                syncEditorContent();
              }}
              onKeyUp={saveEditorSelection}
              onMouseUp={saveEditorSelection}
              className="min-h-90 rounded-lg border border-input bg-transparent px-4 py-4 text-sm leading-7 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_a]:font-bold [&_a]:text-primary [&_figcaption]:mt-2 [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground [&_figure]:my-4 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-black [&_img]:max-w-full [&_img]:rounded-xl [&_li]:ml-5 [&_p]:mb-3 [&_video]:max-w-full"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </TabsContent>
          <TabsContent value="blocks">
            <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                className="h-16 justify-start"
                onClick={() => insertHtml("<h2>หัวข้อใหญ่</h2><p>เขียนรายละเอียดสินค้า...</p>")}
              >
                หัวข้อ + ข้อความ
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-16 justify-start"
                onClick={() => insertHtml("<ul><li>จุดเด่นสินค้า</li><li>ข้อมูลเพิ่มเติม</li></ul>")}
              >
                Bullet list
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-16 justify-start"
                onClick={() => insertHtml('<div class="rounded-2xl bg-[#fff8f6] p-4"><strong>หมายเหตุ</strong><p>รายละเอียดเพิ่มเติม</p></div>')}
              >
                การ์ดข้อมูล
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-16 justify-start"
                onClick={() => imageInputRef.current?.click()}
              >
                อัปโหลดรูป
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-16 justify-start"
                onClick={() => videoInputRef.current?.click()}
              >
                อัปโหลดวิดีโอ
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="html">
            <Textarea
              ref={htmlTextareaRef}
              value={content}
              onChange={(event) => updateHtml(event.target.value)}
              className="min-h-90 resize-y font-mono text-sm leading-7"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

void LegacyProductContentEditor;

function ProductPreviewModal({
  groupSku,
  productContentHtml,
  product,
  originalPrice,
  storefrontImages,
  variants,
  onClose,
}: {
  groupSku: string;
  productContentHtml: string;
  product: AdminProduct;
  originalPrice: number;
  storefrontImages: StorefrontMedia[];
  variants: AdminProduct[];
  onClose: () => void;
}) {
  const [activePreviewImage, setActivePreviewImage] = useState(0);
  const [hoveredPreviewImage, setHoveredPreviewImage] = useState<number | null>(
    null,
  );
  const [activePreviewVariant, setActivePreviewVariant] = useState(0);
  const [activeVariantImage, setActiveVariantImage] = useState<number | null>(
    null,
  );
  const [hoveredPreviewVariant, setHoveredPreviewVariant] = useState<
    number | null
  >(null);
  const groupName = getGroupName(product.name);
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const prices = variants.map((variant) => variant.displayPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const hasFlashSalePrice =
    product.priceSource === "flash_sale" ||
    variants.some((variant) => variant.priceSource === "flash_sale");
  const displayOriginalPrices = variants
    .map((variant) => variant.displayOriginalPrice)
    .filter((price): price is number => typeof price === "number" && price > 0);
  const previewOriginalPrice =
    hasFlashSalePrice && displayOriginalPrices.length
      ? Math.max(...displayOriginalPrices)
      : originalPrice;
  const previewImages = storefrontImages.length ? storefrontImages : [
    { label: product.name, src: product.image },
    ...variants.slice(0, 4).map((variant) => ({
      label: variant.name,
      src: variant.image,
    })),
  ];
  const hoveredVariant =
    hoveredPreviewVariant === null ? null : variants[hoveredPreviewVariant];
  const clickedVariant =
    activeVariantImage === null ? null : variants[activeVariantImage];
  const previewMainImage = hoveredVariant
    ? { label: hoveredVariant.name, src: hoveredVariant.image }
    : hoveredPreviewImage !== null
      ? previewImages[hoveredPreviewImage] ?? previewImages[0] ?? {
          label: product.name,
          src: product.image,
        }
      : clickedVariant
        ? { label: clickedVariant.name, src: clickedVariant.image }
        : previewImages[activePreviewImage] ?? previewImages[0] ?? {
            label: product.name,
            src: product.image,
          };
  const selectPreviewVariant = (index: number) => {
    setActivePreviewVariant(index);
    setActiveVariantImage(index);
    setHoveredPreviewVariant(null);

    if (!storefrontImages.length) {
      setActivePreviewImage(Math.min(index + 1, previewImages.length - 1));
    }
  };

  const selectPreviewImage = (index: number) => {
    setActivePreviewImage(index);
    setActiveVariantImage(null);
    setHoveredPreviewImage(null);
    setHoveredPreviewVariant(null);

    if (!storefrontImages.length && index > 0) {
      setActivePreviewVariant(index - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              Storefront Preview
            </p>
            <h2 className="text-lg font-black">{groupName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-xl font-light text-foreground transition hover:bg-muted"
            aria-label="ปิด preview"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 bg-[#fbf7f4] p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[380px] space-y-3 lg:max-w-none">
              <div className="relative aspect-square overflow-hidden rounded-[1.6rem] bg-muted shadow-sm ring-1 ring-border">
                <Image
                  src={previewMainImage.src}
                  alt={previewMainImage.label}
                  fill
                  unoptimized
                  className="object-contain"
                  sizes="380px"
                />
                <button
                  type="button"
                  className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-background text-xl text-foreground shadow-sm"
                >
                  ♡
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {previewImages.slice(0, 5).map((item, index) => (
                  <button
                    type="button"
                    key={`${item.src}-${index}`}
                    onClick={() => selectPreviewImage(index)}
                    onMouseEnter={() => setHoveredPreviewImage(index)}
                    onMouseLeave={() => setHoveredPreviewImage(null)}
                    className={`relative aspect-square overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${
                      index === activePreviewImage ? "ring-2 ring-primary" : "ring-border"
                    }`}
                  >
                    <Image
                      src={item.src}
                      alt={item.label}
                      fill
                      unoptimized
                      className="object-contain p-2"
                      sizes="72px"
                    />
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 rounded-3xl bg-card p-2 shadow-sm ring-1 ring-border">
                {["Official", "ส่งไว", "แพ็กดี", "4.9 รีวิว"].map((item) => (
                  <div key={item} className="rounded-2xl bg-muted px-2 py-3 text-center">
                    <p className="text-sm font-black text-foreground">♡</p>
                    <p className="mt-1 text-[11px] font-black text-zinc-700">{item}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black">รีวิวล่าสุด</h4>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">
                    ★ 4.9
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  สินค้าตรงปก แพ็กดี ส่งไว ลูกค้าชอบมาก
                </p>
                <button type="button" className="mt-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  ดูรีวิวทั้งหมด
                </button>
              </div>
            </div>

            <div className="rounded-[1.6rem] bg-card p-5 shadow-sm ring-1 ring-border">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-black text-primary-foreground">
                  ขายดี
                </span>
                {hasFlashSalePrice ? (
                  <span className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-black text-white">
                    Flash Sale
                  </span>
                ) : null}
                <span className="rounded-full border border-border px-3 py-1 text-[11px] font-black text-foreground">
                  Preview
                </span>
              </div>

              <h3 className="mt-3 text-2xl font-black tracking-tight">{groupName}</h3>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                หมวดหมู่: {product.category} · คงเหลือรวม {totalStock} ชิ้น
              </p>

              <div className="mt-4 flex items-end gap-3 border-b border-border pb-4">
                <p className="text-3xl font-black text-foreground">
                  {formatNumberPriceRange(minPrice, maxPrice)}
                </p>
                {previewOriginalPrice > minPrice ? (
                  <p className="pb-1 text-sm font-bold text-zinc-400 line-through">
                    ฿{previewOriginalPrice.toLocaleString()}
                  </p>
                ) : null}
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-black">สรุปสินค้า</h4>
                <p className="mt-2 text-sm leading-7 text-zinc-600">
                  ข้อมูลหน้าร้านจาก PonPon แสดงร่วมกับราคา สต็อก และตัวเลือกจาก ZORT
                </p>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-black">ตัวเลือกสินค้า</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {variants.map((variant, index) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => selectPreviewVariant(index)}
                      onMouseEnter={() => setHoveredPreviewVariant(index)}
                      onMouseLeave={() => setHoveredPreviewVariant(null)}
                      className={`flex items-center gap-3 rounded-2xl border p-2 text-left transition ${
                        index === activePreviewVariant
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-border/80"
                      }`}
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#fff8f6]">
                        <Image
                          src={variant.image}
                          alt={variant.name}
                          fill
                          className="object-contain p-1"
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {getVariantLabel(variant.zortSku, groupSku)}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-zinc-500">
                          ฿{variant.displayPrice.toLocaleString()} · เหลือ {variant.stock} ชิ้น
                        </p>
                        {variant.priceSource === "flash_sale" ? (
                          <p className="mt-1 text-[11px] font-black text-red-600">
                            Flash Sale
                          </p>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <h4 className="text-sm font-black">จำนวน</h4>
                <div className="flex items-center overflow-hidden rounded-full border border-border bg-muted">
                  <button type="button" className="px-4 py-2 text-foreground">−</button>
                  <span className="px-4 py-2 text-sm font-black">1</span>
                  <button type="button" className="px-4 py-2 text-foreground">+</button>
                </div>
                <p className="text-xs font-bold text-zinc-500">มีสินค้าทั้งหมด {totalStock} ชิ้น</p>
              </div>

              <div className="mt-5 rounded-lg bg-muted p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-foreground">
                    คูปองสำหรับคุณ ฿20 · CODE: COOKIE20
                  </p>
                  <button type="button" className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground border border-border">
                    คัดลอก
                  </button>
                </div>
              </div>

            </div>
          </div>

          {(productContentHtml.replace(/<[^>]*>/g, "").trim() || /<img\b/i.test(productContentHtml)) ? (
            <section className="overflow-hidden rounded-[1.75rem] bg-card shadow-sm ring-1 ring-border">
              <div className="bg-[#faf8f7] px-5 py-4">
                <h3 className="text-lg font-black">รายละเอียดสินค้า</h3>
              </div>
              <div
                className="product-rich-editor p-5 text-sm leading-7 text-zinc-700"
                dangerouslySetInnerHTML={{ __html: productContentHtml }}
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VariantTable({
  groupSku,
  variants,
  optionNames,
  variantOptions,
  onAddOption,
  onRemoveOption,
  onOptionValueChange,
}: {
  groupSku: string;
  variants: AdminProduct[];
  optionNames: string[];
  variantOptions: Map<string, Record<string, string>>;
  onAddOption: (name: string) => void;
  onRemoveOption: (name: string) => void;
  onOptionValueChange: (variantId: string, name: string, value: string) => void;
}) {
  const totalStock = variants.reduce((sum, v) => sum + v.availableStock, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">SKU Group {groupSku}</span>
        {optionNames.length > 0 && (
          <span>ตัวเลือก: {optionNames.join(" / ")}</span>
        )}
        <span>{variants.length} variants</span>
        <span>สต็อก {totalStock} ชิ้น</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2.5">
        <span className="text-xs font-semibold text-muted-foreground">ประเภทตัวเลือก:</span>
        {optionNames.map(name => (
          <span
            key={name}
            className="flex h-7 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold"
          >
            {name}
            <button
              type="button"
              onClick={() => onRemoveOption(name)}
              className="ml-0.5 rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <AddOptionInput onAdd={onAddOption} />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12">รูป</TableHead>
                <TableHead className="min-w-[180px] font-semibold">ตัวเลือกสินค้า</TableHead>
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Barcode</TableHead>
                <TableHead className="font-semibold">ราคา</TableHead>
                <TableHead className="font-semibold">สต็อก</TableHead>
                <TableHead className="font-semibold">LIFF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => {
                const opts = variantOptions.get(variant.id) ?? {};
                return (
                  <TableRow key={variant.id}>
                    <TableCell className="py-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={variant.image}
                          alt={variant.name}
                          fill
                          className="object-contain p-1"
                          sizes="44px"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {optionNames.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {optionNames.map(name => (
                            <div key={name} className="flex items-center gap-2">
                              <span className="w-10 shrink-0 text-[10px] font-bold text-muted-foreground">
                                [{name}]
                              </span>
                              <Input
                                value={opts[name] ?? ""}
                                onChange={e => onOptionValueChange(variant.id, name, e.target.value)}
                                className="h-9 text-sm"
                                placeholder={`ค่า${name}`}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">ไม่มีตัวเลือก</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-medium">{variant.zortSku}</TableCell>
                    <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                      {variant.barcode ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-black">
                      ฿{variant.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm font-black">{variant.availableStock}</span>
                      {variant.availableStock !== variant.stock && (
                        <span className="ml-1 text-xs text-muted-foreground">/ {variant.stock}</span>
                      )}
                      <span className="ml-1 text-xs text-muted-foreground">ชิ้น</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
                        variant.isVisibleOnLiff
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {variant.isVisibleOnLiff ? "แสดง" : "ซ่อน"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function AddOptionInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    setValue("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        <Plus className="size-3" />
        เพิ่มตัวเลือก
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setOpen(false); setValue(""); }
        }}
        className="h-9 w-32 text-sm"
        placeholder="เช่น สี, รุ่น"
      />
      <Button type="button" size="sm" onClick={commit}>
        เพิ่ม
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => { setOpen(false); setValue(""); }}>
        <X className="size-3" />
      </Button>
    </div>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          <Lock className="size-2.5" />
          Locked
        </div>
      </div>
      <div className="flex min-h-9 items-center rounded-md border border-border bg-muted/60 px-3 py-2">
        <p className="truncate text-sm font-medium text-muted-foreground">{value}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">ข้อมูลนี้มาจาก ZORT ไม่สามารถแก้ไขได้</p>
    </div>
  );
}

function EditorCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs leading-5">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function getGroupName(name: string) {
  return name.replace(/\s*\(สี[^)]*\)\s*$/u, "").trim();
}

function getVariantLabel(sku: string, groupSku: string) {
  const prefix = `${groupSku}-`;
  return sku.startsWith(prefix) ? sku.slice(prefix.length) : sku;
}

function formatNumberPriceRange(min: number, max: number) {
  return min === max
    ? `฿${min.toLocaleString()}`
    : `฿${min.toLocaleString()} - ฿${max.toLocaleString()}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
