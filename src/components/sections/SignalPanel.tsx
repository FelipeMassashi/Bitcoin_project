"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SIGNAL_WEIGHTS, ZONE_LIMITS, type IndicatorKey } from "@/config/signal-weights";
import { Explain } from "@/components/ui/Explain";
import { LoadError } from "@/components/ui/LoadError";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatSignedPercent } from "@/lib/format/format";
import { useAnalysis } from "@/lib/market/queries";
import { backtestZones } from "@/lib/signal/backtest";
import { zoneOf, type Zone } from "@/lib/signal/composite";
import { INDICATORS, ZONE_LABEL, notaSentence } from "@/lib/signal/describe";

const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const HORIZONS = [90, 180, 365] as const;
const KEYS = Object.keys(SIGNAL_WEIGHTS) as IndicatorKey[];

const ZONE_TEXT: Record<Zone, string> = { compra: "text-up", neutro: "text-ink", venda: "text-down" };

function signalNow(score: number, zone: Zone) {
  return `Hoje o sinal está em ${int.format(score)}, ${zone === "neutro" ? "na faixa neutra (35 a 65)" : zone === "compra" ? "abaixo de 35, na zona de compra" : "acima de 65, na zona de venda"}.`;
}

function Scale({ score }: { score: number }) {
  return (
    <div className="relative mt-4" aria-hidden="true">
      <div className="flex h-2 overflow-hidden rounded-full">
        <div className="bg-up/35" style={{ width: `${ZONE_LIMITS.buyBelow}%` }} />
        <div className="bg-line-strong/70" style={{ width: `${ZONE_LIMITS.sellAbove - ZONE_LIMITS.buyBelow}%` }} />
        <div className="flex-1 bg-down/35" />
      </div>
      <div
        className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink"
        style={{ left: `${score}%` }}
      />
      <div className="num relative mt-2 h-4 text-[0.7rem] text-muted">
        <span className="absolute left-0">0 barato</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${ZONE_LIMITS.buyBelow}%` }}>{ZONE_LIMITS.buyBelow}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${ZONE_LIMITS.sellAbove}%` }}>{ZONE_LIMITS.sellAbove}</span>
        <span className="absolute right-0">caro 100</span>
      </div>
    </div>
  );
}

/** Nota atual do sinal, para o topo da Visão geral. */
export function SignalSummary() {
  const { analysis, isPending, error } = useAnalysis();
  const today = analysis?.score.at(-1);
  if (error) return <LoadError />;
  if (isPending || !today) return <Skeleton className="h-40" />;
  const zone = zoneOf(today.score);
  return (
    <section aria-labelledby="sinal-resumo" className="rounded-panel border border-line bg-surface p-5 md:p-6">
      <h2 id="sinal-resumo" className="flex items-center gap-2 text-sm text-muted">
        Pelo histórico, o preço de hoje parece caro ou barato?
        <Explain id="sinal" now={signalNow(today.score, zone)} />
      </h2>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="num text-5xl font-light tracking-tight">{int.format(today.score)}</span>
        <span className="text-sm text-muted">de 100</span>
        <span className={`ml-2 text-lg font-medium ${ZONE_TEXT[zone]}`}>{ZONE_LABEL[zone]}</span>
      </div>
      <Scale score={today.score} />
      <Link href="/mercado#sinal" className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline">
        Ver o que compõe o sinal
      </Link>
    </section>
  );
}

