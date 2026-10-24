"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Explain } from "@/components/ui/Explain";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatSignedPercent } from "@/lib/format/format";
import { daysToRise, timeToTargetStats } from "@/lib/goals/time-to-target";
import { useGoalView } from "@/lib/goals/use-goal-view";
import { LoadError } from "@/components/ui/LoadError";
import { candleIn } from "@/lib/market/currency";
import { useAnalysis } from "@/lib/market/queries";
import { useThemeColors } from "@/lib/theme-colors";
import { DAYS_PER_MONTH, SAMPLES, formatDuration, sampleStart, type SampleId } from "./samples";

const HORIZON = 730;
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const two = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const CONDITIONS = [
  { value: "todos", label: "Todos os dias" },
  { value: "mayer", label: "Mayer parecido" },
  { value: "rsi", label: "RSI parecido" },
] as const;
type Condition = (typeof CONDITIONS)[number]["value"];
// Faixas de "parecido com hoje".
const MAYER_BAND = 0.15;
const RSI_BAND = 5;

type Bucket = { label: string; share: number; months: number | null };

function Stat({ label, value, explain }: { label: string; value: number | null; explain?: boolean }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {label}
        {explain && <Explain id="percentis" />}
      </dt>
      <dd className="num mt-1 text-xl font-light">{value === null ? "não chegou em 2 anos" : `até ${formatDuration(value)}`}</dd>
    </div>
  );
}

