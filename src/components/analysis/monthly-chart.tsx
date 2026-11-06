"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatEuro } from "@/lib/money";

// Coppia validata (CVD e contrasto) su superficie avorio: blu per i ricavi, rosso del marchio per i costi.
const config = {
  ricavi: { label: "Ricavi", color: "#1B6FA8" },
  costi: { label: "Costi", color: "#B42332" },
} satisfies ChartConfig;

export type MonthlyPoint = { mese: string; ricavi: number; costi: number };

export function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="mese" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v: number) => (v >= 100000 ? `${(v / 100000).toLocaleString("it-IT", { maximumFractionDigits: 1 })}k €` : `${Math.round(v / 100)} €`)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--sand)", opacity: 0.6 }}
          content={<ChartTooltipContent formatter={(value, name) => (
            <span className="flex w-full justify-between gap-4">
              <span className="text-muted-foreground">{config[name as keyof typeof config]?.label}</span>
              <span className="tabular font-medium">{formatEuro(Number(value), { round: true })}</span>
            </span>
          )} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="ricavi" fill="var(--color-ricavi)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="costi" fill="var(--color-costi)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}
