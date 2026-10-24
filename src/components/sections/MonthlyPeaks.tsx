"use client";

import { useMemo, useState } from "react";
import { Explain } from "@/components/ui/Explain";
import { LoadError } from "@/components/ui/LoadError";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatSignedPercent } from "@/lib/format/format";
import { monthlyStats, type MonthStats } from "@/lib/indicators/monthly";
import { BTC_SYMBOL, candleIn } from "@/lib/market/currency";
import { useLiveTickers } from "@/lib/market/live";
import { useDailySeries } from "@/lib/market/queries";
import { useCurrency } from "@/lib/preferences";

const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
const shortMonth = (time: number) => {
  const text = shortMonthFmt.format(time).replace(".", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const monthDate = (m: MonthStats) => Date.UTC(m.year, m.month - 1, 1);

function Signed({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "text-up" : "text-down"}>
      <span aria-hidden="true">{value >= 0 ? "▲" : "▼"} </span>
      {formatSignedPercent(value)}
    </span>
  );
}

export function MonthlyPeaks() {
  const [currency] = useCurrency();
  const daily = useDailySeries();
  const live = useLiveTickers()[BTC_SYMBOL[currency]]?.last;
  const [showAll, setShowAll] = useState(false);

  const months = useMemo(() => {
    const candles = daily.data?.map((p) => candleIn(p, currency)) ?? [];
    return monthlyStats(candles);
  }, [daily.data, currency]);

  if (daily.error) return <LoadError />;
  const current = months.at(-1);
  if (daily.isPending || !current) return <Skeleton className="h-[30rem]" />;
  // O preço ao vivo só entra se ainda for o mesmo mês da última vela (aba aberta na virada do mês).
  const sameMonth = new Date().getUTCMonth() + 1 === current.month;
  const price = live && sameMonth ? live : current.close;
  const high = Math.max(current.high, price);
  const low = Math.min(current.low, price);
  const highWhen = price > current.high ? "agora" : `em ${dayMonth.format(current.highTime)}`;
  const lowWhen = price < current.low ? "agora" : `em ${dayMonth.format(current.lowTime)}`;
  const fmt = (v: number) => formatMoney(v, currency);
  const position = high > low ? (price - low) / (high - low) : 0.5;
  const ranges = months.slice(1, -1).map((m) => m.range).sort((a, b) => a - b);
  const amplitudeNow = ranges.length
    ? `Neste mês, até agora, ${int.format((high / low - 1) * 100)}%. A amplitude mediana dos meses anteriores foi ${int.format(ranges[ranges.length >> 1] * 100)}%.`
    : undefined;
  // Sem o mês atual (em destaque acima) e sem o primeiro mês da série, que começa no meio (ago/2011).
  const rows = months.slice(1, -1).reverse().slice(0, showAll ? undefined : 12);

  return (
    <section aria-labelledby="mensal-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <h2 id="mensal-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
        O preço está perto do topo ou do fundo do mês?
        <Explain
          id="mesAtual"
          now={`O preço está ${int.format((1 - price / high) * 100)}% abaixo do pico e ${int.format((price / low - 1) * 100)}% acima da mínima de ${monthName.format(monthDate(current))}.`}
        />
      </h2>
      <p className="mt-1 text-sm text-muted">
        Em {monthName.format(monthDate(current))}, até agora, o preço de hoje está a{" "}
        {int.format(position * 100)}% do caminho entre a mínima e o pico do mês.
      </p>

      <div className="mt-5 grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Pico do mês até agora</p>
          <p className="num mt-1 text-2xl font-light tracking-tight">{fmt(high)}</p>
          <p className="num mt-0.5 text-xs text-muted">
            {highWhen} · preço {int.format((1 - price / high) * 100)}% abaixo
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Mínima do mês até agora</p>
          <p className="num mt-1 text-2xl font-light tracking-tight">{fmt(low)}</p>
          <p className="num mt-0.5 text-xs text-muted">
            {lowWhen} · preço {int.format((price / low - 1) * 100)}% acima
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Variação no mês</p>
          <p className="num mt-1 text-2xl font-light tracking-tight">
            <Signed value={price / (months.at(-2)?.close ?? current.open) - 1} />
          </p>
          <p className="num mt-0.5 text-xs text-muted">sobre o fechamento do mês anterior</p>
        </div>
      </div>
      <div className="relative mt-5 h-1.5 rounded-full bg-line" aria-hidden="true">
        <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${position * 100}%` }} />
      </div>
      <div className="num mt-1.5 flex justify-between text-[0.7rem] text-muted" aria-hidden="true">
        <span>mínima</span>
        <span>pico</span>
      </div>

      <h3 className="mt-10 font-medium">Meses anteriores</h3>
      <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela dos meses anteriores">
        <table className="num w-full min-w-[40rem] text-sm whitespace-nowrap">
          <thead>
            <tr className="text-right text-xs text-muted">
              <th className="sticky left-0 bg-surface py-2 pr-4 text-left font-normal">Mês</th>
              <th className="py-2 pr-4 font-normal">Abertura</th>
              <th className="py-2 pr-4 font-normal">Pico</th>
              <th className="py-2 pr-4 font-normal">Mínima</th>
              <th className="py-2 pr-4 font-normal">Fechamento</th>
              <th className="py-2 pr-4 font-normal">Variação</th>
              <th className="py-2 font-normal">
                <span className="inline-flex items-center gap-1">Amplitude <Explain id="amplitude" now={amplitudeNow} /></span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-right">
            {rows.map((m) => (
              <tr key={`${m.year}-${m.month}`}>
                <th scope="row" className="sticky left-0 bg-surface py-2.5 pr-4 text-left font-normal">{shortMonth(monthDate(m))}</th>
                <td className="py-2.5 pr-4">{fmt(m.open)}</td>
                <td className="py-2.5 pr-4">{fmt(m.high)}</td>
                <td className="py-2.5 pr-4">{fmt(m.low)}</td>
                <td className="py-2.5 pr-4">{fmt(m.close)}</td>
                <td className="py-2.5 pr-4"><Signed value={m.change} /></td>
                <td className="py-2.5 text-muted">{int.format(m.range * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        className="mt-3 text-sm text-accent underline-offset-4 hover:underline"
      >
        {showAll ? "Mostrar só os últimos 12 meses" : `Mostrar todos os ${months.length - 2} meses`}
      </button>
      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <p className="mt-2 max-w-2xl leading-relaxed">
          Meses do calendário em horário UTC, como a Binance. Abertura é o primeiro preço do mês, pico e mínima são o maior e
          o menor preço negociado, fechamento é o último. Variação compara o fechamento com o do mês anterior; amplitude é
          quanto o pico ficou acima da mínima. O mês atual inclui o preço ao vivo. Valores na moeda selecionada.
        </p>
      </details>
    </section>
  );
}

export function MonthlyHeatmap() {
  const [currency] = useCurrency();
  const daily = useDailySeries();
  const months = useMemo(
    () => monthlyStats(daily.data?.map((p) => candleIn(p, currency)) ?? []),
    [daily.data, currency],
  );
  if (daily.error) return <LoadError />;
  if (daily.isPending || months.length === 0) return <Skeleton className="h-96" />;

  // O primeiro mês da série começa no meio (agosto de 2011) e não tem mês anterior: fica de fora.
  // O mês atual aparece, marcado como parcial, mas não entra nas medianas.
  const shown = months.slice(1);
  const current = shown.at(-1);
  const closed = shown.slice(0, -1);
  const byYear = new Map<number, (MonthStats | undefined)[]>();
  for (const m of shown) {
    const row = byYear.get(m.year) ?? new Array(12).fill(undefined);
    row[m.month - 1] = m;
    byYear.set(m.year, row);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const medians = MONTH_LABELS.map((_, i) => {
    const values = closed.filter((m) => m.month === i + 1).map((m) => m.change).sort((a, b) => a - b);
    const mid = values.length >> 1;
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  });
  const best = medians.indexOf(Math.max(...medians));
  const worst = medians.indexOf(Math.min(...medians));
  const positiveYears = (i: number) => closed.filter((m) => m.month === i + 1 && m.change > 0).length;
  const yearsOf = (i: number) => closed.filter((m) => m.month === i + 1).length;

  // Intensidade proporcional ao tamanho do movimento, saturando em ±40%.
  const cellStyle = (v: number) => {
    const strength = Math.min(Math.abs(v) / 0.4, 1);
    return { background: `color-mix(in oklab, var(${v >= 0 ? "--up" : "--down"}) ${Math.round(12 + strength * 58)}%, var(--surface))` };
  };

  return (
    <section aria-labelledby="heatmap-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <h2 id="heatmap-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
        Existe mês bom ou ruim para o bitcoin?
        <Explain
          id="heatmap"
          now={current ? `${MONTH_LABELS[current.month - 1]} subiu em ${positiveYears(current.month - 1)} dos ${yearsOf(current.month - 1)} anos anteriores; mediana ${formatSignedPercent(medians[current.month - 1], 0)}.` : undefined}
        />
      </h2>
      <p className="mt-1 text-sm text-muted">
        Pela mediana desde 2011, {MONTH_LABELS[best]} costuma ser o melhor mês ({formatSignedPercent(medians[best], 0)}) e{" "}
        {MONTH_LABELS[worst]} o pior ({formatSignedPercent(medians[worst], 0)}). Mesmo assim, todos os meses já tiveram anos de alta e de queda.
      </p>
      <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Mapa de calor dos retornos mensais">
        <table className="num w-full min-w-[46rem] border-separate border-spacing-0.5 text-[0.72rem]">
          <thead>
            <tr className="text-muted">
              <th className="sticky left-0 w-12 bg-surface py-1 text-left font-normal">Ano</th>
              {MONTH_LABELS.map((m) => (
                <th key={m} className="py-1 font-normal">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year}>
                <th scope="row" className="sticky left-0 bg-surface py-1 pr-2 text-left font-normal text-muted">{year}</th>
                {byYear.get(year)!.map((m, i) =>
                  m ? (
                    <td
                      key={i}
                      style={cellStyle(m.change)}
                      className={`rounded-[3px] px-1 py-1.5 text-center text-ink ${m === current ? "outline-1 -outline-offset-1 outline-dashed outline-ink/50" : ""}`}
                      title={`${MONTH_LABELS[i]} de ${year}: ${formatSignedPercent(m.change)}${m === current ? " (mês em andamento)" : ""}`}
                    >
                      {formatSignedPercent(m.change, 0)}
                    </td>
                  ) : (
                    <td key={i} />
                  ),
                )}
              </tr>
            ))}
            <tr>
              <th scope="row" className="pt-2 pr-2 text-left font-normal text-muted">Mediana</th>
              {medians.map((v, i) => (
                <td key={i} className="pt-2 text-center font-medium">
                  <span className={Math.abs(v) < 0.005 ? "text-muted" : v > 0 ? "text-up" : "text-down"}>{formatSignedPercent(v, 0)}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <p className="mt-2 max-w-2xl leading-relaxed">
          Cada quadrado é o fechamento do mês dividido pelo fechamento do mês anterior, na moeda selecionada. A cor fica mais
          forte quanto maior o movimento (satura em 40%). O quadrado tracejado é o mês em andamento, que não entra na linha
          de medianas. A mediana é o valor do meio entre todos os anos: metade foi melhor, metade pior.
        </p>
      </details>
    </section>
  );
}
