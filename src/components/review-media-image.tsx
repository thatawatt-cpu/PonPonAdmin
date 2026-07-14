"use client";

import { ImageOff } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export function ReviewMediaImage({
  alt,
  className,
  fallbackSrc,
  src,
}: {
  alt: string;
  className?: string;
  fallbackSrc?: string | null;
  src: string;
}) {
  const sources = useMemo(
    () => Array.from(new Set([src, fallbackSrc].filter(Boolean) as string[])),
    [fallbackSrc, src],
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  const currentSource = sources[sourceIndex];

  if (!currentSource) {
    return (
      <span className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="size-5" aria-hidden="true" />
        <span className="sr-only">ไม่สามารถแสดงรูปรีวิวได้</span>
      </span>
    );
  }

  return (
    // Review media URLs are already served at their original size by the media backend.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setSourceIndex((current) => current + 1)}
      src={currentSource}
    />
  );
}
