"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { formatBtc, type Currency } from "@/lib/format/format";
import { useDailySeries } from "@/lib/market/queries";
import {
  ConnectionError,
  isCredentialError,
  useBinanceActions,
  useBinanceBalance,
  useDisconnectBinance,
  type BtcBalance,
} from "@/lib/portfolio/binance";
import { computePosition } from "@/lib/portfolio/position";
import { clearPortfolio, savePortfolio, usePortfolio, type StoredPortfolio } from "@/lib/portfolio/store";
import { FIRST_DAY, formFrom, newRow, parseForm, type CostForm, type Row } from "./cost-form";
import { closePortfolioDialog, usePortfolioDialog, type DialogTab } from "./dialog-store";

const SOURCES = [
  { value: "binance", label: "Conectar a Binance" },
  { value: "manual", label: "Informar à mão" },
] as const satisfies readonly { value: DialogTab; label: string }[];
const MODES = [
  { value: "total", label: "Valor total" },
  { value: "aportes", label: "Aporte por aporte" },
] as const satisfies readonly { value: CostForm["mode"]; label: string }[];
const CURRENCIES = [
  { value: "BRL", label: "R$" },
  { value: "USD", label: "US$" },
] as const satisfies readonly { value: Currency; label: string }[];

const input =
  "num w-full rounded-control border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none";
const primary =
  "rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50";
const secondary = "rounded-control border border-line-strong px-4 py-2 text-sm text-ink transition-colors hover:bg-paper";

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

/** Janela "Seu investimento": conecta a Binance ou recebe os dados à mão, e sempre pergunta quanto foi pago. */
export function PortfolioDialog() {
  const dialog = usePortfolioDialog();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (dialog.open && !el.open) el.showModal();
    if (!dialog.open && el.open) el.close();
  }, [dialog.open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="investimento-titulo"
      onClose={closePortfolioDialog}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] rounded-panel border border-line-strong bg-surface p-0 text-ink backdrop:bg-[rgb(20_19_18/0.45)]"
    >
      {dialog.open && <DialogBody initialTab={dialog.tab} />}
    </dialog>
  );
}

function DialogBody({ initialTab }: { initialTab?: DialogTab }) {
  const state = usePortfolio();
  const stored = state.status === "ready" ? state.data : null;
  const [tab, setTab] = useState<DialogTab>(initialTab ?? stored?.source ?? "binance");

  return (
    <div className="flex flex-col gap-6 p-5 md:p-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 id="investimento-titulo" className="text-lg font-medium tracking-tight">
            Seu investimento
          </h2>
          <p className="mt-1 text-sm text-muted">
            Fica guardado só neste navegador. O site não tem cadastro e não guarda nada seu no servidor.
          </p>
        </div>
        <button type="button" onClick={closePortfolioDialog} aria-label="Fechar" className="rounded-control p-1 text-muted hover:text-ink">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <Segmented name="fonte" label="De onde vem a quantidade de bitcoin" options={SOURCES} value={tab} onChange={setTab} />

      {state.status === "loading" ? null : tab === "binance" ? (
        <BinanceTab stored={stored} />
      ) : (
        <CostSection key="manual" source="manual" stored={stored} />
      )}
    </div>
  );
}

function BinanceTab({ stored }: { stored: StoredPortfolio | null }) {
  const balance = useBinanceBalance(stored?.source === "binance");
  // Cookie expirado ou chave revogada: volta para o formulário de conexão.
  const expired = isCredentialError(balance.error);
  const connected = stored?.source === "binance" && !expired;
  const disconnectBinance = useDisconnectBinance();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectBinance(stored);
    } catch (err) {
      setError(err instanceof ConnectionError ? err.message : "Não foi possível desconectar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (!connected) {
    return (
      <>
        {expired && (
          <p role="alert" className="-mb-2 rounded-control bg-down-soft px-3 py-2 text-sm text-ink">
            {balance.error!.message}
          </p>
        )}
        <ConnectForm stored={stored} />
      </>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-control border border-line p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-up align-middle" aria-hidden="true" />
            Binance conectada (somente leitura)
          </p>
          <button type="button" onClick={disconnect} disabled={busy} className={secondary}>
            Desconectar
          </button>
        </div>
        {balance.data ? (
          <BalanceList balance={balance.data} />
        ) : balance.error ? (
          <p role="alert" className="mt-2 text-sm text-down">
            {balance.error.message}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Lendo a quantidade de bitcoin…</p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Desconectar apaga a chave deste navegador; o que você informou sobre quanto pagou continua aqui. Para revogar de
          vez, apague também a chave em Gerenciamento de API, na Binance.
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-down">
            {error}
          </p>
        )}
      </div>
      <CostSection key="binance" source="binance" stored={stored} />
    </div>
  );
}

function BalanceList({ balance }: { balance: BtcBalance }) {
  const parts = [
    ["Spot", balance.spot],
    ["Funding", balance.funding],
    ["Simple Earn flexível", balance.earnFlexible],
    ["Simple Earn bloqueado", balance.earnLocked],
  ] as const;
  return (
    <dl className="num mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
      {parts.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right sm:text-left">{formatBtc(value)}</dd>
        </div>
      ))}
      <dt className="border-t border-line pt-1 font-medium">Total</dt>
      <dd className="border-t border-line pt-1 text-right font-medium sm:text-left">{formatBtc(balance.total)}</dd>
    </dl>
  );
}

