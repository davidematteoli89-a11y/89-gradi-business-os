"use client";

import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = { value: T; label: React.ReactNode; hint?: string };

/** Scelta singola a pulsanti: più rapida di una select su iPhone. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
  wrap,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
  size?: "sm" | "md";
  wrap?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        wrap ? "flex flex-wrap gap-2" : "inline-flex w-full rounded-[12px] bg-sand p-1",
        className,
      )}
      onKeyDown={(e) => {
        if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
        e.preventDefault();
        const i = options.findIndex((o) => o.value === value);
        const next = options[(i + (e.key === "ArrowRight" ? 1 : options.length - 1)) % options.length];
        onChange(next.value);
        (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            data-value={o.value}
            tabIndex={checked ? 0 : -1}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors",
              size === "md" ? "h-10 text-sm" : "h-8 text-[13px]",
              wrap
                ? cn("rounded-full border px-3.5", checked ? "border-ink bg-ink text-paper" : "border-line bg-ivory text-ink hover:border-input")
                : cn("flex-1 rounded-[9px] px-3", checked ? "bg-ivory text-ink shadow-[0_1px_2px_rgb(36_33_31/0.08)]" : "text-ash hover:text-ink"),
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
