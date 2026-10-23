// Gera os arquivos de histórico que nunca mudam e por isso ficam no repositório:
//   public/data/btc-usd-legacy.json  BTC/USD diário da Bitstamp, 18/08/2011 → véspera da Binance
//   public/data/ptax.json            dólar PTAX (venda) do Banco Central, 2011 → véspera do par USDT/BRL
// Formato compacto: candles [tempoMs, abertura, máxima, mínima, fechamento, volume]; PTAX [tempoMs, cotação].
// Uso: npm run history (Node 22.18+ executa TypeScript direto)
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";

const BINANCE_BTCUSDT_START = Date.UTC(2017, 7, 17); // primeiro candle diário de BTCUSDT
const BINANCE_USDTBRL_START = Date.UTC(2020, 9, 13); // primeiro candle diário de USDTBRL
const BITSTAMP_START_S = 1_313_000_000; // agosto de 2011

const num = z.string().transform(Number);
const bitstampPage = z.object({
  data: z.object({
    ohlc: z.array(
      z.object({ timestamp: num, open: num, high: num, low: num, close: num, volume: num }),
    ),
  }),
});

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json();
}

async function bitstamp(): Promise<number[][]> {
  const rows: number[][] = [];
  let start = BITSTAMP_START_S;
  for (;;) {
    const url = `https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=86400&limit=1000&start=${start}`;
    const page = bitstampPage.parse(await fetchJson(url)).data.ohlc;
    const fresh = page.filter((c) => c.timestamp * 1000 < BINANCE_BTCUSDT_START && c.timestamp >= start);
    for (const c of fresh) rows.push([c.timestamp * 1000, c.open, c.high, c.low, c.close, c.volume]);
    const last = page.at(-1);
    if (!last || fresh.length === 0 || last.timestamp * 1000 >= BINANCE_BTCUSDT_START) break;
    start = last.timestamp + 86_400;
  }
  return rows;
}

const ptaxPage = z.array(z.object({ data: z.string(), valor: z.string().transform(Number) }));

async function ptax(): Promise<number[][]> {
  const rows: number[][] = [];
  for (let year = 2011; year <= 2020; year++) {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial=01/01/${year}&dataFinal=31/12/${year}`;
    for (const { data, valor } of ptaxPage.parse(await fetchJson(url))) {
      const [d, m, y] = data.split("/").map(Number);
      const time = Date.UTC(y, m - 1, d);
      if (time < BINANCE_USDTBRL_START) rows.push([time, valor]);
    }
  }
  return rows;
}

const [candles, fx] = await Promise.all([bitstamp(), ptax()]);
await mkdir("public/data", { recursive: true });
await writeFile("public/data/btc-usd-legacy.json", JSON.stringify(candles));
await writeFile("public/data/ptax.json", JSON.stringify(fx));
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
console.log(`Bitstamp: ${candles.length} dias (${day(candles[0][0])} → ${day(candles.at(-1)![0])})`);
console.log(`PTAX: ${fx.length} dias úteis (${day(fx[0][0])} → ${day(fx.at(-1)![0])})`);