function ConnectForm({ stored }: { stored: StoredPortfolio | null }) {
  const actions = useBinanceActions();
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await actions.connect(apiKey.trim(), secret.trim());
      setApiKey("");
      setSecret("");
      // Mantém o custo já informado; a quantidade passa a vir da Binance.
      await savePortfolio({ source: "binance", cost: stored?.cost ?? null });
    } catch (err) {
      setError(err instanceof ConnectionError ? err.message : "Não foi possível conectar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={connect} className="flex flex-col gap-5" autoComplete="off">
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed marker:text-muted">
        <li>
          Na Binance, abra <b className="font-medium">Perfil › Gerenciamento de API</b> e crie uma chave do tipo “Gerada pelo
          sistema”.
        </li>
        <li>
          Deixe marcada só a permissão <b className="font-medium">Habilitar leitura</b> (Enable Reading). Não ligue
          negociação, saque nem transferência: o site recusa chaves com qualquer outra permissão.
        </li>
        <li>
          Deixe o acesso sem restrição de IP. O servidor deste site não tem IP fixo; por isso ele só aceita chaves que não
          conseguem movimentar nada.
        </li>
        <li>Copie a API Key e a Secret Key e cole abaixo. A Binance só mostra a Secret uma vez.</li>
      </ol>

      <Field label="API Key">
        {(id) => (
          <input id={id} className={input} value={apiKey} onChange={(e) => setApiKey(e.target.value)} required spellCheck={false} autoCapitalize="off" autoComplete="off" />
        )}
      </Field>
      <Field
        label="Secret Key"
        hint="Vai direto para o servidor deste site, que confere as permissões e devolve a chave cifrada num cookie que só ele consegue abrir. Ela nunca fica visível para o navegador, nem para o dono do site."
      >
        {(id) => (
          <input id={id} type="password" className={input} value={secret} onChange={(e) => setSecret(e.target.value)} required spellCheck={false} autoComplete="off" />
        )}
      </Field>

      {error && (
        <p role="alert" className="rounded-control bg-down-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || !apiKey || !secret} className={primary}>
          {busy ? "Conectando…" : "Conectar"}
        </button>
        <p className="text-xs text-muted">Se preferir não conectar, use “Informar à mão”.</p>
      </div>
    </form>
  );
}

function CostSection({ source, stored }: { source: StoredPortfolio["source"]; stored: StoredPortfolio | null }) {
  const daily = useDailySeries();
  const actions = useBinanceActions();
  const [form, setForm] = useState<CostForm>(() => formFrom(stored));
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<CostForm>) => setForm((f) => ({ ...f, ...patch }));
  const setRow = (id: string, patch: Partial<Row>) => set({ rows: form.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const today = new Date().toISOString().slice(0, 10);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseForm(form, source, Date.parse(today));
    if (!parsed.ok) return setError(parsed.error);
    if (parsed.cost?.kind === "aportes" && parsed.cost.vendas.length > 0) {
      if (!daily.data) return setError("Aguarde os preços carregarem e salve de novo.");
      if (computePosition(parsed.cost, daily.data).oversold) {
        return setError("Alguma venda tem mais bitcoin do que você tinha naquela data. Confira as datas e quantidades.");
      }
    }
    setError(null);
    // Uma Fonte por vez: passar para Manual apaga a chave da Binance.
    if (source === "manual" && stored?.source === "binance") {
      try {
        await actions.disconnect();
      } catch (err) {
        return setError(err instanceof ConnectionError ? err.message : "Não foi possível desconectar a Binance. Tente de novo.");
      }
    }
    await savePortfolio({ source, cost: parsed.cost, ...(parsed.btc !== undefined && { btc: parsed.btc }) });
    closePortfolioDialog();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div>
        <h3 className="font-medium">Quanto você pagou</h3>
        <p className="mt-1 text-sm text-muted">
          {source === "binance"
            ? "A Binance informa só a quantidade. Com quanto você pagou, dá para calcular preço médio e lucro. Pode deixar para depois."
            : "Com quanto você pagou e quanto bitcoin tem, dá para calcular preço médio, lucro e metas."}
        </p>
      </div>
      {source === "manual" && stored?.source === "binance" && (
        <p className="-mt-2 text-xs text-muted">Salvar aqui desconecta a Binance: a quantidade passa a vir do que você informar.</p>
      )}
      <Segmented name={`modo-${source}`} label="Como informar" options={MODES} value={form.mode} onChange={(mode) => set({ mode })} />

      {form.mode === "total" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total investido" hint="Soma de tudo o que você pagou pelo bitcoin que ainda tem.">
            {(id) => (
              <div className="flex gap-2">
                <input id={id} inputMode="decimal" className={input} placeholder="10.000,00" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
                <Segmented name={`moeda-total-${source}`} label="Moeda do Total investido" options={CURRENCIES} value={form.currency} onChange={(currency) => set({ currency })} />
              </div>
            )}
          </Field>
          {source === "manual" && (
            <Field label="Quantidade de bitcoin (opcional)" hint="Recomendado: com a quantidade exata, o preço médio sai certo em vez de estimado.">
              {(id) => <input id={id} inputMode="decimal" className={input} placeholder="0,0125" value={form.btc} onChange={(e) => set({ btc: e.target.value })} />}
            </Field>
          )}
          <Field label="Data aproximada do aporte (opcional)" hint="Converte o valor entre reais e dólares pela cotação daquele dia. Sem a quantidade, também estima quanto bitcoin você comprou.">
            {(id) => <input id={id} type="date" min={FIRST_DAY} max={today} className={input} value={form.date} onChange={(e) => set({ date: e.target.value })} />}
          </Field>
          {source === "manual" && !form.btc.trim() && (
            <Field label="Preço médio pago (opcional)" hint="Na mesma moeda do Total investido. Se souber, estima a quantidade melhor do que a data.">
              {(id) => <input id={id} inputMode="decimal" className={input} placeholder="350.000,00" value={form.averagePrice} onChange={(e) => set({ averagePrice: e.target.value })} />}
            </Field>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-muted">
            Cada aporte entra com a cotação do dólar do dia e aparece como marcador no gráfico. Sem a quantidade, ela é estimada
            pelo fechamento do dia. Vendas reduzem a quantidade e geram lucro realizado.
          </p>
          {form.rows.length > 0 && (
            <ul className="flex flex-col gap-3">
              {form.rows.map((row, i) => (
                <li key={row.id} className="grid grid-cols-2 gap-2 rounded-control border border-line p-3 sm:grid-cols-[6.5rem_1fr_1fr_1fr_auto] sm:items-end">
                  <p className="col-span-2 text-sm font-medium sm:col-span-1 sm:self-center">
                    {row.kind === "aporte" ? "Aporte" : "Venda"} {form.rows.slice(0, i + 1).filter((r) => r.kind === row.kind).length}
                  </p>
                  <label className="flex flex-col gap-1 text-xs text-muted">
                    Data
                    <input type="date" min={FIRST_DAY} max={today} className={input} value={row.date} onChange={(e) => setRow(row.id, { date: e.target.value })} />
                  </label>
                  <label className="col-span-2 flex flex-col gap-1 text-xs text-muted sm:col-span-1">
                    {row.kind === "aporte" ? "Valor pago" : "Valor recebido (opcional)"}
                    <span className="flex gap-1">
                      <input inputMode="decimal" className={input} value={row.amount} onChange={(e) => setRow(row.id, { amount: e.target.value })} />
                      <select aria-label="Moeda" className="rounded-control border border-line-strong bg-paper px-1 text-sm text-ink" value={row.currency} onChange={(e) => setRow(row.id, { currency: e.target.value as Currency })}>
                        <option value="BRL">R$</option>
                        <option value="USD">US$</option>
                      </select>
                    </span>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted">
                    {row.kind === "aporte" ? "Bitcoin (opcional)" : "Bitcoin vendido"}
                    <input inputMode="decimal" className={input} value={row.btc} onChange={(e) => setRow(row.id, { btc: e.target.value })} />
                  </label>
                  <button type="button" onClick={() => set({ rows: form.rows.filter((r) => r.id !== row.id) })} className="justify-self-end text-xs text-muted underline-offset-4 hover:text-down hover:underline sm:pb-2.5">
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondary} onClick={() => set({ rows: [...form.rows, newRow("aporte", form.rows.at(-1)?.currency ?? "BRL")] })}>
              Adicionar aporte
            </button>
            <button type="button" className={secondary} onClick={() => set({ rows: [...form.rows, newRow("venda", form.rows.at(-1)?.currency ?? "BRL")] })}>
              Adicionar venda
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-control bg-down-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <button type="submit" className={primary}>
          Salvar
        </button>
        {source === "manual" && stored && (
          <button type="button" onClick={() => void clearPortfolio().then(closePortfolioDialog)} className="text-sm text-muted underline-offset-4 hover:text-down hover:underline">
            Apagar meus dados deste navegador
          </button>
        )}
      </div>
    </form>
  );
}
