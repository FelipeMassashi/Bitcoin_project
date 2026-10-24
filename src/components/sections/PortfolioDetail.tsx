"use client";

import { useMemo } from "react";
import { ValueChart } from "@/components/charts/ValueChart";
import { openPortfolioDialog } from "@/components/portfolio/dialog-store";
import { Explain } from "@/components/ui/Explain";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBtc, formatMoney } from "@/lib/format/format";
import { portfolioHistory } from "@/lib/portfolio/history";
import { usePortfolioView } from "@/lib/portfolio/use-portfolio-view";
import { useCurrency } from "@/lib/preferences";
import { monthlyDca } from "@/lib/simulation/dca";
import { Signed } from "./PortfolioSummary";

const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const panel = "rounded-panel border border-line bg-surface p-4 md:p-6";

function NeedsDates() {
  return (
    <p className="mt-3 text-sm text-muted">
      Para ver esta análise, informe a data da compra ou os aportes um a um.{" "}
      <button type="button" onClick={() => openPortfolioDialog()} className="text-accent underline-offset-4 hover:underline">
        Editar investimento
      </button>
    </p>
  );
}

/** Gráfico de valor × investido, resultado por Aporte e comparação com DCA mensal. */
export function PortfolioDetail() {
  const [currency] = useCurrency();
  const { stored, position, price, daily } = usePortfolioView();
  const fmt = (v: number) => formatMoney(v, currency);

  const history = useMemo(
    () => (position && daily && position.averagePrice ? portfolioHistory(position, daily, currency) : []),
    [position, daily, currency],
  );
  const aportes = position?.entries.filter((e) => e.kind === "aporte") ?? [];
  const vendas = position?.entries.filter((e) => e.kind === "venda") ?? [];
  const firstDate = aportes.find((e) => e.date !== null)?.date ?? null;
  // Quantidade que os Aportes e vendas explicam; com a Binance, a conta pode ter mais (rendimento do Earn, compras não cadastradas).
  const entriesBtc = Math.max(0, aportes.reduce((s, e) => s + e.btc, 0) - vendas.reduce((s, e) => s + e.btc, 0));

  // O seu resultado × o mesmo dinheiro dividido em compras mensais desde o primeiro Aporte.
  const dca = (() => {
    if (!daily || firstDate === null || !price) return null;
    const total = aportes.reduce((sum, e) => sum + e.value[currency], 0);
    const received = vendas.reduce((sum, e) => sum + e.value[currency], 0);
    const sim = monthlyDca(daily, { start: firstDate, total, currency });
    if (!sim) return null;
    return {
      total,
      sim,
      /** Preço médio de compra dos Aportes, comparável ao do DCA (que não tem vendas). */
      buyAverage: total / aportes.reduce((s, e) => s + e.btc, 0),
      actualResult: entriesBtc * price[currency] + received - total,
      dcaResult: sim.btc * price[currency] - total,
    };
  })();

  if (!stored) return null;
  if (!position || !price) return <Skeleton className="h-96" />;
  if (!position.averagePrice) {
    return (
      <section className={panel}>
        <p className="text-sm text-muted">
          A Binance informa só a quantidade. Para ver o histórico e o resultado de cada aporte, informe quanto você pagou.{" "}
          <button type="button" onClick={() => openPortfolioDialog()} className="text-accent underline-offset-4 hover:underline">
            Informar agora
          </button>
        </p>
      </section>
    );
  }

  const last = history.at(-1);
  const historyReading = last
    ? `Desde ${date.format(history[0].time)}, o seu bitcoin ficou acima do valor investido em ${Math.round(
        (history.filter((p) => p.value >= p.invested).length / history.length) * 100,
      )}% dos dias.`
    : null;
  const binanceDiffers = stored.source === "binance" && Math.abs(entriesBtc - position.btc) > 1e-8;

  return (
    <>
      <section aria-labelledby="historico-carteira" className={panel}>
        <h2 id="historico-carteira" className="flex items-center gap-2 text-lg font-medium tracking-tight">
          O seu bitcoin vale mais do que você investiu?
          <Explain id="valorVsAportado" now={historyReading ?? undefined} />
        </h2>
        {history.length ? (
          <>
            <p className="mt-1 text-sm text-muted">{historyReading}</p>
            <div className="mt-3 flex gap-5 text-xs text-muted" aria-hidden="true">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded bg-accent" /> Valor do seu bitcoin
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-4 border-t border-dashed border-ink" /> Total investido
              </span>
            </div>
            <div className="mt-2">
              <ValueChart points={history} currency={currency} />
            </div>
            {binanceDiffers && (
              <p className="mt-2 text-xs text-muted">
                O gráfico usa a quantidade dos aportes que você informou ({formatBtc(entriesBtc)}); a Binance mostra{" "}
                {formatBtc(position.btc)} hoje.
              </p>
            )}
          </>
        ) : (
          <NeedsDates />
        )}
      </section>

      <section aria-labelledby="por-aporte" className={panel}>
        <h2 id="por-aporte" className="flex items-center gap-2 text-lg font-medium tracking-tight">
          Quais aportes estão no lucro?
          <Explain id="lucroPorAporte" />
        </h2>
        <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela do resultado por aporte">
          <table className="num w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 pr-4 font-normal">Data</th>
                <th className="py-2 pr-4 font-normal">Pagou</th>
                <th className="py-2 pr-4 font-normal">Bitcoin</th>
                <th className="py-2 pr-4 font-normal">Preço pago</th>
                <th className="py-2 pr-4 font-normal">Vale hoje</th>
                <th className="py-2 font-normal">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {aportes.map((e) => {
                const now = e.btc * price[currency];
                const diff = now - e.value[currency];
                return (
                  <tr key={e.id}>
                    <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                      {e.date === null ? "Sem data" : date.format(e.date)}
                    </th>
                    <td className="py-2.5 pr-4">{fmt(e.value[currency])}</td>
                    <td className="py-2.5 pr-4">
                      {e.btcEstimated && <span title="Estimada pelo preço do dia">≈ </span>}
                      {formatBtc(e.btc)}
                    </td>
                    <td className="py-2.5 pr-4">{fmt(e.price[currency])}</td>
                    <td className="py-2.5 pr-4">{fmt(now)}</td>
                    <td className="py-2.5">
                      <Signed value={diff} pct={diff / e.value[currency]} currency={currency} />
                    </td>
                  </tr>
                );
              })}
              {vendas.map((e) => (
                <tr key={e.id} className="text-muted">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                    {date.format(e.date!)}
                  </th>
                  <td className="py-2.5 pr-4" colSpan={5}>
                    Venda de {formatBtc(e.btc)} por {fmt(e.value[currency])} ({fmt(e.price[currency])} por bitcoin)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {aportes.some((e) => e.btcEstimated) && (
          <p className="mt-3 text-xs text-muted">≈ quantidade estimada pelo fechamento do dia do aporte.</p>
        )}
      </section>

      <section aria-labelledby="dca-titulo" className={panel}>
        <h2 id="dca-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
          Comprar um pouco todo mês teria dado mais ou menos?
          <Explain
            id="dca"
            now={
              dca
                ? `Com ${dca.sim.buys.length} compras mensais de ${fmt(dca.sim.buys[0].amount)}, você teria ${formatBtc(dca.sim.btc)}.`
                : undefined
            }
          />
        </h2>
        {dca ? (
          <>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              {Math.abs(dca.actualResult - dca.dcaResult) < 0.005 * dca.total
                ? "Praticamente empatado: seus aportes renderam o mesmo que comprar todo mês."
                : dca.actualResult > dca.dcaResult
                  ? `Seus aportes renderam ${fmt(dca.actualResult - dca.dcaResult)} a mais do que dividir o mesmo valor em compras mensais.`
                  : `Dividir o mesmo valor em compras mensais teria rendido ${fmt(dca.dcaResult - dca.actualResult)} a mais.`}
            </p>
            <dl className="num mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-control border border-line p-4">
                <dt className="text-xs text-muted">Do seu jeito</dt>
                <dd className="mt-1 text-xl">
                  <Signed value={dca.actualResult} pct={dca.actualResult / dca.total} currency={currency} />
                </dd>
                <dd className="mt-1 text-xs text-muted">
                  {formatBtc(entriesBtc)} hoje{vendas.length ? " + vendas" : ""} · preço médio de compra {fmt(dca.buyAverage)}
                </dd>
              </div>
              <div className="rounded-control border border-line p-4">
                <dt className="text-xs text-muted">Comprando todo mês</dt>
                <dd className="mt-1 text-xl">
                  <Signed value={dca.dcaResult} pct={dca.dcaResult / dca.total} currency={currency} />
                </dd>
                <dd className="mt-1 text-xs text-muted">
                  {formatBtc(dca.sim.btc)} · preço médio de compra {fmt(dca.sim.averagePrice)}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <NeedsDates />
        )}
        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
          <div className="mt-2 max-w-2xl space-y-1.5 leading-relaxed">
            <p>
              O valor de cada dia é a quantidade que você tinha naquele dia vezes o preço de fechamento. O Total investido
              soma o custo de cada aporte e, a cada venda, desconta a parte proporcional ao preço médio.
            </p>
            <p>
              No DCA, o total que você aportou ({dca ? fmt(dca.total) : "—"}) é dividido em compras iguais no mesmo dia de
              cada mês, desde o seu primeiro aporte até hoje, pelo preço de fechamento. O seu resultado inclui o que você
              recebeu nas vendas. Não considera taxas.
            </p>
            <p>
              Em {currency === "BRL" ? "reais" : "dólares"}, cada compra entra pela cotação do dólar do dia; por isso o
              resultado em reais e em dólares pode ser diferente.
            </p>
          </div>
        </details>
      </section>
    </>
  );
}
