"use client";

import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Explain } from "@/components/ui/Explain";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatSignedPercent } from "@/lib/format/format";
import { LoadError } from "@/components/ui/LoadError";
import { useGoalView } from "@/lib/goals/use-goal-view";
import { candleIn } from "@/lib/market/currency";
import { logReturns, type MonteCarloInput } from "@/lib/simulation/monte-carlo";
import { useMonteCarlo } from "@/lib/simulation/use-monte-carlo";
import { useThemeColors } from "@/lib/theme-colors";
import { DAYS_PER_MONTH, SAMPLES, sampleStart, type SampleId } from "./samples";

const PATHS = 5_000;
const BLOCK = 30;
const HORIZON = 730;
const CHECKPOINTS = [
  { days: 91, label: "3 meses" },
  { days: 182, label: "6 meses" },
  { days: 365, label: "12 meses" },
  { days: 730, label: "24 meses" },
] as const;
// Seed fixa: a mesma entrada mostra sempre o mesmo leque.
const SEED = 2026;
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

type Row = { month: number; band80: [number, number]; band50: [number, number]; p50: number };

/** Leque de preços simulados por bootstrap em blocos e a chance de tocar o Preço-alvo em cada prazo. */
export function MonteCarloFan() {
  const { currency, price, target, rise, stableRise, daily } = useGoalView();
  const colors = useThemeColors();
  const [sample, setSample] = useState<SampleId>("4");

  const input = useMemo<MonteCarloInput | null>(() => {
    if (!daily.data || stableRise === undefined || stableRise <= 0) return null;
    const closes = daily.data.map((p) => candleIn(p, currency).close);
    return {
      returns: logReturns(closes.slice(sampleStart(closes.length, sample))),
      horizonDays: HORIZON,
      paths: PATHS,
      block: BLOCK,
      target: 1 + stableRise,
      checkpoints: CHECKPOINTS.map((c) => c.days),
      step: 7,
      seed: SEED,
    };
  }, [daily.data, currency, sample, stableRise]);
  const run = useMonteCarlo(input);

  const rows = useMemo<Row[]>(() => {
    if (run.status !== "done" || price === undefined) return [];
    return run.result.days.map((d, i) => {
      const b = run.result.bands[i];
      return {
        month: d / DAYS_PER_MONTH,
        band80: [b.p10 * price, b.p90 * price],
        band50: [b.p25 * price, b.p75 * price],
        p50: b.p50 * price,
      };
    });
  }, [run, price]);

  if (daily.error) return <LoadError />;
  if (rise === undefined || price === undefined || target === undefined) return <Skeleton className="h-96" />;
  const fmt = (v: number) => formatMoney(v, currency);
  const short = (v: number) => fmt(v).replace(/,\d+$/, "");
  // Enquanto recalcula, o resultado anterior continua na tela (esmaecido).
  const result = "result" in run ? run.result : null;
  const stale = run.status === "running";
  const year = result?.hit[365];

  return (
    <section aria-labelledby="mc-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <h2 id="mc-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
            Qual a chance de chegar ao alvo em cada prazo?
            <Explain
              id="monteCarlo"
              now={year !== undefined ? `Em ${int.format(year * 100)}% dos ${int.format(PATHS)} caminhos simulados, o preço tocou ${fmt(target)} em até 12 meses.` : undefined}
            />
          </h2>
          <p className="mt-1 text-sm text-muted">
            {rise <= 0
              ? "O preço de hoje já está acima do seu preço-alvo. Aumente a meta para simular."
              : `Alvo: ${fmt(target)}, ${formatSignedPercent(rise, 1)} acima do preço de hoje. Uma estimativa a partir do histórico, não uma previsão.`}
          </p>
        </div>
        <Segmented name="amostra-mc" label="Período usado na simulação" options={SAMPLES} value={sample} onChange={setSample} />
      </header>

      {rise > 0 && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CHECKPOINTS.map((c) => (
              <div key={c.days}>
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  Em até {c.label}
                  {c.days === 91 && <Explain id="chanceAlvo" />}
                </dt>
                <dd className="num mt-1 text-2xl font-light">{result ? `${int.format(result.hit[c.days] * 100)}%` : "…"}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-3 w-4 rounded-sm bg-accent/45" /> P25–P75 (metade dos preços)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-3 w-4 rounded-sm bg-accent/20" /> P10–P90 (80%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded bg-accent" /> mediana
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block w-4 border-t border-dashed border-ink" /> preço-alvo
            </span>
            <Explain id="leque" />
          </div>
          <div className={`mt-2 h-72 transition-opacity md:h-80 ${stale ? "opacity-60" : ""}`} role="img" aria-label="Gráfico em leque dos preços simulados nos próximos 24 meses">
            {run.status === "error" ? (
              <p className="flex h-full items-center justify-center text-sm text-muted">Não foi possível rodar a simulação neste navegador.</p>
            ) : !result || !colors ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} stroke={colors.line} />
                  <XAxis
                    dataKey="month"
                    type="number"
                    domain={[0, 24]}
                    ticks={[0, 3, 6, 12, 18, 24]}
                    tickFormatter={(m: number) => (m === 0 ? "hoje" : `${m} m`)}
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: colors.line }}
                  />
                  <YAxis
                    scale="log"
                    domain={["auto", "auto"]}
                    tickFormatter={short}
                    tick={{ fill: colors.muted, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={86}
                  />
                  <Tooltip
                    cursor={{ stroke: colors["line-strong"] }}
                    content={({ active, payload }) => {
                      const r = payload?.[0]?.payload as Row | undefined;
                      if (!active || !r) return null;
                      return (
                        <div className="num rounded-control border border-line-strong bg-surface px-3 py-2 text-xs leading-relaxed text-ink">
                          <p className="font-medium">{r.month < 0.5 ? "Hoje" : `Daqui a ${int.format(r.month)} ${Math.round(r.month) === 1 ? "mês" : "meses"}`}</p>
                          <p>Mediana: {short(r.p50)}</p>
                          <p>Metade entre {short(r.band50[0])} e {short(r.band50[1])}</p>
                          <p>80% entre {short(r.band80[0])} e {short(r.band80[1])}</p>
                        </div>
                      );
                    }}
                  />
                  <Area dataKey="band80" stroke="none" fill={colors.accent} fillOpacity={0.18} isAnimationActive={false} />
                  <Area dataKey="band50" stroke="none" fill={colors.accent} fillOpacity={0.4} isAnimationActive={false} />
                  <Line dataKey="p50" stroke={colors.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <ReferenceLine y={target} stroke={colors.ink} strokeDasharray="4 4" ifOverflow="extendDomain" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Eixo de preço em escala logarítmica: a mesma distância vertical é a mesma variação percentual.</p>
        </>
      )}

      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <div className="mt-2 max-w-2xl space-y-1.5 leading-relaxed">
          <p>
            {int.format(PATHS)} caminhos de 24 meses. Cada um emenda trechos de {BLOCK} dias seguidos de variações diárias reais,
            sorteados do período escolhido ({SAMPLES.find((s) => s.value === sample)!.label.toLowerCase()}), em{" "}
            {currency === "BRL" ? "reais" : "dólares"}. Trechos inteiros preservam as sequências de alta e de queda.
          </p>
          <p>
            A chance de cada prazo é a fração dos caminhos em que algum fechamento tocou o preço-alvo até ali, mesmo que caísse
            depois. A simulação supõe que o futuro se pareça com o período escolhido: com 4 anos, um ciclo inteiro; com mais,
            entram as altas muito maiores do começo do bitcoin. Não considera taxas.
          </p>
        </div>
      </details>
    </section>
  );
}
