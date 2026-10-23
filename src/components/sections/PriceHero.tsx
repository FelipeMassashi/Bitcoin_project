"use client";

import { Explain } from "@/components/ui/Explain";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatSignedPercent, type Currency } from "@/lib/format/format";
import { BTC_SYMBOL, candleIn } from "@/lib/market/currency";
import { useLiveTickers } from "@/lib/market/live";
import { useDailySeries } from "@/lib/market/queries";
import { useCurrency } from "@/lib/preferences";

const CURRENCIES = [
  { value: "BRL", label: "R$ BRL" },
  { value: "USD", label: "US$ USD" },
] as const satisfies readonly { value: Currency; label: string }[];

const OTHER: Record<Currency, Currency> = { BRL: "USD", USD: "BRL" };

function Change({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`num text-[0.95rem] font-medium ${up ? "text-up" : "text-down"}`}>
        <span aria-hidden="true">{up ? "▲" : "▼"} </span>
        {formatSignedPercent(value)}
      </dd>
    </div>
  );
}

export function PriceHero() {
  const [currency, setCurrency] = useCurrency();
  const daily = useDailySeries();
  const tickers = useLiveTickers();
  const ticker = tickers[BTC_SYMBOL[currency]];
  const candles = daily.data?.map((p) => candleIn(p, currency));
  const price = ticker?.last ?? candles?.at(-1)?.close;
  const otherPrice = tickers[BTC_SYMBOL[OTHER[currency]]]?.last;
  const dollar = tickers.USDTBRL?.last ?? daily.data?.at(-1)?.usdBrl;

  const changeSince = (days: number) => {
    const ref = candles?.at(-1 - days)?.close;
    return price && ref ? price / ref - 1 : null;
  };
  const changes = { d1: ticker?.change24h ?? changeSince(1), d7: changeSince(7), d30: changeSince(30) };
  const changeNow =
    changes.d1 !== null && changes.d30 !== null
      ? `${formatSignedPercent(changes.d1)} em 24 horas e ${formatSignedPercent(changes.d30)} em 30 dias.`
      : undefined;

  return (
    <section aria-labelledby="preco-titulo" className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 id="preco-titulo" className="flex items-center gap-2 text-sm text-muted">
          Quanto vale 1 bitcoin agora
          <Explain id="preco" now={dollar ? `1 dólar vale ${formatMoney(dollar, "BRL")} (cotação USDT/BRL da Binance).` : undefined} />
        </h1>
        {price ? (
          <p className="num mt-2 text-[2.6rem] leading-none font-light tracking-[-0.03em] md:text-figure">
            {formatMoney(price, currency)}
          </p>
        ) : (
          <Skeleton className="mt-2 h-14 w-80 max-w-full" />
        )}
        <p className="num mt-2 flex min-h-5 flex-wrap gap-x-4 text-sm text-muted">
          {otherPrice && <span>{formatMoney(otherPrice, OTHER[currency])} em {OTHER[currency] === "USD" ? "dólares" : "reais"}</span>}
          {dollar && <span>Dólar a {formatMoney(dollar, "BRL")}</span>}
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${tickers.connected ? "bg-up" : "bg-line-strong"}`} />
            {tickers.connected ? "ao vivo" : "conectando…"}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-4 md:items-end">
        <Segmented name="moeda" label="Moeda" options={CURRENCIES} value={currency} onChange={setCurrency} />
        <dl className="flex gap-6">
          <Change label="24 horas" value={changes.d1} />
          <Change label="7 dias" value={changes.d7} />
          <Change label="30 dias" value={changes.d30} />
          <div className="self-end pb-0.5">
            <Explain id="variacao" now={changeNow} />
          </div>
        </dl>
      </div>
    </section>
  );
}