/** Quanto tempo, no passado, o preço levou para subir a Alta necessária de hoje. */
export function HistoricalTime() {
  const { currency, stableRise: rise, daily } = useGoalView();
  const { analysis } = useAnalysis();
  const colors = useThemeColors();
  const [sample, setSample] = useState<SampleId>("8");
  const [condition, setCondition] = useState<Condition>("todos");

  const closes = useMemo(() => daily.data?.map((p) => candleIn(p, currency).close) ?? [], [daily.data, currency]);
  // Só a amostra escolhida; `offset` alinha os índices com os indicadores da série inteira.
  const offset = sampleStart(closes.length, sample);
  const days = useMemo(
    () => (rise !== undefined && rise > 0 ? daysToRise(closes.slice(offset), rise, HORIZON) : null),
    [closes, offset, rise],
  );

  // Os filtros por Mayer e RSI dependem da análise, que espera o índice de medo e ganância.
  const filterPending = condition !== "todos" && !analysis;
  const stats = useMemo(() => {
    if (!days || filterPending) return null;
    const values = condition === "mayer" ? analysis?.values.mayer : condition === "rsi" ? analysis?.values.rsiDaily : undefined;
    const today = values?.at(-1) ?? null;
    const band = condition === "mayer" ? MAYER_BAND : RSI_BAND;
    const include = (i: number) => {
      if (condition === "todos") return true;
      const v = values?.[i + offset];
      return today !== null && v != null && Math.abs(v - today) <= band;
    };
    return { ...timeToTargetStats(days, 365, include), today, never2y: days.filter((d, i) => d === null && include(i)).length };
  }, [days, offset, condition, analysis, filterPending]);

  const buckets = useMemo<Bucket[]>(() => {
    if (!stats || stats.samples === 0) return [];
    const counts = Array<number>(24).fill(0);
    for (const d of stats.reached) counts[Math.min(23, Math.floor(d / DAYS_PER_MONTH))]++;
    return [
      ...counts.map((c, m) => ({ label: `${m + 1}`, share: c / stats.samples, months: m })),
      { label: "+2a", share: stats.never2y / stats.samples, months: null },
    ];
  }, [stats]);

  if (daily.error) return <LoadError />;
  if (rise === undefined || !daily.data) return <Skeleton className="h-96" />;

  const title = (
    <h2 id="tempo-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
      Quanto tempo uma alta de {rise > 0 ? formatSignedPercent(rise, 0) : "—"} costumou levar?
      <Explain
        id="tempoHistorico"
        now={
          stats && stats.p50 !== null
            ? `Em metade dos ${condition === "todos" ? "dias analisados" : "dias parecidos com hoje"}, levou até ${formatDuration(stats.p50)}. Em ${int.format(stats.neverWithin * 100)}% não chegou em 1 ano.`
            : undefined
        }
      />
    </h2>
  );

  if (rise <= 0) {
    return (
      <section aria-labelledby="tempo-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
        {title}
        <p className="mt-2 text-sm text-muted">O preço de hoje já está acima do seu preço-alvo. Aumente a meta para ver uma estimativa.</p>
      </section>
    );
  }

  const conditionText =
    condition === "todos" || stats?.today == null
      ? ""
      : condition === "mayer"
        ? ` com Mayer entre ${two.format(stats!.today! - MAYER_BAND)} e ${two.format(stats!.today! + MAYER_BAND)}, como hoje (${two.format(stats!.today!)})`
        : ` com RSI diário entre ${int.format(stats!.today! - RSI_BAND)} e ${int.format(stats!.today! + RSI_BAND)}, como hoje (${int.format(stats!.today!)})`;

  return (
    <section aria-labelledby="tempo-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          {title}
          <p className="mt-1 text-sm text-muted">
            {filterPending
              ? "Carregando os indicadores…"
              : stats && stats.samples > 0
              ? `Olhando ${int.format(stats.samples)} dias${conditionText}: em ${int.format((1 - stats.neverWithin) * 100)}% deles o preço subiu isso em até 1 ano; em ${int.format(stats.neverWithin * 100)}%, não.`
              : "Não há dias suficientes com essas condições. Troque o filtro ou o período."}
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <Segmented name="amostra-historica" label="Período do histórico" options={SAMPLES} value={sample} onChange={setSample} />
          <Segmented name="condicao" label="Condições parecidas com hoje" options={CONDITIONS} value={condition} onChange={setCondition} />
        </div>
      </header>

      {stats && stats.samples > 0 && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="25% dos casos" value={stats.p25} />
            <Stat label="Metade (P50)" value={stats.p50} explain />
            <Stat label="80% dos casos" value={stats.p80} />
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                Não chegou em 1 ano
              </dt>
              <dd className="num mt-1 text-xl font-light">{int.format(stats.neverWithin * 100)}%</dd>
            </div>
          </dl>

          <p className="mt-6 text-xs text-muted">Em quantos meses a alta veio (fração dos dias analisados)</p>
          <div className="mt-2 h-56" role="img" aria-label="Histograma do tempo até a alta, em meses">
            {colors && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke={colors.line} />
                  <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 11 }} tickLine={false} axisLine={{ stroke: colors.line }} interval={1} />
                  <YAxis tickFormatter={(v: number) => `${int.format(v * 100)}%`} tick={{ fill: colors.muted, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    cursor={{ fill: colors.line, opacity: 0.5 }}
                    content={({ active, payload }) => {
                      const b = payload?.[0]?.payload as Bucket | undefined;
                      if (!active || !b) return null;
                      return (
                        <div className="num rounded-control border border-line-strong bg-surface px-3 py-2 text-xs text-ink">
                          {b.months === null
                            ? `${int.format(b.share * 100)}% não chegaram em 2 anos`
                            : `${int.format(b.share * 100)}% chegaram entre ${b.months} e ${b.months + 1} ${b.months === 0 ? "mês" : "meses"}`}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="share" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                    {buckets.map((b) => (
                      <Cell key={b.label} fill={b.months === null ? colors["line-strong"] : colors.accent} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-1 text-right text-xs text-muted">meses · a barra cinza são os casos que não chegaram em 2 anos</p>
        </>
      )}

      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <div className="mt-2 max-w-2xl space-y-1.5 leading-relaxed">
          <p>
            Para cada dia do período, conta quantos dias levou até algum fechamento ficar {formatSignedPercent(rise, 0)} acima
            do fechamento daquele dia, olhando até 2 anos para frente. Para não distorcer o resultado,
            ficam de fora todos os dias dos últimos 2 anos, que ainda não tiveram o prazo inteiro, tenham chegado ou não
            (deixar só os que chegaram tornaria a estimativa otimista). Preços em {currency === "BRL" ? "reais" : "dólares"}.
          </p>
          <p>
            “Parecido com hoje” é Mayer a até {two.format(MAYER_BAND)} do valor de hoje ou RSI diário a até {RSI_BAND} pontos. Os
            dias seguidos se sobrepõem (contam quase a mesma história), e os primeiros anos do bitcoin tiveram altas muito
            mais rápidas: por isso o período padrão são os últimos 8 anos. É o que já aconteceu, não uma previsão.
          </p>
        </div>
      </details>
    </section>
  );
}
