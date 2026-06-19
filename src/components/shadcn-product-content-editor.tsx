"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Expand,
  Heading1,
  Heading2,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Shrink,
  Underline,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function ShadcnProductContentEditor({
  contentHtml,
  description,
  onContentHtmlChange,
}: {
  contentHtml?: string;
  description: string;
  onContentHtmlChange?: (html: string) => void;
}) {
  const initialHtml = `<h2>รายละเอียดสินค้า</h2><p>${escapeHtml(description)}</p><p>เหมาะสำหรับซื้อใช้เองหรือเป็นของฝาก แพ็กสินค้ากันกระแทกก่อนส่งทุกออเดอร์</p>`;
  const [internalContentHtml, setInternalContentHtml] = useState(
    contentHtml ?? initialHtml,
  );
  const [hasSelectedMedia, setHasSelectedMedia] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const latestHtmlRef = useRef(contentHtml ?? initialHtml);
  const selectedMediaRef = useRef<HTMLElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const activeContentHtml = contentHtml ?? internalContentHtml;

  useEffect(() => {
    if (contentHtml === undefined) return;

    latestHtmlRef.current = contentHtml;

    if (editorRef.current && editorRef.current.innerHTML !== contentHtml) {
      editorRef.current.innerHTML = contentHtml;
    }
  }, [contentHtml]);

  useEffect(() => {
    const editor = editorRef.current;

    if (editor && !editor.innerHTML) {
      editor.innerHTML = latestHtmlRef.current;
    }
  }, []);

  const syncFromEditor = () => {
    const editor = editorRef.current;

    if (!editor) return;

    const nextHtml = editor.innerHTML;

    latestHtmlRef.current = nextHtml;
    setInternalContentHtml(nextHtml);
    onContentHtmlChange?.(nextHtml);
  };

  const selectMedia = (target: EventTarget | null) => {
    const figure =
      target instanceof HTMLElement
        ? target.closest<HTMLElement>("figure")
        : null;

    editorRef.current
      ?.querySelectorAll("[data-selected-media='true']")
      .forEach((node) => node.removeAttribute("data-selected-media"));

    if (figure) {
      figure.dataset.selectedMedia = "true";
      selectedMediaRef.current = figure;
      setHasSelectedMedia(true);
      return;
    }

    selectedMediaRef.current = null;
    setHasSelectedMedia(false);
  };

  const runCommand = (command: string, value?: string) => {
    const editor = editorRef.current;

    if (!editor) return;

    editor.focus();
    document.execCommand(command, false, value);
    syncFromEditor();
  };

  const insertHtml = (markup: string) => {
    const editor = editorRef.current;

    if (!editor) return;

    editor.focus();
    document.execCommand("insertHTML", false, markup);
    syncFromEditor();
  };

  const uploadMedia = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video",
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const src = URL.createObjectURL(file);
    const markup =
      type === "image"
        ? `<figure style="width:360px;max-width:100%;"><img src="${src}" alt="${escapeHtml(file.name)}" /></figure>`
        : `<figure style="width:520px;max-width:100%;"><video src="${src}" controls></video></figure>`;

    insertHtml(markup);
    event.target.value = "";
  };

  const resizeSelectedMedia = (direction: -1 | 1) => {
    const figure = selectedMediaRef.current;

    if (!figure) return;

    const currentWidth = figure.getBoundingClientRect().width;
    const nextWidth = Math.max(120, Math.min(900, currentWidth + direction * 80));

    figure.style.width = `${Math.round(nextWidth)}px`;
    figure.style.maxWidth = "100%";
    syncFromEditor();
  };

  const alignContent = (alignment: "center" | "left" | "right") => {
    const figure = selectedMediaRef.current;

    if (figure) {
      if (alignment === "center") {
        figure.style.marginLeft = "auto";
        figure.style.marginRight = "auto";
      } else if (alignment === "right") {
        figure.style.marginLeft = "auto";
        figure.style.marginRight = "0";
      } else {
        figure.style.marginLeft = "0";
        figure.style.marginRight = "auto";
      }

      syncFromEditor();
      return;
    }

    const commandByAlignment = {
      center: "justifyCenter",
      left: "justifyLeft",
      right: "justifyRight",
    };

    runCommand(commandByAlignment[alignment]);
  };

  const setBlock = (tag: string | null) => {
    runCommand("formatBlock", tag ?? "p");
  };

  const addLink = () => {
    const url = window.prompt("URL");

    if (url) {
      runCommand("createLink", url);
    }
  };

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              รายละเอียดสินค้า
            </h2>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              จัดรูปแบบข้อความสำหรับแสดงด้านล่างหน้าสินค้า
            </p>
          </div>
          <Badge variant="outline">ร่าง</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
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
          className="flex flex-wrap items-center gap-0.5 rounded-lg border bg-background p-1.5"
          onMouseDown={(event) => event.preventDefault()}
        >
          <Select defaultValue="p" onValueChange={setBlock}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="ย่อหน้า" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p">ย่อหน้า</SelectItem>
              <SelectItem value="h1">หัวข้อ 1</SelectItem>
              <SelectItem value="h2">หัวข้อ 2</SelectItem>
              <SelectItem value="blockquote">คำพูดอ้างอิง</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <ToolbarButton label="ย่อหน้า" onClick={() => setBlock("p")}>
            <Pilcrow />
          </ToolbarButton>
          <ToolbarButton label="หัวข้อ 1" onClick={() => setBlock("h1")}>
            <Heading1 />
          </ToolbarButton>
          <ToolbarButton label="หัวข้อ 2" onClick={() => setBlock("h2")}>
            <Heading2 />
          </ToolbarButton>
          <ToolbarButton label="คำพูดอ้างอิง" onClick={() => setBlock("blockquote")}>
            <Quote />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <FormatToggle label="Bold" onClick={() => runCommand("bold")}>
            <Bold />
          </FormatToggle>
          <FormatToggle label="Italic" onClick={() => runCommand("italic")}>
            <Italic />
          </FormatToggle>
          <FormatToggle label="Underline" onClick={() => runCommand("underline")}>
            <Underline />
          </FormatToggle>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <ToolbarButton label="Align left" onClick={() => alignContent("left")}>
            <AlignLeft />
          </ToolbarButton>
          <ToolbarButton label="Align center" onClick={() => alignContent("center")}>
            <AlignCenter />
          </ToolbarButton>
          <ToolbarButton label="Align right" onClick={() => alignContent("right")}>
            <AlignRight />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <ToolbarButton label="Bullet list" onClick={() => runCommand("insertUnorderedList")}>
            <List />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => runCommand("insertOrderedList")}>
            <ListOrdered />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <ToolbarButton label="Link" onClick={addLink}>
            <LinkIcon />
            <span className="text-xs">ลิงก์</span>
          </ToolbarButton>
          <ToolbarButton label="Upload image" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon />
            <span className="text-xs">รูป</span>
          </ToolbarButton>
          <ToolbarButton label="Upload video" onClick={() => videoInputRef.current?.click()}>
            <Video />
            <span className="text-xs">วิดีโอ</span>
          </ToolbarButton>

          {hasSelectedMedia ? (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <ToolbarButton label="Shrink media" onClick={() => resizeSelectedMedia(-1)}>
                <Shrink />
              </ToolbarButton>
              <ToolbarButton label="Expand media" onClick={() => resizeSelectedMedia(1)}>
                <Expand />
              </ToolbarButton>
            </>
          ) : null}
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="product-rich-editor max-h-[560px] min-h-96 overflow-y-auto rounded-xl border bg-background px-5 py-5 text-sm leading-7 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          onBlur={syncFromEditor}
          onClick={(event) => selectMedia(event.target)}
          onInput={syncFromEditor}
          onMouseUp={syncFromEditor}
        />

        <input type="hidden" name="productContentTitle" value="รายละเอียดสินค้า" />
        <input type="hidden" name="productContentHtml" value={activeContentHtml} />
      </CardContent>
    </Card>
  );
}

function FormatToggle({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ToolbarButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
