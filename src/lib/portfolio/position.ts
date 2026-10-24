import type { Currency } from "@/lib/format/format";
import type { DailyPoint } from "@/lib/market/series";

/** Um valor nas duas moedas. */
export type Money = Record<Currency, number>;

export type Aporte = { id: string; date: number; amount: number; currency: Currency; btc?: number };
/** Venda registrada pelo Visitante; sem o valor recebido, usa o fechamento do dia. */
export type Venda = { id: string; date: number; btc: number; amount?: number; currency: Currency };

export type CostInput =
  | {
      kind: "total";
      amount: number;
      currency: Currency;
      /** Data aproximada da compra: dá a cotação do dólar e, sem quantidade, o preço para estimá-la. */
      date?: number;
      /** Preço médio pago, na mesma moeda do Total investido, para estimar a quantidade. */
      averagePrice?: number;
    }
  | { kind: "aportes"; aportes: Aporte[]; vendas: Venda[] };

export type PositionEntry = {
  kind: "aporte" | "venda";
  id: string;
  /** null quando o Visitante informou só o Total investido, sem data. */
  date: number | null;
  btc: number;
  /** A quantidade saiu do preço histórico, não foi informada. */
  btcEstimated: boolean;
  /** Custo do aporte ou valor recebido na venda. */
  value: Money;
  price: Money;
};

export type Position = {
  btc: number;
  /** Total investido no BTC ainda em posse. */
  invested: Money;
  averagePrice: Money | null;
  realized: Money;
  entries: PositionEntry[];
  /** Algum valor foi convertido pela cotação de hoje, por falta de data. */
  fxAssumedToday: boolean;
  /** Alguma venda vendeu mais bitcoin do que havia naquela data (dado inconsistente). */
  oversold: boolean;
};

const EPSILON = 1e-9;

/** Parte do custo que sai com uma venda: proporcional à fração vendida, sem passar do custo todo. */
export function costOfSale(invested: number, held: number, sold: number): number {
  return held > EPSILON ? invested * Math.min(1, sold / held) : 0;
}

const DAY_MS = 86_400_000;
const zero = (): Money => ({ BRL: 0, USD: 0 });

/** Converte um valor pela cotação do dia (reais por dólar). */
function inBoth(amount: number, currency: Currency, usdBrl: number): Money {
  return currency === "BRL" ? { BRL: amount, USD: amount / usdBrl } : { BRL: amount * usdBrl, USD: amount };
}

function priceOf(value: Money, btc: number): Money {
  return { BRL: value.BRL / btc, USD: value.USD / btc };
}

/** Busca o dia na série; datas fora dela usam o extremo mais próximo. */
function lookup(daily: readonly DailyPoint[], date: number): DailyPoint {
  const day = Math.floor(date / DAY_MS) * DAY_MS;
  const index = Math.round((day - daily[0].time) / DAY_MS);
  return daily[Math.min(Math.max(index, 0), daily.length - 1)];
}

const close = (p: DailyPoint, c: Currency) => (c === "BRL" ? p.brl.close : p.usd.close);

function entriesFor(cost: CostInput, daily: readonly DailyPoint[], held: number | undefined) {
  const today = daily[daily.length - 1];
  if (cost.kind === "total") {
    const at = cost.date === undefined ? today : lookup(daily, cost.date);
    const value = inBoth(cost.amount, cost.currency, at.usdBrl);
    const btc = held ?? cost.amount / (cost.averagePrice ?? close(at, cost.currency));
    const entry: PositionEntry = {
      kind: "aporte",
      id: "total",
      date: cost.date ?? null,
      btc,
      btcEstimated: held === undefined,
      value,
      price: priceOf(value, btc),
    };
    return { entries: [entry], fxAssumedToday: cost.date === undefined };
  }

  const entries: PositionEntry[] = [
    ...cost.aportes.map((a): PositionEntry => {
      const at = lookup(daily, a.date);
      const value = inBoth(a.amount, a.currency, at.usdBrl);
      const btc = a.btc ?? a.amount / close(at, a.currency);
      return { kind: "aporte", id: a.id, date: a.date, btc, btcEstimated: a.btc === undefined, value, price: priceOf(value, btc) };
    }),
    ...cost.vendas.map((v): PositionEntry => {
      const at = lookup(daily, v.date);
      const amount = v.amount ?? v.btc * close(at, v.currency);
      const value = inBoth(amount, v.currency, at.usdBrl);
      return { kind: "venda", id: v.id, date: v.date, btc: v.btc, btcEstimated: false, value, price: priceOf(value, v.btc) };
    }),
  ];
  // Ordem cronológica; no mesmo dia, aportes antes das vendas.
  entries.sort((a, b) => a.date! - b.date! || (a.kind === b.kind ? 0 : a.kind === "aporte" ? -1 : 1));
  return { entries, fxAssumedToday: false };
}

/**
 * Posição do Visitante: quantidade, Total investido em posse, Preço médio ponderado e Lucro realizado,
 * nas duas moedas. Vendas reduzem a quantidade e o custo pelo Preço médio, sem alterá-lo.
 * `held` é a quantidade informada pela Binance ou pelo Visitante; quando existe, substitui a soma dos Aportes.
 */
export function computePosition(cost: CostInput, daily: readonly DailyPoint[], held?: number): Position {
  const { entries, fxAssumedToday } = entriesFor(cost, daily, held);
  let btc = 0;
  let oversold = false;
  const invested = zero();
  const realized = zero();
  for (const e of entries) {
    if (e.kind === "aporte") {
      btc += e.btc;
      for (const c of ["BRL", "USD"] as const) invested[c] += e.value[c];
    } else {
      if (e.btc > btc + EPSILON) oversold = true;
      for (const c of ["BRL", "USD"] as const) {
        const cost = costOfSale(invested[c], btc, e.btc);
        realized[c] += e.value[c] - cost;
        invested[c] -= cost;
      }
      btc = Math.max(0, btc - e.btc);
    }
  }
  if (held !== undefined) btc = held;
  return {
    btc,
    invested,
    averagePrice: btc > EPSILON && invested.USD > EPSILON ? priceOf(invested, btc) : null,
    realized,
    entries,
    fxAssumedToday,
    oversold,
  };
}

export type Valuation = { value: Money; unrealized: Money; unrealizedPct: Money | null };

/** Patrimônio em BTC e Lucro não realizado ao preço atual. */
export function valuation(position: Position, price: Money): Valuation {
  const value = { BRL: position.btc * price.BRL, USD: position.btc * price.USD };
  const unrealized = { BRL: value.BRL - position.invested.BRL, USD: value.USD - position.invested.USD };
  const unrealizedPct =
    position.invested.BRL > 0 && position.invested.USD > 0
      ? { BRL: unrealized.BRL / position.invested.BRL, USD: unrealized.USD / position.invested.USD }
      : null;
  return { value, unrealized, unrealizedPct };
}
