"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  TickMarkType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney, type Currency } from "@/lib/format/format";
import type { Candle } from "@/lib/market/klines";
import { useThemeColors, type ThemeColors } from "@/lib/theme-colors";

export type Overlay = {
  label: string;
  values: readonly (number | null)[];
  color: keyof ThemeColors;
  width?: 1 | 2;
  dashed?: boolean;
};

type Props = {
  candles: readonly Candle[];
  overlays: readonly Overlay[];
  currency: Currency;
  intraday: boolean;
  /** Início da janela visível (ms). Os dados anteriores continuam carregados para as médias. */
  visibleFrom: number;
  /** Preço ao vivo para atualizar a última vela sem redesenhar a série inteira. */
  live?: number;
};

const toTime = (ms: number) => Math.floor(ms / 1000) as UTCTimestamp;

function withAlpha(hex: string, alpha: number) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

// Velas diárias são datas UTC (como na Binance); intradiárias, horário de Brasília.
function timeFormats(intraday: boolean) {
  const timeZone = intraday ? "America/Sao_Paulo" : "UTC";
  const full = new Intl.DateTimeFormat("pt-BR", intraday
    ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone }
    : { day: "2-digit", month: "short", year: "numeric", timeZone });
  const hour = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone });
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone });
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone });
  const year = new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone });
  return {
    full,
    tick: (time: Time, type: TickMarkType) => {
      const date = new Date((time as number) * 1000);
      if (type === TickMarkType.Year) return year.format(date);
      if (type === TickMarkType.Month) return month.format(date);
      if (type === TickMarkType.DayOfMonth) return day.format(date);
      return hour.format(date);
    },
  };
}

type Bar = Omit<Candle, "volume">;
type Legend = { candle: Bar; overlays: { label: string; value: number | null; color: string }[] };

