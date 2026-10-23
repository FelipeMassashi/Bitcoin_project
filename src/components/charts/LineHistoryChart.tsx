"use client";

import {
  ColorType,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useThemeColors, type ThemeColors } from "@/lib/theme-colors";

export type ReferenceLine = { value: number; label: string; color: keyof ThemeColors };

type Props = {
  points: readonly { time: number; value: number }[];
  references: readonly ReferenceLine[];
  format: (value: number) => string;
  label: string;
};

const toTime = (ms: number) => Math.floor(ms / 1000) as UTCTimestamp;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** Uma série histórica com linhas de referência (faixas de compra/venda, por exemplo). */
export function LineHistoryChart({ points, references, format, label }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLines = useRef<IPriceLine[]>([]);
  const colors = useThemeColors();

  useEffect(() => {
    if (!container.current) return;
    const c = createChart(container.current, {
      autoSize: true,
      layout: { attributionLogo: false, fontFamily: "var(--font-manrope), system-ui, sans-serif", fontSize: 11 },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, minBarSpacing: 0.05 },
      handleScroll: { vertTouchDrag: false },
    });
    series.current = c.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
      priceLines.current = [];
    };
  }, []);

  useEffect(() => {
    const c = chart.current;
    const s = series.current;
    if (!c || !s || !colors) return;
    c.applyOptions({
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: colors.muted },
      grid: { vertLines: { visible: false }, horzLines: { color: colors.line } },
      crosshair: {
        vertLine: { color: colors["line-strong"], labelBackgroundColor: colors.ink },
        horzLine: { color: colors["line-strong"], labelBackgroundColor: colors.ink },
      },
      localization: { locale: "pt-BR", priceFormatter: format, timeFormatter: (t: Time) => dateFmt.format((t as number) * 1000) },
    });
    s.applyOptions({ color: colors.accent });
    priceLines.current.forEach((line) => s.removePriceLine(line));
    priceLines.current = references.map((r) =>
      s.createPriceLine({
        price: r.value,
        color: colors[r.color],
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: r.label,
      }),
    );
  }, [colors, references, format]);

  useEffect(() => {
    series.current?.setData(points.map((p) => ({ time: toTime(p.time), value: p.value })));
    chart.current?.timeScale().fitContent();
  }, [points]);

  return <div ref={container} role="img" aria-label={label} className="h-64 w-full md:h-72" />;
}
