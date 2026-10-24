"use client";

import Link from "next/link";
import { openPortfolioDialog } from "@/components/portfolio/dialog-store";
import { Explain } from "@/components/ui/Explain";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ExplicacaoId } from "@/content/explicacoes";
import { formatBtc, formatMoney, formatSignedMoney, formatSignedPercent, type Currency } from "@/lib/format/format";
import { useCurrency } from "@/lib/preferences";
import { usePortfolioView } from "@/lib/portfolio/use-portfolio-view";

const OTHER: Record<Currency, Currency> = { BRL: "USD", USD: "BRL" };

function Stat({ label, explain, now, children }: { label: string; explain: ExplicacaoId; now?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {label}
        <Explain id={explain} now={now} />
      </dt>
      <dd className="num text-[1.05rem]">{children}</dd>
    </div>
  );
}

/** Sinal visual e textual juntos: a cor nunca é a única pista. */
export function Signed({ value, pct, currency }: { value: number; pct?: number | null; currency: Currency }) {
  const tone = value > 0 ? "text-up" : value < 0 ? "text-down" : "text-ink";
  return (
    <span className={tone}>
      <span className="whitespace-nowrap">
        {value !== 0 && <span aria-hidden="true">{value > 0 ? "▲ " : "▼ "}</span>}
        {formatSignedMoney(value, currency)}
      </span>
      {pct != null && <span className="ml-1.5 inline-block text-[0.9em]">({formatSignedPercent(pct, 1)})</span>}
    </span>
  );
}

/** Cards da Visão geral com a posição do Visitante. */
export function PortfolioSummary({ detailLink = true }: { detailLink?: boolean }) {
  const [currency] = useCurrency();
  const { storeLoading, stored, position, valuation, balance } = usePortfolioView();

  if (storeLoading) return <Skeleton className="h-48" />;
  if (!stored) {
    return (
      <section aria-labelledby="posicao-vazia" className="rounded-panel border border-dashed border-line-strong px-6 py-8">
        <h2 id="posicao-vazia" className="font-medium">
          Conecte sua Binance ou informe seu investimento para ver seu resultado
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          Aqui vão aparecer quanto você investiu, quanto vale hoje, seu preço médio e o lucro ou prejuízo, em reais e
          dólares. Tudo fica só neste navegador.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => openPortfolioDialog("binance")}
            className="rounded-control bg-accent px-4 py-2 text-sm font-medium text-surface hover:opacity-90"
          >
            Conectar a Binance
          </button>
          <button
            type="button"
            onClick={() => openPortfolioDialog("manual")}
            className="rounded-control border border-line-strong px-4 py-2 text-sm hover:bg-paper"
          >
            Informar à mão
          </button>
        </div>
      </section>
    );
  }

  if (balance.error && !position) {
    return (
      <section className="rounded-panel border border-line bg-surface p-5 md:p-6">
        <p role="alert" className="text-sm">
          {balance.error.message}
        </p>
        <button type="button" onClick={() => openPortfolioDialog("binance")} className="mt-3 text-sm text-accent underline-offset-4 hover:underline">
          Abrir a conexão
        </button>
      </section>
    );
  }
  if (!position || !valuation) return <Skeleton className="h-48" />;

  const hasCost = position.averagePrice !== null;
  const other = OTHER[currency];
  const pct = valuation.unrealizedPct?.[currency] ?? null;
  const lossNow = hasCost
    ? `Em ${currency === "BRL" ? "reais" : "dólares"}: ${formatSignedMoney(valuation.unrealized[currency], currency)}. Em ${other === "BRL" ? "reais" : "dólares"}: ${formatSignedMoney(valuation.unrealized[other], other)}${valuation.unrealizedPct ? ` (${formatSignedPercent(valuation.unrealizedPct[other], 1)})` : ""}.`
    : undefined;

  return (
    <section aria-labelledby="posicao-titulo" className="rounded-panel border border-line bg-surface p-5 md:p-6">
      <header className="flex items-start justify-between gap-4">
        <h2 id="posicao-titulo" className="flex items-center gap-2 text-sm text-muted">
          Quanto vale o seu bitcoin hoje
          <Explain id="patrimonio" now={`${formatBtc(position.btc)} × preço atual = ${formatMoney(valuation.value[currency], currency)}.`} />
        </h2>
        <button type="button" onClick={() => openPortfolioDialog()} className="text-sm text-accent underline-offset-4 hover:underline">
          Editar
        </button>
      </header>
      <p className="num mt-2 text-4xl font-light tracking-tight">{formatMoney(valuation.value[currency], currency)}</p>
      <p className="num mt-1 text-sm text-muted">
        {formatBtc(position.btc)} · {formatMoney(valuation.value[other], other)}
        {stored.source === "binance" ? " · lido da Binance" : position.entries.some((e) => e.btcEstimated) ? " · quantidade estimada" : ""}
      </p>

      {hasCost ? (
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">
          <Stat label="Lucro não realizado" explain="lucroNaoRealizado" now={lossNow}>
            <Signed value={valuation.unrealized[currency]} pct={pct} currency={currency} />
            <span className="mt-0.5 block text-xs text-muted">
              {formatSignedMoney(valuation.unrealized[other], other)}
              {valuation.unrealizedPct && ` (${formatSignedPercent(valuation.unrealizedPct[other], 1)})`} em{" "}
              {other === "BRL" ? "reais" : "dólares"}
            </span>
          </Stat>
          <Stat label="Total investido" explain="totalInvestido" now={`${formatMoney(position.invested.BRL, "BRL")} ou ${formatMoney(position.invested.USD, "USD")}, pela cotação de cada data.`}>
            {formatMoney(position.invested[currency], currency)}
          </Stat>
          <Stat label="Preço médio" explain="precoMedio" now={`Você pagou em média ${formatMoney(position.averagePrice![currency], currency)} por bitcoin.`}>
            {formatMoney(position.averagePrice![currency], currency)}
          </Stat>
          {position.realized[currency] !== 0 && (
            <Stat label="Lucro realizado" explain="lucroRealizado">
              <Signed value={position.realized[currency]} currency={currency} />
            </Stat>
          )}
        </dl>
      ) : (
        <p className="mt-5 border-t border-line pt-5 text-sm text-muted">
          Para ver lucro e preço médio, informe quanto você pagou.{" "}
          <button type="button" onClick={() => openPortfolioDialog()} className="text-accent underline-offset-4 hover:underline">
            Informar agora
          </button>
        </p>
      )}
      {position.fxAssumedToday && stored.cost?.kind === "total" && (
        <p className="mt-4 text-xs text-muted">
          Sem a data da compra, o Total investido em {stored.cost.currency === "BRL" ? "dólares" : "reais"} usa a cotação de hoje.
        </p>
      )}
      {detailLink && (
        <Link href="/portfolio" className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline">
          Ver o portfólio em detalhe
        </Link>
      )}
    </section>
  );
}