export function PriceChart({ candles, overlays, currency, intraday, visibleFrom, live }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lineSeries = useRef<ISeriesApi<"Line">[]>([]);
  const liveBarRef = useRef<Bar | null>(null);
  const colors = useThemeColors();
  // Índice da vela sob o cursor; null mostra a última.
  const [hover, setHover] = useState<number | null>(null);
  const formats = useMemo(() => timeFormats(intraday), [intraday]);

  // Máxima e mínima da vela corrente acumulam todos os preços ao vivo recebidos.
  const last = candles.at(-1);
  const [extremes, setExtremes] = useState({ time: 0, high: -Infinity, low: Infinity });
  if (last && live) {
    const base = extremes.time === last.time ? extremes : { time: last.time, high: last.high, low: last.low };
    if (base !== extremes || live > extremes.high || live < extremes.low) {
      setExtremes({ time: last.time, high: Math.max(base.high, live), low: Math.min(base.low, live) });
    }
  }
  const liveBar = useMemo<Bar | null>(
    () =>
      last && live && extremes.time === last.time
        ? { time: last.time, open: last.open, high: extremes.high, low: extremes.low, close: live }
        : null,
    [last, live, extremes],
  );

  // Cria o gráfico uma vez.
  useEffect(() => {
    if (!container.current) return;
    const c = createChart(container.current, {
      autoSize: true,
      layout: { attributionLogo: false, fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 11 },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderVisible: false, rightOffset: 4, minBarSpacing: 0.3 },
      handleScroll: { vertTouchDrag: false },
    });
    candleSeries.current = c.addSeries(CandlestickSeries, { priceLineVisible: false });
    volumeSeries.current = c.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    c.priceScale("volume").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
      lineSeries.current = [];
    };
  }, []);

  // Cores, formato de preço e de datas acompanham tema, moeda e período.
  useEffect(() => {
    const c = chart.current;
    if (!c || !colors) return;
    c.applyOptions({
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: colors.muted },
      grid: { vertLines: { visible: false }, horzLines: { color: withAlpha(colors.line, 0.7) } },
      crosshair: {
        vertLine: { color: colors["line-strong"], labelBackgroundColor: colors.ink },
        horzLine: { color: colors["line-strong"], labelBackgroundColor: colors.ink },
      },
      localization: {
        locale: "pt-BR",
        priceFormatter: (p: number) => formatMoney(p, currency).replace(/,\d+$/, ""),
        timeFormatter: (time: Time) => formats.full.format((time as number) * 1000),
      },
      timeScale: { timeVisible: intraday, secondsVisible: false, tickMarkFormatter: formats.tick },
    });
    candleSeries.current?.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      borderVisible: false,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
    });
  }, [colors, currency, intraday, formats]);

  // Velas e volume.
  useEffect(() => {
    if (!colors || candles.length === 0) return;
    candleSeries.current?.setData(
      candles.map((k) => ({ time: toTime(k.time), open: k.open, high: k.high, low: k.low, close: k.close })),
    );
    volumeSeries.current?.setData(
      candles.map((k) => ({
        time: toTime(k.time),
        value: k.volume,
        color: withAlpha(k.close >= k.open ? colors.up : colors.down, 0.28),
      })),
    );
    const bar = liveBarRef.current;
    if (bar && bar.time === candles[candles.length - 1].time) candleSeries.current?.update({ ...bar, time: toTime(bar.time) });
  }, [candles, colors]);

  // Linhas sobrepostas (médias, bandas).
  useEffect(() => {
    const c = chart.current;
    if (!c || !colors) return;
    lineSeries.current.forEach((s) => c.removeSeries(s));
    lineSeries.current = overlays.map((o) => {
      const s = c.addSeries(LineSeries, {
        color: colors[o.color],
        lineWidth: o.width ?? 1,
        lineStyle: o.dashed ? LineStyle.Dashed : LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      s.setData(o.values.flatMap((v, i) => (v === null ? [] : [{ time: toTime(candles[i].time), value: v }])));
      return s;
    });
  }, [candles, overlays, colors]);

  // Janela visível: só muda quando o período ou os dados mudam, não ao trocar tema ou linhas.
  useEffect(() => {
    if (candles.length === 0) return;
    chart.current?.timeScale().setVisibleRange({
      from: toTime(Math.max(visibleFrom, candles[0].time)),
      to: toTime(candles[candles.length - 1].time),
    });
  }, [candles, visibleFrom]);

  // Preço ao vivo na última vela.
  useEffect(() => {
    liveBarRef.current = liveBar;
    if (liveBar) candleSeries.current?.update({ ...liveBar, time: toTime(liveBar.time) });
  }, [liveBar]);

  // Índice da vela sob o cursor.
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    const index = new Map(candles.map((k, i) => [toTime(k.time) as Time, i]));
    const onMove = (param: { time?: Time }) => {
      setHover(param.time === undefined ? null : (index.get(param.time) ?? null));
    };
    c.subscribeCrosshairMove(onMove);
    return () => c.unsubscribeCrosshairMove(onMove);
  }, [candles]);

  const legendIndex = hover !== null && hover < candles.length ? hover : candles.length - 1;
  const legend: Legend | null =
    candles.length && colors
      ? {
          candle: legendIndex === candles.length - 1 && liveBar ? liveBar : candles[legendIndex],
          overlays: overlays.map((o) => ({ label: o.label, value: o.values[legendIndex] ?? null, color: colors[o.color] })),
        }
      : null;

  const fmt = (v: number) => formatMoney(v, currency);

  return (
    <div>
      <div className="num flex min-h-10 flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted" aria-live="off">
        {legend && (
          <>
            <span className="text-ink">{formats.full.format(legend.candle.time)}</span>
            <span>Abertura <span className="text-ink">{fmt(legend.candle.open)}</span></span>
            <span>Máxima <span className="text-ink">{fmt(legend.candle.high)}</span></span>
            <span>Mínima <span className="text-ink">{fmt(legend.candle.low)}</span></span>
            <span>Fechamento <span className="text-ink">{fmt(legend.candle.close)}</span></span>
            {legend.overlays.map((o) =>
              o.value === null ? null : (
                <span key={o.label} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded" style={{ background: o.color }} />
                  {o.label} <span className="text-ink">{fmt(o.value)}</span>
                </span>
              ),
            )}
          </>
        )}
      </div>
      <div ref={container} className="h-[22rem] w-full md:h-[28rem]" role="img" aria-label="Gráfico de velas do preço do bitcoin" />
    </div>
  );
}
