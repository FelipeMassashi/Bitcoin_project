export type Currency = "BRL" | "USD";

const moneyFormatters: Record<Currency, Intl.NumberFormat> = {
  BRL: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
  USD: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }),
};

export function formatMoney(value: number, currency: Currency): string {
  return moneyFormatters[currency].format(value);
}

const MINUS = "−";

function sign(value: number): string {
  if (value > 0) return "+";
  if (value < 0) return MINUS;
  return "";
}

export function formatSignedMoney(value: number, currency: Currency): string {
  return sign(value) + formatMoney(Math.abs(value), currency);
}

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Recebe uma fração (0,1234) e devolve "+12,34%". */
export function formatSignedPercent(fraction: number): string {
  return sign(fraction) + percentFormatter.format(Math.abs(fraction) * 100) + "%";
}

const btcFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 });

export function formatBtc(amount: number): string {
  return `${btcFormatter.format(amount)} BTC`;
}
