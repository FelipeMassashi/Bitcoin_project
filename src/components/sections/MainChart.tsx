"use client";

import { useMemo, useState } from "react";
import { PriceChart, type Overlay, type PriceLevel, type TradeMarker } from "@/components/charts/PriceChart";
import { Explain } from "@/components/ui/Explain";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ExplicacaoId } from "@/content/explicacoes";
import { formatMoney } from "@/lib/format/format";
import { bollinger, sma, weeklyMovingAverage } from "@/lib/indicators/moving-averages";
import { BTC_SYMBOL, candleIn } from "@/lib/market/currency";
import { useLiveTickers } from "@/lib/market/live";
import { useDailySeries, useIntraday } from "@/lib/market/queries";
import { usePortfolioView } from "@/lib/portfolio/use-portfolio-view";
import { useCurrency } from "@/lib/preferences";

/** Meta padrão até a calculadora de Metas existir. */
const DEFAULT_GOAL = 0.25;

const DAY = 86_400_000;
const PERIODS = [
  { value: "1D", label: "1D", days: 1 },
  { value: "1S", label: "1S", days: 7 },
  { value: "1M", label: "1M", days: 30 },
  { value: "3M", label: "3M", days: 91 },
  { value: "1A", label: "1A", days: 365 },
  { value: "5A", label: "5A", days: 5 * 365 },
  { value: "Tudo", label: "Tudo", days: Infinity },
] as const;
type Period = (typeof PERIODS)[number]["value"];

const OVERLAYS = [
  { id: "mm50", label: "Média 50 dias" },
  { id: "mm200", label: "Média 200 dias" },
  { id: "mm200s", label: "Média 200 semanas" },
  { id: "bollinger", label: "Bollinger" },
] as const satisfies readonly { id: ExplicacaoId; label: string }[];
type OverlayId = (typeof OVERLAYS)[number]["id"];

const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function distance(price: number, reference: number | null | undefined, name: string) {
  if (!reference) return null;
  const diff = price / reference - 1;
  return `${pct.format(Math.abs(diff) * 100)}% ${diff >= 0 ? "acima" : "abaixo"} da ${name}`;
}

