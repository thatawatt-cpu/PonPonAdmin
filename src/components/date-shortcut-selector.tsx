import { cn } from "@/lib/utils";

export type DateShortcut = "today" | "7days" | "30days" | "unlimited";

const shortcuts: { label: string; value: DateShortcut }[] = [
  { label: "วันนี้", value: "today" },
  { label: "7 วัน", value: "7days" },
  { label: "30 วัน", value: "30days" },
  { label: "ไม่จำกัด", value: "unlimited" },
];

export function DateShortcutSelector({
  active,
  onSelect,
}: {
  active: DateShortcut | null;
  onSelect: (shortcut: DateShortcut) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.value}
          type="button"
          onClick={() => onSelect(shortcut.value)}
          className={cn(
            "inline-flex h-9 w-fit flex-none shrink-0 items-center justify-center whitespace-nowrap rounded-full! border px-3 text-xs font-semibold transition-colors",
            active === shortcut.value
              ? "border-foreground bg-foreground text-background shadow-sm"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {shortcut.label}
        </button>
      ))}
    </div>
  );
}
