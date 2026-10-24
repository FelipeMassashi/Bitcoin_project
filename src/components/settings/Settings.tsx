"use client";

import { useState, type ReactNode } from "react";
import { openPortfolioDialog } from "@/components/portfolio/dialog-store";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Segmented } from "@/components/ui/Segmented";
import { formatBtc, type Currency } from "@/lib/format/format";
import { ConnectionError, isCredentialError, useBinanceActions, useBinanceBalance, useDisconnectBinance } from "@/lib/portfolio/binance";
import { clearPortfolio, usePortfolio, type StoredPortfolio } from "@/lib/portfolio/store";
import { useCurrency } from "@/lib/preferences";

const CURRENCIES = [
  { value: "BRL", label: "Reais (R$)" },
  { value: "USD", label: "Dólares (US$)" },
] as const satisfies readonly { value: Currency; label: string }[];

// Preferências guardadas no localStorage (src/lib/preferences.ts e o tema no ThemeToggle).
const PREFERENCE_KEYS = ["moeda", "meta", "tema"];

const secondary = "rounded-control border border-line-strong px-4 py-2 text-sm text-ink transition-colors hover:bg-paper disabled:opacity-50";
const danger = "rounded-control border border-down px-4 py-2 text-sm font-medium text-down transition-colors hover:bg-down-soft disabled:opacity-50";

function Panel({ id, title, description, children }: { id: string; title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <h2 id={id} className="text-lg font-medium tracking-tight">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const errorText = (err: unknown) => (err instanceof ConnectionError ? err.message : "Não foi possível concluir. Tente de novo.");

function BinancePanel({ stored }: { stored: StoredPortfolio | null }) {
  const balance = useBinanceBalance(stored?.source === "binance");
  const connected = stored?.source === "binance" && !isCredentialError(balance.error);
  const disconnect = useDisconnectBinance();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await disconnect(stored);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      id="config-binance"
      title="Chave da Binance"
      description="A API Key e a Secret ficam só num cookie cifrado deste navegador; o servidor não guarda nenhuma cópia. Apagar a chave tira esse cookie. O que você informou sobre quanto pagou continua aqui."
    >
      {connected ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            <span aria-hidden="true" className="mr-2 inline-block size-1.5 rounded-full bg-up align-middle" />
            Conectada, somente leitura
            {balance.data && <span className="num text-muted"> · lendo {formatBtc(balance.data.total)}</span>}
          </p>
          <div>
            <button type="button" onClick={remove} disabled={busy} className={danger}>
              {busy ? "Apagando…" : "Apagar a chave da Binance"}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Para revogar de vez, apague também a chave na Binance, em Perfil › Gerenciamento de API.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-muted">Nenhuma chave da Binance guardada neste navegador.</p>
          <button type="button" onClick={() => openPortfolioDialog("binance")} className={secondary}>
            Conectar a Binance
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-down">
          {error}
        </p>
      )}
    </Panel>
  );
}

function describe(stored: StoredPortfolio | null) {
  if (!stored) return "nada informado";
  const cost = !stored.cost
    ? "sem custo informado"
    : stored.cost.kind === "total"
      ? "valor total investido"
      : `${stored.cost.aportes.length} ${stored.cost.aportes.length === 1 ? "aporte" : "aportes"}${stored.cost.vendas.length ? ` e ${stored.cost.vendas.length} ${stored.cost.vendas.length === 1 ? "venda" : "vendas"}` : ""}`;
  return `${stored.source === "binance" ? "quantidade pela Binance" : "informado à mão"}, ${cost}`;
}

function DataPanel({ stored }: { stored: StoredPortfolio | null }) {
  const actions = useBinanceActions();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  // Sem o investimento a conexão não tem a que se ligar: a chave sai junto.
  const clearInvestment = () =>
    run(async () => {
      if (stored?.source === "binance") await actions.disconnect();
      await clearPortfolio();
    });

  const clearEverything = () =>
    run(async () => {
      await actions.disconnect();
      await clearPortfolio();
      try {
        PREFERENCE_KEYS.forEach((key) => localStorage.removeItem(key));
      } catch {
        // sem localStorage não havia preferência guardada
      }
      // Recarregar devolve moeda, meta e tema aos padrões em todas as telas de uma vez.
      window.location.reload();
    });

  return (
    <Panel
      id="config-dados"
      title="Seus dados neste navegador"
      description="Tudo o que você informa fica só aqui, neste navegador. Nada vai para o servidor, e outro aparelho não vê nada disso."
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-[12rem_1fr]">
        <dt className="text-muted">Seu investimento</dt>
        <dd>{describe(stored)}</dd>
        <dt className="text-muted">Preferências</dt>
        <dd>moeda, meta de lucro e tema</dd>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={clearInvestment} disabled={busy || !stored} className={secondary}>
          Apagar meu investimento
        </button>
        {confirming ? (
          <>
            <button type="button" onClick={clearEverything} disabled={busy} className={danger}>
              {busy ? "Apagando…" : "Sim, apagar tudo"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={secondary}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={danger}>
            Apagar tudo deste navegador
          </button>
        )}
      </div>
      {confirming && (
        <p role="alert" className="mt-3 text-sm text-muted">
          Isso apaga a chave da Binance, o seu investimento e as preferências. Não dá para desfazer.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-down">
          {error}
        </p>
      )}
    </Panel>
  );
}

/** Preferências e controle dos dados que este navegador guarda. */
export function Settings() {
  const [currency, setCurrency] = useCurrency();
  const portfolio = usePortfolio();
  const stored = portfolio.status === "ready" ? portfolio.data : null;

  return (
    <div className="flex flex-col gap-6">
      <Panel id="config-aparencia" title="Aparência e moeda" description="Valem para todas as telas e ficam guardadas neste navegador.">
        <div className="flex flex-wrap items-end gap-8">
          <div className="w-64">
            <ThemeToggle />
          </div>
          <div>
            <p aria-hidden="true" className="mb-1.5 text-xs text-muted">Moeda dos valores</p>
            <Segmented name="moeda-padrao" label="Moeda dos valores" options={CURRENCIES} value={currency} onChange={setCurrency} />
          </div>
        </div>
      </Panel>
      {portfolio.status === "ready" && (
        <>
          <BinancePanel stored={stored} />
          <DataPanel stored={stored} />
        </>
      )}
    </div>
  );
}
