"use client";

import {
  AreaSeries,
  ColorType,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { formatMoney, type Currency } from "@/lib/format/format";
import type { HistoryPoint } from "@/lib/portfolio/history";
import { useThemeColors } from "@/lib/theme-colors";

const toTime = (ms: number) => Math.floor(ms / 1000) as UTCTimestamp;
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** Patrimônio em BTC (área) contra o Total investido (linha tracejada), dia a dia. */
export function ValueChart({ points, currency }: { points: readonly HistoryPoint[]; currency: Currency }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const value = useRef<ISeriesApi<"Area"> | null>(null);
  const invested = useRef<ISeriesApi<"Line"> | null>(null);
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
    value.current = c.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false });
    invested.current = c.addSeries(LineSeries, { lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, crosshairMarkerVisible: false });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!colors) return;
    chart.current?.applyOptions({
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: colors.muted },
      grid: { vertLines: { visible: false }, horzLines: { color: colors.line } },
      crosshair: {
        vertLine: { color: colors["line-strong"], labelBackgroundColor: colors.ink },
        horzLine: { color: colors["line-strong"], labelBackgroundColor: colors.ink },
      },
      localization: {
        locale: "pt-BR",
        priceFormatter: (p: number) => formatMoney(p, currency).replace(/,\d+$/, ""),
        timeFormatter: (t: Time) => dateFmt.format((t as number) * 1000),
      },
    });
    value.current?.applyOptions({ lineColor: colors.accent, topColor: `${colors.accent}40`, bottomColor: `${colors.accent}05` });
    invested.current?.applyOptions({ color: colors.ink });
  }, [colors, currency]);

  useEffect(() => {
    value.current?.setData(points.map((p) => ({ time: toTime(p.time), value: p.value })));
    invested.current?.setData(points.map((p) => ({ time: toTime(p.time), value: p.invested })));
    chart.current?.timeScale().fitContent();
  }, [points]);

  return <div ref={container} role="img" aria-label="Valor do seu bitcoin comparado com o total investido" className="h-64 w-full md:h-80" />;
}
