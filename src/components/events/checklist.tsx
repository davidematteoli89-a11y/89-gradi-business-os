"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTask, toggleResourceCheck } from "@/app/actions/events";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import type { EventTask, Partner } from "@/lib/domain/types";
import { capitalize, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const PHASES: { key: EventTask["phase"]; label: string }[] = [
  { key: "prima", label: "Prima dell'evento" },
  { key: "carico", label: "Carico" },
  { key: "evento", label: "Durante l'evento" },
  { key: "rientro", label: "Rientro" },
];

export function Checklist({ tasks, partners, today }: { tasks: EventTask[]; partners: Partner[]; today: string }) {
  const [, start] = useTransition();
  const [optimistic, setTasks] = useState(tasks);
  const setDone = (id: string, done: boolean) => setTasks((s) => s.map((t) => (t.id === id ? { ...t, done } : t)));

  return (
    <div className="space-y-6">
      {PHASES.map((ph) => {
        const list = optimistic.filter((t) => t.phase === ph.key);
        if (!list.length) return null;
        return (
          <section key={ph.key}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              {ph.label} <span className="tabular">· {list.filter((t) => t.done).length}/{list.length}</span>
            </h3>
            <ul className="divide-y divide-line rounded-[14px] border border-line bg-ivory">
              {list.map((t) => {
                const late = !t.done && t.dueDate && t.dueDate < today;
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <Checkbox
                      id={`t-${t.id}`}
                      checked={t.done}
                      className="size-5"
                      onCheckedChange={(v) => {
                        const done = v === true;
                        setDone(t.id, done);
                        start(async () => {
                          const res = await toggleTask({ taskId: t.id, done });
                          if (!res.ok) {
                            setDone(t.id, !done);
                            toast.error(res.message);
                          }
                        });
                      }}
                    />
                    <label htmlFor={`t-${t.id}`} className={cn("min-w-0 flex-1 text-[15px]", t.done && "text-muted-foreground line-through")}>
                      {t.label}
                    </label>
                    {t.dueDate ? (
                      <span className={cn("tabular text-[13px]", late ? "font-medium text-amber" : "text-muted-foreground")}>
                        {capitalize(formatDate(t.dueDate))}
                      </span>
                    ) : null}
                    {t.assigneePartnerId ? <PartnerAvatar partner={partners.find((p) => p.id === t.assigneePartnerId)} /> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function ResourceCheck({ id, field, checked, label }: { id: string; field: "loaded" | "returned"; checked: boolean; label: string }) {
  const [, start] = useTransition();
  const [value, setValue] = useState(checked);
  return (
    <Checkbox
      aria-label={label}
      checked={value}
      className="size-5"
      onCheckedChange={(v) => {
        const next = v === true;
        setValue(next);
        start(async () => {
          const res = await toggleResourceCheck({ id, field, value: next });
          if (!res.ok) {
            setValue(!next);
            toast.error(res.message);
          }
        });
      }}
    />
  );
}
