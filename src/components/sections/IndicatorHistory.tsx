"use client";

import { useMemo, useState } from "react";
import { LineHistoryChart, type ReferenceLine } from "@/components/charts/LineHistoryChart";
import { Explain } from "@/components/ui/Explain";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ExplicacaoId } from "@/content/explicacoes";
import { ZONE_LIMITS, type IndicatorKey } from "@/config/signal-weights";
import { LoadError } from "@/components/ui/LoadError";
import { formatSignedPercent } from "@/lib/format/format";
import { INDICATORS, THRESHOLDS } from "@/lib/signal/describe";
import { useAnalysis } from "@/lib/market/queries";
import type { Analysis } from "@/lib/signal/analysis";

const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const two = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number) => formatSignedPercent(v, 0);
const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type View = {
  value: string;
  label: string;
  explain: ExplicacaoId;
  /** Indicador do Sinal composto mostrado, quando houver (para reaproveitar a leitura do dia). */
  indicator?: IndicatorKey;
  series: (a: Analysis) => readonly (number | null)[];
  references: ReferenceLine[];
  format: (v: number) => string;
};

const T = THRESHOLDS;
const VIEWS = [
  {
    value: "sinal",
    label: "Sinal",
    explain: "sinal",
    series: (a) => a.score.map((s) => s?.score ?? null),
    references: [
      { value: ZONE_LIMITS.sellAbove, label: "venda", color: "down" },
      { value: ZONE_LIMITS.buyBelow, label: "compra", color: "up" },
    ],
    format: (v) => int.format(v),
  },
  {
    value: "mayer",
    label: "Mayer",
    explain: "mayer",
    indicator: "mayer",
    series: (a) => a.values.mayer,
    references: [
      { value: T.mayer.high, label: "topos", color: "down" },
      { value: 1, label: "média", color: "muted" },
      { value: T.mayer.low, label: "fundos", color: "up" },
    ],
    format: (v) => `${two.format(v)}×`,
  },
  {
    value: "ma200w",
    label: "200 semanas",
    explain: "dist200s",
    indicator: "ma200w",
    series: (a) => a.values.ma200w,
    references: [{ value: 0, label: "na média", color: "up" }],
    format: pct,
  },
  {
    value: "drawdown",
    label: "Queda",
    explain: "drawdown",
    indicator: "drawdown",
    series: (a) => a.values.drawdown,
    references: [{ value: T.drawdownBottoms, label: "fundos anteriores", color: "up" }],
    format: pct,
  },
  {
    value: "fearGreed",
    label: "Medo e ganância",
    explain: "fearGreed",
    indicator: "fearGreed",
    series: (a) => a.values.fearGreed,
    references: [
      { value: T.fearGreed.extremeGreed, label: "ganância extrema", color: "down" },
      { value: T.fearGreed.extremeFear, label: "medo extremo", color: "up" },
    ],
    format: (v) => int.format(v),
  },
  {
    value: "rsiDaily",
    label: "RSI diário",
    explain: "rsiDaily",
    indicator: "rsiDaily",
    series: (a) => a.values.rsiDaily,
    references: [
      { value: T.rsiDaily.high, label: "sobrecomprado", color: "down" },
      { value: T.rsiDaily.low, label: "sobrevendido", color: "up" },
    ],
    format: (v) => int.format(v),
  },
  {
    value: "rsiWeekly",
    label: "RSI semanal",
    explain: "rsiWeekly",
    indicator: "rsiWeekly",
    series: (a) => a.values.rsiWeekly,
    references: [
      { value: T.rsiWeekly.high, label: "sobrecomprado", color: "down" },
      { value: T.rsiWeekly.low, label: "sobrevendido", color: "up" },
    ],
    format: (v) => int.format(v),
  },
  {
    value: "macd",
    label: "MACD",
    explain: "macd",
    indicator: "macd",
    series: (a) => a.values.macd,
    references: [{ value: 0, label: "virada", color: "muted" }],
    format: (v) => formatSignedPercent(v, 1),
  },
] as const satisfies readonly View[];

type ViewId = (typeof VIEWS)[number]["value"];

export function IndicatorHistory() {
  const { analysis, daily, isPending, error } = useAnalysis();
  const [viewId, setViewId] = useState<ViewId>("sinal");
  const view: View = VIEWS.find((v) => v.value === viewId)!;

  const points = useMemo(() => {
    if (!analysis || !daily.data) return [];
    const values = view.series(analysis);
    return daily.data.flatMap((p, i) => (values[i] == null ? [] : [{ time: p.time, value: values[i]! }]));
  }, [analysis, daily.data, view]);

  const last = points.at(-1);
  const below = last ? points.filter((p) => p.value < last.value).length / points.length : 0;
  const reading = last
    ? `Último valor (${dayFmt.format(last.time)}): ${view.format(last.value)}. Em ${int.format(below * 100)}% dos dias desde ${dayFmt.format(points[0].time)} o valor foi menor.`
    : null;
  const now = last && view.indicator ? INDICATORS[view.indicator].read(last.value) : reading ?? undefined;

  if (error) return <LoadError />;
  return (
    <section aria-labelledby="historico-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <h2 id="historico-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
            Onde o indicador está comparado com toda a história?
            <Explain id={view.explain} now={now} />
          </h2>
          <p className="mt-1 min-h-5 text-sm text-muted">{reading}</p>
        </div>
        <Segmented name="indicador" label="Indicador" options={VIEWS} value={viewId} onChange={setViewId} />
      </header>
      <div className="mt-4">
        {isPending ? (
          <Skeleton className="h-64 md:h-72" />
        ) : (
          <LineHistoryChart points={points} references={view.references} format={view.format} label={`Histórico: ${view.label}`} />
        )}
      </div>
      <details className="mt-3 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <div className="mt-2 max-w-2xl space-y-1.5 leading-relaxed">
          <p>
            Todos os indicadores usam o preço diário em dólar desde 2011 (medo e ganância desde fevereiro de 2018). As linhas
            tracejadas são faixas de referência: Mayer {two.format(T.mayer.low)} e {two.format(T.mayer.high)}, queda de{" "}
            {int.format(-T.drawdownBottoms * 100)}% perto dos fundos de 2015, 2018 e 2022, RSI diário {T.rsiDaily.low}/{T.rsiDaily.high},
            RSI semanal {T.rsiWeekly.low}/{T.rsiWeekly.high} e as faixas extremas oficiais do medo e ganância.
          </p>
          <p>
            O MACD aparece como o histograma (diferença entre a linha MACD e a linha de sinal) em proporção do preço, para
            dar para comparar 2013 com hoje. Acima de zero, impulso de alta; abaixo, de queda.
          </p>
        </div>
      </details>
    </section>
  );
}
