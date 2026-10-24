import { parseDecimal, type Currency } from "@/lib/format/format";
import type { CostInput } from "@/lib/portfolio/position";
import type { StoredPortfolio } from "@/lib/portfolio/store";

// Estado do formulário como o Visitante digita (texto) e a conversão para o que fica guardado.

export type Row = { id: string; kind: "aporte" | "venda"; date: string; amount: string; currency: Currency; btc: string };
export type CostForm = {
  mode: "total" | "aportes";
  amount: string;
  currency: Currency;
  btc: string;
  date: string;
  averagePrice: string;
  rows: Row[];
};

export const FIRST_DAY = "2011-08-18";
const DAY_MS = 86_400_000;

const toInput = (ms: number | undefined) => (ms === undefined ? "" : new Date(ms).toISOString().slice(0, 10));
const fromInput = (text: string) => {
  const [y, m, d] = text.split("-").map(Number);
  return y && m && d ? Date.UTC(y, m - 1, d) : null;
};
const decimalText = (n: number | undefined, digits: number) =>
  n === undefined ? "" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(n);

export const newRow = (kind: Row["kind"], currency: Currency): Row => ({
  id: crypto.randomUUID(),
  kind,
  date: "",
  amount: "",
  currency,
  btc: "",
});

export function formFrom(stored: StoredPortfolio | null): CostForm {
  const cost = stored?.cost;
  const base: CostForm = { mode: "total", amount: "", currency: "BRL", btc: decimalText(stored?.btc, 8), date: "", averagePrice: "", rows: [] };
  if (!cost) return base;
  if (cost.kind === "total") {
    return {
      ...base,
      amount: decimalText(cost.amount, 2),
      currency: cost.currency,
      date: toInput(cost.date),
      averagePrice: decimalText(cost.averagePrice, 2),
    };
  }
  const rows: Row[] = [
    ...cost.aportes.map((a) => ({ id: a.id, kind: "aporte" as const, date: toInput(a.date), amount: decimalText(a.amount, 2), currency: a.currency, btc: decimalText(a.btc, 8) })),
    ...cost.vendas.map((v) => ({ id: v.id, kind: "venda" as const, date: toInput(v.date), amount: decimalText(v.amount, 2), currency: v.currency, btc: decimalText(v.btc, 8) })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return { ...base, mode: "aportes", currency: rows[0]?.currency ?? "BRL", rows };
}

type Parsed = { ok: true; cost: CostInput | null; btc?: number } | { ok: false; error: string };

/** Valida o formulário. Com a Binance, a quantidade vem da conta e o custo pode ficar para depois. */
export function parseForm(form: CostForm, source: StoredPortfolio["source"], today: number): Parsed {
  const validDate = (text: string) => {
    const ms = fromInput(text);
    return ms !== null && ms >= fromInput(FIRST_DAY)! && ms <= today + DAY_MS ? ms : null;
  };

  if (form.mode === "total") {
    const amount = parseDecimal(form.amount, "money");
    if (!form.amount.trim() && source === "binance") return { ok: true, cost: null };
    if (!amount || amount <= 0) return { ok: false, error: "Informe o Total investido, maior que zero." };
    const btc = source === "manual" && form.btc.trim() ? parseDecimal(form.btc, "btc") : undefined;
    if (btc !== undefined && (!btc || btc <= 0)) return { ok: false, error: "A quantidade de bitcoin precisa ser maior que zero." };
    const date = form.date ? validDate(form.date) : undefined;
    if (date === null) return { ok: false, error: "A data da compra precisa estar entre agosto de 2011 e hoje." };
    const averagePrice = source === "manual" && btc === undefined && form.averagePrice.trim() ? parseDecimal(form.averagePrice, "money") : undefined;
    if (averagePrice !== undefined && (!averagePrice || averagePrice <= 0)) return { ok: false, error: "O preço médio precisa ser maior que zero." };
    return {
      ok: true,
      cost: { kind: "total", amount, currency: form.currency, ...(date !== undefined && { date }), ...(averagePrice !== undefined && { averagePrice }) },
      ...(btc !== undefined && { btc }),
    };
  }

  const aportes: Extract<CostInput, { kind: "aportes" }>["aportes"] = [];
  const vendas: Extract<CostInput, { kind: "aportes" }>["vendas"] = [];
  for (const [i, row] of form.rows.entries()) {
    const label = `${row.kind === "aporte" ? "Aporte" : "Venda"} da linha ${i + 1}`;
    const date = validDate(row.date);
    if (date === null) return { ok: false, error: `${label}: informe uma data entre agosto de 2011 e hoje.` };
    const amount = row.amount.trim() ? parseDecimal(row.amount, "money") : undefined;
    const btc = row.btc.trim() ? parseDecimal(row.btc, "btc") : undefined;
    if (amount === null || (amount !== undefined && amount <= 0)) return { ok: false, error: `${label}: o valor precisa ser maior que zero.` };
    if (btc === null || (btc !== undefined && btc <= 0)) return { ok: false, error: `${label}: a quantidade precisa ser maior que zero.` };
    if (row.kind === "aporte") {
      if (amount === undefined) return { ok: false, error: `${label}: informe quanto pagou.` };
      aportes.push({ id: row.id, date, amount, currency: row.currency, ...(btc !== undefined && { btc }) });
    } else {
      if (btc === undefined) return { ok: false, error: `${label}: informe quantos bitcoins vendeu.` };
      vendas.push({ id: row.id, date, btc, currency: row.currency, ...(amount !== undefined && { amount }) });
    }
  }
  if (aportes.length === 0) {
    if (source === "binance" && vendas.length === 0) return { ok: true, cost: null };
    return { ok: false, error: "Adicione pelo menos um aporte." };
  }
  return { ok: true, cost: { kind: "aportes", aportes, vendas } };
}
