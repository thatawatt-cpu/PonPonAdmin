import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StickyActionHeader({
  actions,
  className,
  description,
  eyebrow,
  feedback,
  title,
}: {
  actions?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  feedback?: ReactNode;
  title: ReactNode;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 -mx-4 -mt-4 mb-6 border-b border-border bg-background/90 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:-mx-6 sm:-mt-6 sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-0.5 truncate text-xl font-black tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
            {feedback ? <div className="text-xs">{feedback}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
