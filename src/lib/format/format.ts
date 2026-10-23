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

const percentFormatters = [0, 1, 2].map(
  (digits) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }),
);

/** Recebe uma fração (0,1234) e devolve "+12,34%". Valores que arredondam para zero ficam sem sinal. */
export function formatSignedPercent(fraction: number, digits: 0 | 1 | 2 = 2): string {
  const rounded = Math.round(Math.abs(fraction) * 100 * 10 ** digits) / 10 ** digits;
  return (rounded === 0 ? "" : sign(fraction)) + percentFormatters[digits].format(rounded) + "%";
}

const btcFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 });

export function formatBtc(amount: number): string {
  return `${btcFormatter.format(amount)} BTC`;
}