export function SignalPanel() {
  const { analysis, daily, fng, isPending, error } = useAnalysis();
  const backtest = useMemo(() => {
    if (!analysis || !daily.data) return null;
    return backtestZones(
      daily.data.map((p) => p.usd.close),
      analysis.score.map((s) => s?.score ?? null),
      HORIZONS,
    );
  }, [analysis, daily.data]);

  const today = analysis?.score.at(-1);
  if (error) return <LoadError />;
  if (isPending || !analysis || !today) return <Skeleton className="h-[36rem]" />;
  const zone = zoneOf(today.score);
  const firstScored = analysis.score.findIndex((s) => s !== null);
  const since = daily.data?.[firstScored]?.time;

  return (
    <section id="sinal" aria-labelledby="sinal-titulo" className="scroll-mt-8 rounded-panel border border-line bg-surface p-4 md:p-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div>
          <h2 id="sinal-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
            Pelo histórico, o preço está caro ou barato?
            <Explain id="sinal" now={signalNow(today.score, zone)} />
          </h2>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="num text-figure font-light">{int.format(today.score)}</span>
            <span className="text-sm text-muted">de 100</span>
          </div>
          <p className={`mt-1 text-lg font-medium ${ZONE_TEXT[zone]}`}>{ZONE_LABEL[zone]}</p>
          <Scale score={today.score} />
          <p className="mt-5 text-sm leading-relaxed text-muted">
            {zone === "compra"
              ? "A maioria dos indicadores está em níveis que, no passado, apareceram perto de preços baixos."
              : zone === "venda"
                ? "A maioria dos indicadores está em níveis que, no passado, apareceram perto de preços altos."
                : "Os indicadores estão divididos ou em níveis intermediários: nem barato nem caro pela história."}
            {fng.isError && " O índice de medo e ganância não carregou; o peso dele foi dividido entre os outros."}
          </p>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm text-muted">
            O que compõe o sinal
            <Explain id="nota" now="Cada linha mostra o valor de hoje, a nota de 0 a 100 e quantos pontos ela somou no sinal." />
          </h3>
          <ul className="mt-3 divide-y divide-line">
            {KEYS.map((key) => {
              const meta = INDICATORS[key];
              const value = analysis.values[key].at(-1);
              const nota = analysis.notes[key].at(-1);
              const part = today.contributions[key];
              return (
                <li key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_9rem_3.5rem]">
                  <span className="flex items-center gap-1.5 text-[0.9rem]">
                    {meta.label}
                    <Explain
                      id={meta.explain}
                      now={
                        value == null || nota == null ? undefined : (
                          <>
                            {meta.read(value)} {notaSentence(key, nota)}
                          </>
                        )
                      }
                    />
                  </span>
                  <span className="num text-right text-sm sm:text-left">{value == null ? "—" : meta.format(value)}</span>
                  <span className="col-span-2 flex items-center gap-2 sm:col-span-1" aria-label={nota == null ? "Sem nota" : `Nota ${int.format(nota)} de 100`}>
                    <span className="relative h-1.5 flex-1 rounded-full bg-line" aria-hidden="true">
                      {nota != null && (
                        <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${nota}%` }} />
                      )}
                    </span>
                    <span className="num w-7 text-right text-xs text-muted">{nota == null ? "—" : int.format(nota)}</span>
                  </span>
                  <span className="num hidden text-right text-xs text-muted sm:block" title="Pontos que este indicador somou no sinal">
                    {part == null ? "fora" : `+${int.format(part)}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Pesos: {KEYS.map((k) => `${INDICATORS[k].label} ${SIGNAL_WEIGHTS[k]}`).join(", ")}.
          </p>
        </div>
      </div>

      {backtest && (
        <div className="mt-10 border-t border-line pt-6">
          <h3 className="flex items-center gap-2 font-medium">
            Quem comprou em cada zona, quanto tinha depois?
            <Explain
              id="backtest"
              now={(() => {
                const buy = backtest.compra[365];
                const sell = backtest.venda[365];
                return buy && sell
                  ? `Um ano depois, a mediana foi ${formatSignedPercent(buy.median, 0)} para quem comprou na zona de compra e ${formatSignedPercent(sell.median, 0)} na zona de venda.`
                  : undefined;
              })()}
            />
          </h3>
          <p className="mt-1 text-sm text-muted">
            Retorno mediano e pior caso, em dólar, de todos os dias desde{" "}
            {since ? new Date(since).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }) : "o início"}.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="num w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 pr-4 font-normal">Comprando na…</th>
                  {HORIZONS.map((h) => (
                    <th key={h} className="py-2 pr-4 font-normal">{h} dias depois</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(["compra", "neutro", "venda"] as const).map((z) => (
                  <tr key={z}>
                    <th scope="row" className={`py-3 pr-4 text-left font-medium ${ZONE_TEXT[z]}`}>{ZONE_LABEL[z]}</th>
                    {HORIZONS.map((h) => {
                      const s = backtest[z][h];
                      return (
                        <td key={h} className="py-3 pr-4 align-top">
                          {s ? (
                            <>
                              <span className={s.median >= 0 ? "text-up" : "text-down"}>{formatSignedPercent(s.median)}</span>
                              <span className="block text-xs text-muted">
                                pior {formatSignedPercent(s.worst)} · {int.format(s.positiveShare * 100)}% no lucro · {int.format(s.count)} dias
                              </span>
                            </>
                          ) : (
                            <span className="text-muted">sem dados</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <details className="mt-6 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <div className="mt-2 max-w-2xl space-y-1.5 leading-relaxed">
          <p>
            Cada indicador vira uma nota de 0 a 100 pela posição do valor de hoje entre todos os dias anteriores (desde 2011,
            com pelo menos um ano de histórico). RSI e medo e ganância já estão nessa escala. O sinal é a média
            ponderada das notas pelos pesos acima; quando um indicador não existe no dia (o medo e ganância só começa em fevereiro de
            2018), o peso dele é dividido entre os demais.
          </p>
          <p>
            Os cálculos usam o preço em dólar, a série mais longa. O teste histórico usa, para cada dia, só os preços
            disponíveis naquele dia. Mas os pesos e as faixas de compra e venda foram escolhidos conhecendo toda a história,
            então o teste tende a parecer melhor do que seria na prática. Os dias se sobrepõem (dois dias seguidos na mesma
            zona contam duas vezes), por isso a contagem de dias não equivale a casos independentes. Resultados passados não
            garantem resultados futuros: é um retrato do histórico, não uma previsão.
          </p>
        </div>
      </details>
    </section>
  );
}
