import Link from "next/link";
import { formatDate, capitalize } from "@/lib/format";
import type { EventRecord } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Day = { date: string; events: EventRecord[]; deadlines: number };

export function CalendarStrip({ days, today }: { days: Day[]; today: string }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label="Prossimi 14 giorni">
      {days.map((d) => {
        const isToday = d.date === today;
        const hasEvent = d.events.length > 0;
        const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
        const weekend = weekday === 0 || weekday === 6;
        const label = `${capitalize(formatDate(d.date, "long"))}${hasEvent ? `: ${d.events.map((e) => e.title).join(", ")}` : ""}${d.deadlines ? `, ${d.deadlines} scadenze` : ""}`;
        const body = (
          <>
            <span className={cn("text-[11px] leading-none", isToday ? "text-paper/70" : "text-ash")}>
              {formatDate(d.date, "weekday").slice(0, 3)}
            </span>
            <span className="tabular mt-1 text-[17px] leading-none font-semibold">{formatDate(d.date, "day")}</span>
            <span className="mt-1.5 flex h-2 items-center gap-1">
              {hasEvent ? <span className={cn("size-2 rounded-full border-[1.5px]", isToday ? "border-paper" : "border-brand")} /> : null}
              {d.deadlines ? <span className={cn("size-1.5 rounded-full", isToday ? "bg-paper/70" : "bg-ash/50")} /> : null}
            </span>
          </>
        );
        const cls = cn(
          "flex h-[68px] flex-col items-center justify-center rounded-[12px] border transition-colors",
          isToday ? "border-ink bg-ink text-paper" : hasEvent ? "border-brand/30 bg-ivory hover:border-brand" : "border-transparent",
          !isToday && !hasEvent && weekend && "bg-sand/40",
        );
        return (
          <li key={d.date}>
            {hasEvent ? (
              <Link href={`/eventi/${d.events[0].id}`} aria-label={label} className={cls}>
                {body}
              </Link>
            ) : (
              <div aria-label={label} className={cls}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