export function MainChart() {
  const [currency] = useCurrency();
  const [period, setPeriod] = useState<Period>("1A");
  const [enabled, setEnabled] = useState<Record<OverlayId, boolean>>({
    mm50: false,
    mm200: true,
    mm200s: true,
    bollinger: false,
  });
  const days = PERIODS.find((p) => p.value === period)!.days;
  const intraday = days <= 7;

  const daily = useDailySeries();
  const intradayQuery = useIntraday(days === 1 ? "15m" : "1h", days * DAY, intraday);
  const live = useLiveTickers()[BTC_SYMBOL[currency]]?.last;

  const dailyCandles = useMemo(() => daily.data?.map((p) => candleIn(p, currency)) ?? [], [daily.data, currency]);

  const allOverlays = useMemo(() => {
    const closes = dailyCandles.map((c) => c.close);
    const bands = bollinger(closes, 20, 2);
    return {
      mm50: sma(closes, 50),
      mm200: sma(closes, 200),
      mm200s: weeklyMovingAverage(dailyCandles, 200),
      bandUpper: bands.map((b) => b?.upper ?? null),
      bandLower: bands.map((b) => b?.lower ?? null),
      volume30: sma(dailyCandles.map((c) => c.volume), 30),
    };
  }, [dailyCandles]);

  const overlays = useMemo<Overlay[]>(() => {
    if (intraday) return [];
    const list: Overlay[] = [];
    if (enabled.mm50) list.push({ label: "Média 50d", values: allOverlays.mm50, color: "muted" });
    if (enabled.mm200) list.push({ label: "Média 200d", values: allOverlays.mm200, color: "ink" });
    if (enabled.mm200s) list.push({ label: "Média 200s", values: allOverlays.mm200s, color: "accent", width: 2 });
    if (enabled.bollinger) {
      list.push({ label: "Banda sup.", values: allOverlays.bandUpper, color: "line-strong", dashed: true });
      list.push({ label: "Banda inf.", values: allOverlays.bandLower, color: "line-strong", dashed: true });
    }
    return list;
  }, [allOverlays, enabled, intraday]);

  // Preço médio, Preço-alvo e Aportes do Visitante, quando informados.
  const { position, stored } = usePortfolioView();
  // Marcadores só para Aportes cadastrados um a um (ADR 0002), não para o Total investido com data aproximada.
  const detailed = stored?.cost?.kind === "aportes";
  const average = position?.averagePrice?.[currency];
  const levels = useMemo<PriceLevel[]>(
    () =>
      average
        ? [
            { price: average, label: "seu preço médio", color: "ink" },
            { price: average * (1 + DEFAULT_GOAL), label: "alvo +25%", color: "accent" },
          ]
        : [],
    [average],
  );
  const markers = useMemo<TradeMarker[]>(
    () =>
      intraday || !position || !detailed
        ? []
        : position.entries.flatMap((e) => (e.date === null ? [] : [{ time: Math.floor(e.date / DAY) * DAY, kind: e.kind }])),
    [position, intraday, detailed],
  );

  const intradayCandles = intradayQuery.data?.[currency === "BRL" ? "brl" : "usd"] ?? [];
  const candles = intraday ? intradayCandles : dailyCandles;
  const lastTime = dailyCandles.at(-1)?.time ?? 0;
  const visibleFrom = intraday || !Number.isFinite(days) ? 0 : lastTime - days * DAY;
  const loading = intraday ? intradayQuery.isPending : daily.isPending;
  const error = intraday ? intradayQuery.error : daily.error;

  const price = live ?? dailyCandles.at(-1)?.close;
  const fmt = (v: number) => formatMoney(v, currency);

  // "O que diz agora" de cada linha, gerado a partir dos números de hoje.
  const now: Partial<Record<ExplicacaoId, string>> = {};
  if (price) {
    for (const [id, name] of [["mm50", "média de 50 dias"], ["mm200", "média de 200 dias"], ["mm200s", "média de 200 semanas"]] as const) {
      const ref = allOverlays[id].at(-1);
      const text = distance(price, ref, name);
      if (text && ref) now[id] = `O preço está ${text} (${fmt(ref)}).`;
    }
    const upper = allOverlays.bandUpper.at(-1);
    const lower = allOverlays.bandLower.at(-1);
    if (upper && lower) {
      now.bollinger =
        price > upper
          ? "O preço está acima da banda superior: alta esticada no curto prazo."
          : price < lower
            ? "O preço está abaixo da banda inferior: queda esticada no curto prazo."
            : `O preço está dentro das bandas, a ${pct.format(((price - lower) / (upper - lower)) * 100)}% do caminho entre a inferior (${fmt(lower)}) e a superior (${fmt(upper)}).`;
    }
    const avgVolume = allOverlays.volume30.at(-2);
    const yesterday = dailyCandles.at(-2)?.volume;
    if (avgVolume && yesterday) {
      const diff = yesterday / avgVolume - 1;
      now.volume = `O volume de ontem ficou ${pct.format(Math.abs(diff) * 100)}% ${diff >= 0 ? "acima" : "abaixo"} da média dos 30 dias anteriores.`;
    }
  }

  let reading: string | null = null;
  if (intraday && intradayCandles.length) {
    const high = Math.max(...intradayCandles.map((c) => c.high));
    const low = Math.min(...intradayCandles.map((c) => c.low));
    reading = `${days === 1 ? "Nas últimas 24 horas" : "Nos últimos 7 dias"} o preço oscilou entre ${fmt(low)} e ${fmt(high)}, uma amplitude de ${pct.format((high / low - 1) * 100)}%.`;
  } else if (price && !intraday) {
    const parts = [
      distance(price, allOverlays.mm200.at(-1), "média de 200 dias"),
      distance(price, allOverlays.mm200s.at(-1), "média de 200 semanas"),
    ].filter(Boolean);
    if (parts.length) reading = `Hoje o preço está ${parts.join(" e ")}.`;
  }

  return (
    <section aria-labelledby="grafico-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <h2 id="grafico-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
            O preço está esticado ou perto das médias de longo prazo?
            <Explain id="candles" />
          </h2>
          <p className="mt-1 min-h-5 text-sm text-muted">{reading}</p>
        </div>
        <Segmented name="periodo" label="Período do gráfico" options={PERIODS} value={period} onChange={setPeriod} />
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label="Linhas sobre o gráfico">
        {OVERLAYS.map(({ id, label }) => (
          <span key={id} className="inline-flex items-center gap-1">
            <label className={`inline-flex cursor-pointer items-center gap-2 text-[0.82rem] ${intraday ? "text-muted/60" : "text-ink"}`}>
              <input
                type="checkbox"
                checked={enabled[id]}
                disabled={intraday}
                onChange={(e) => setEnabled((prev) => ({ ...prev, [id]: e.target.checked }))}
                className="size-3.5 accent-[var(--accent)]"
              />
              {label}
            </label>
            <Explain id={id} now={now[id]} />
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-[0.82rem] text-muted">
          Volume <Explain id="volume" now={now.volume} />
        </span>
        {average && (
          <span className="inline-flex items-center gap-1 text-[0.82rem] text-muted">
            Seu preço médio e alvo{" "}
            <Explain
              id="precoAlvo"
              now={`Preço médio ${fmt(average)}; alvo de +25% em ${fmt(average * (1 + DEFAULT_GOAL))}.${price ? ` O preço atual está ${distance(price, average * (1 + DEFAULT_GOAL), "meta")}.` : ""}`}
            />
          </span>
        )}
        {intraday && <span className="text-xs text-muted">As médias valem para os períodos de 1 mês em diante.</span>}
      </div>

      <div className="mt-4">
        {error ? (
          <p role="alert" className="flex h-[22rem] items-center justify-center text-center text-sm text-muted md:h-[28rem]">
            Não foi possível carregar os preços da Binance. Verifique sua conexão e recarregue a página.
          </p>
        ) : loading ? (
          <Skeleton className="h-[24.5rem] md:h-[30.5rem]" />
        ) : (
          <PriceChart
            candles={candles}
            overlays={overlays}
            currency={currency}
            intraday={intraday}
            visibleFrom={visibleFrom}
            live={live}
            levels={levels}
            markers={markers}
          />
        )}
      </div>

      <details className="mt-3 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <div className="mt-2 max-w-2xl space-y-1.5 leading-relaxed">
          <p>
            Preços diários de 2011 a agosto de 2017 vêm da Bitstamp; depois disso, do par BTC/USDT da Binance. Em reais,
            usamos o par BTC/BRL da Binance desde outubro de 2020 e, antes disso, o preço em dólar convertido pela cotação
            PTAX do Banco Central de cada dia. As visões de 1 dia e 1 semana usam velas de 15 minutos e de 1 hora da
            Binance, em horário de Brasília.
          </p>
          <p>
            As médias usam preços de fechamento. A de 200 semanas considera o fechamento de cada semana (segunda a
            domingo, horário UTC) e o preço de hoje como fechamento provisório da semana atual. As bandas de Bollinger
            ficam a 2 desvios-padrão da média dos últimos 20 dias. O volume é a quantidade de bitcoin negociada; antes
            de agosto de 2017 é o volume da Bitstamp, bem menor que o da Binance.
          </p>
        </div>
      </details>
    </section>
  );
}
