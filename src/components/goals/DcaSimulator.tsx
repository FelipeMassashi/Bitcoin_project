"use client";

import { useId, useMemo, useState } from "react";
import { ValueChart } from "@/components/charts/ValueChart";
import { Signed } from "@/components/sections/PortfolioSummary";
import { Explain } from "@/components/ui/Explain";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBtc, formatMoney, parseDecimal } from "@/lib/format/format";
import { LoadError } from "@/components/ui/LoadError";
import { BTC_SYMBOL, candleIn } from "@/lib/market/currency";
import { useLiveTickers } from "@/lib/market/live";
import { useDailySeries } from "@/lib/market/queries";
import { useCurrency } from "@/lib/preferences";
import { simulateDca, type Frequency } from "@/lib/simulation/dca";

const FREQUENCIES = [
  { value: "semanal", label: "Toda semana" },
  { value: "mensal", label: "Todo mês" },
] as const satisfies readonly { value: Frequency; label: string }[];
const PERIODS = [
  { value: "1", label: "1 ano", years: 1 },
  { value: "2", label: "2 anos", years: 2 },
  { value: "4", label: "4 anos", years: 4 },
  { value: "8", label: "8 anos", years: 8 },
] as const;
type PeriodId = (typeof PERIODS)[number]["value"];
const DAY = 86_400_000;
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** "E se eu tivesse comprado X toda semana/mês desde tal data?", com os preços reais. */
export function DcaSimulator() {
  const [currency] = useCurrency();
  const daily = useDailySeries();
  const live = useLiveTickers()[BTC_SYMBOL[currency]]?.last;
  const [amountText, setAmountText] = useState("500");
  const [frequency, setFrequency] = useState<Frequency>("mensal");
  const [period, setPeriod] = useState<PeriodId>("4");
  const amountId = useId();
  const amount = parseDecimal(amountText, "money");

  const sim = useMemo(() => {
    const last = daily.data?.at(-1);
    if (!daily.data || !last || !amount || amount <= 0) return null;
    const years = PERIODS.find((p) => p.value === period)!.years;
    return simulateDca(daily.data, { amount, frequency, start: last.time - Math.round(years * 365.25) * DAY, currency });
  }, [daily.data, amount, frequency, period, currency]);

  if (daily.error) return <LoadError />;
  if (!daily.data) return <Skeleton className="h-96" />;
  const fmt = (v: number) => formatMoney(v, currency);
  const price = live ?? candleIn(daily.data[daily.data.length - 1], currency).close;
  const value = sim ? sim.btc * price : 0;
  const result = sim ? value - sim.invested : 0;
  const worst = sim ? sim.history.reduce((min, p) => Math.min(min, p.invested > 0 ? p.value / p.invested - 1 : 0), 0) : 0;

  return (
    <section aria-labelledby="dca-sim-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <h2 id="dca-sim-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
        E se eu comprasse um valor fixo toda semana ou todo mês?
        <Explain
          id="simuladorDca"
          now={sim ? `Com ${sim.buys.length} compras de ${fmt(amount!)}, o resultado hoje seria ${fmt(result)}.` : undefined}
        />
      </h2>

      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={amountId} className="text-sm text-muted">
            Valor de cada compra
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">{currency === "BRL" ? "R$" : "US$"}</span>
            <input
              id={amountId}
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="num w-32 rounded-control border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <Segmented name="frequencia" label="Frequência" options={FREQUENCIES} value={frequency} onChange={setFrequency} />
        <Segmented name="periodo-dca" label="Começando há" options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {sim ? (
        <>
          <p className="mt-5 text-sm text-muted">
            {sim.buys.length} compras de {fmt(amount!)} desde {date.format(sim.buys[0].time)}.
          </p>
          <dl className="num mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                Total investido <Explain id="totalInvestido" />
              </dt>
              <dd className="mt-1 text-lg">{fmt(sim.invested)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Bitcoin acumulado</dt>
              <dd className="mt-1 text-lg">{formatBtc(sim.btc)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                Preço médio <Explain id="precoMedio" />
              </dt>
              <dd className="mt-1 text-lg">{fmt(sim.averagePrice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Valeria hoje</dt>
              <dd className="mt-1 text-lg">{fmt(value)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Resultado</dt>
              <dd className="mt-1 text-lg">
                <Signed value={result} pct={result / sim.invested} currency={currency} />
              </dd>
            </div>
          </dl>
          {worst < -0.05 && (
            <p className="mt-3 text-sm text-muted">
              No pior momento do caminho, o valor ficou {Math.round(-worst * 100)}% abaixo do total investido até ali.
            </p>
          )}
          <div className="mt-4">
            <ValueChart points={sim.history} currency={currency} />
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm text-muted">Digite um valor maior que zero.</p>
      )}

      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <p className="mt-2 max-w-2xl leading-relaxed">
          Cada compra usa o preço de fechamento do dia (UTC), em {currency === "BRL" ? "reais" : "dólares"}, no mesmo dia da
          semana ou do mês da data de início. O valor de hoje usa o preço atual. Não considera taxas, spread nem impostos. É o
          que teria acontecido no passado; os próximos anos podem ser bem diferentes.
        </p>
      </details>
    </section>
  );
}
