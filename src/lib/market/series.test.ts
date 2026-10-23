import { describe, expect, it } from "vitest";
import type { Candle } from "./klines";
import { buildDailySeries } from "./series";

const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const flat = (iso: string, price: number, volume = 1): Candle => ({
  time: t(iso), open: price, high: price, low: price, close: price, volume,
});

describe("buildDailySeries", () => {
  it("usa o histórico antigo até a Binance começar e descarta a sobreposição", () => {
    const series = buildDailySeries({
      legacyUsd: [flat("2017-08-15", 100), flat("2017-08-16", 110), flat("2017-08-17", 999)],
      btcUsdt: [flat("2017-08-17", 120), flat("2017-08-18", 130)],
      btcBrl: [],
      usdtBrl: [],
      ptax: [{ time: t("2017-08-15"), rate: 3 }],
    });
    expect(series.map((p) => p.usd.close)).toEqual([100, 110, 120, 130]);
  });

  it("antes do par BTCBRL converte pelo câmbio do dia, repetindo a última PTAX em fins de semana", () => {
    const series = buildDailySeries({
      legacyUsd: [flat("2017-08-18", 100), flat("2017-08-19", 200)], // sexta e sábado
      btcUsdt: [],
      btcBrl: [],
      usdtBrl: [],
      ptax: [{ time: t("2017-08-18"), rate: 3.2 }],
    });
    expect(series.map((p) => p.usdBrl)).toEqual([3.2, 3.2]);
    expect(series.map((p) => p.brl.close)).toEqual([320, 640]);
  });

  it("depois que o par BTCBRL existe usa o preço real em reais e o câmbio USDT/BRL", () => {
    const series = buildDailySeries({
      legacyUsd: [],
      btcUsdt: [flat("2020-10-13", 11000)],
      btcBrl: [flat("2020-10-13", 62000)],
      usdtBrl: [flat("2020-10-13", 5.6)],
      ptax: [{ time: t("2020-10-13"), rate: 5.55 }],
    });
    expect(series[0].brl.close).toBe(62000);
    expect(series[0].usdBrl).toBe(5.6);
  });

  it("preenche dia faltando com o fechamento anterior e volume zero", () => {
    const series = buildDailySeries({
      legacyUsd: [flat("2014-01-01", 800), flat("2014-01-03", 820)],
      btcUsdt: [],
      btcBrl: [],
      usdtBrl: [],
      ptax: [{ time: t("2013-12-31"), rate: 2.35 }],
    });
    expect(series.map((p) => p.time)).toEqual([t("2014-01-01"), t("2014-01-02"), t("2014-01-03")]);
    expect(series[1].usd).toEqual({ time: t("2014-01-02"), open: 800, high: 800, low: 800, close: 800, volume: 0 });
  });

  it("em dia sem cotação USDT/BRL repete a última cotação conhecida, não a PTAX antiga", () => {
    const series = buildDailySeries({
      legacyUsd: [],
      btcUsdt: [flat("2023-05-01", 30000), flat("2023-05-02", 31000)],
      btcBrl: [],
      usdtBrl: [flat("2023-05-01", 5.0)],
      ptax: [{ time: t("2020-10-09"), rate: 5.6 }],
    });
    expect(series.map((p) => p.usdBrl)).toEqual([5.0, 5.0]);
  });
});

