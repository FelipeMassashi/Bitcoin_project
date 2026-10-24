import "server-only";
import { z } from "zod";
import { signedQuery } from "./sign";
import type { Credentials } from "./vault";

const BASE_URL = "https://api.binance.com";
const RECV_WINDOW = 5000;

export type BinanceErrorCode = "chave" | "assinatura" | "relogio" | "regiao" | "limite" | "permissoes" | "indisponivel";

const MESSAGES: Record<Exclude<BinanceErrorCode, "permissoes">, string> = {
  chave:
    "A Binance recusou a chave. Confira se copiou a API Key inteira, se a chave está ativa e se ela não tem restrição de IP.",
  assinatura: "A Secret Key não confere com a API Key. Copie as duas de novo da mesma chave.",
  relogio: "O horário do servidor ficou fora da janela aceita pela Binance. Tente de novo.",
  regiao: "A Binance não atende a região de onde o servidor está acessando. Tente de novo mais tarde.",
  limite: "Muitas consultas à Binance neste momento. Tente de novo em alguns minutos.",
  indisponivel: "A Binance não respondeu como esperado. Tente de novo em alguns minutos.",
};

export class BinanceError extends Error {
  constructor(
    readonly code: BinanceErrorCode,
    message: string = MESSAGES[code as Exclude<BinanceErrorCode, "permissoes">],
  ) {
    super(message);
    this.name = "BinanceError";
  }
}

// Permissões que uma chave somente leitura pode ter ligadas.
const ALLOWED = new Set(["enableReading", "enableFixReadOnly"]);
const PERMISSION_LABELS: Record<string, string> = {
  enableSpotAndMarginTrading: "negociar no spot e na margem",
  enableWithdrawals: "sacar",
  enableInternalTransfer: "transferir entre contas",
  permitsUniversalTransfer: "fazer transferência universal",
  enableMargin: "operar com margem",
  enableFutures: "operar futuros",
  enableVanillaOptions: "operar opções",
  enablePortfolioMarginTrading: "operar margem de portfólio",
  enableFixApiTrade: "negociar pela FIX API",
};

/**
 * Freio compartilhado pelas requisições desta instância do servidor: depois de um 429/418 ou quando o peso
 * usado no minuto passa de 90% do limite, para de chamar a Binance até o tempo indicado.
 */
export function createWeightGuard() {
  let blockedUntil = 0;
  return {
    check(now: number) {
      if (now < blockedUntil) throw new BinanceError("limite");
    },
    record(response: Response, now: number) {
      const nextMinute = Math.ceil((now + 1) / 60_000) * 60_000;
      if (response.status === 429 || response.status === 418) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        blockedUntil = Math.max(blockedUntil, Number.isFinite(retryAfter) && retryAfter > 0 ? now + retryAfter * 1000 : nextMinute);
      }
      const spot = Number(response.headers.get("x-mbx-used-weight-1m") ?? 0);
      const sapi = Number(response.headers.get("x-sapi-used-ip-weight-1m") ?? 0);
      if (spot > 5400 || sapi > 10800) blockedUntil = Math.max(blockedUntil, nextMinute);
    },
  };
}
export type WeightGuard = ReturnType<typeof createWeightGuard>;
const sharedGuard = createWeightGuard();

const errorBody = z.object({ code: z.number(), msg: z.string() });
const amount = z.string().transform(Number).pipe(z.number().finite().nonnegative());
const account = z.object({ balances: z.array(z.object({ asset: z.string(), free: amount, locked: amount })) });
const funding = z.array(z.object({ asset: z.string(), free: amount, locked: amount, freeze: amount }));
const page = <T extends z.ZodTypeAny>(row: T) => z.object({ rows: z.array(row).default([]), total: z.coerce.number() });
const flexible = page(z.object({ asset: z.string(), totalAmount: amount }));
const locked = page(z.object({ asset: z.string(), amount: amount }));
const restrictions = z.record(z.string(), z.unknown());

function errorFor(status: number, body: unknown): BinanceError {
  if (status === 451) return new BinanceError("regiao");
  if (status === 429 || status === 418) return new BinanceError("limite");
  const parsed = errorBody.safeParse(body);
  if (parsed.success) {
    const { code } = parsed.data;
    if (code === -2014 || code === -2015 || code === -2008) return new BinanceError("chave");
    if (code === -1022) return new BinanceError("assinatura");
    if (code === -1021) return new BinanceError("relogio");
  }
  return new BinanceError("indisponivel");
}

export type BtcBalance = { spot: number; funding: number; earnFlexible: number; earnLocked: number; total: number };

type Options = {
  credentials: Credentials;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
  guard?: WeightGuard;
};

/** Cliente somente leitura: só os endpoints de permissões e de saldo, todos assinados aqui no servidor. */
export function createBinanceClient({ credentials, fetch = globalThis.fetch, now = Date.now, guard = sharedGuard }: Options) {
  let offset: Promise<number> | undefined;

  async function call(path: string, init: RequestInit = {}): Promise<unknown> {
    guard.check(now());
    let response: Response;
    let body: unknown;
    try {
      response = await fetch(`${BASE_URL}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000) });
      body = await response.json().catch(() => null);
    } catch {
      throw new BinanceError("indisponivel");
    }
    guard.record(response, now());
    if (!response.ok) throw errorFor(response.status, body);
    return body;
  }

  async function signed<T>(method: "GET" | "POST", path: string, schema: z.ZodType<T>, params: Record<string, string | number> = {}) {
    // Uma consulta de hora por cliente, compartilhada pelas chamadas em paralelo.
    offset ??= call("/api/v3/time").then((body) => {
      const parsed = z.object({ serverTime: z.number() }).safeParse(body);
      if (!parsed.success) throw new BinanceError("indisponivel");
      return parsed.data.serverTime - now();
    });
    const query = signedQuery({ ...params, recvWindow: RECV_WINDOW, timestamp: now() + (await offset) }, credentials.secret);
    const body = await call(`${path}?${query}`, { method, headers: { "X-MBX-APIKEY": credentials.apiKey } });
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new BinanceError("indisponivel");
    return parsed.data;
  }

  async function allPages<T>(path: string, schema: z.ZodType<{ rows: T[]; total: number }>) {
    const rows: T[] = [];
    for (let current = 1; current <= 10; current++) {
      const result = await signed("GET", path, schema, { asset: "BTC", current, size: 100 });
      rows.push(...result.rows);
      if (rows.length >= result.total || result.rows.length === 0) break;
    }
    return rows;
  }

  return {
    /** Recusa a chave se ela tiver qualquer permissão além de leitura, inclusive permissões novas. */
    async assertReadOnly(): Promise<void> {
      const flags = await signed("GET", "/sapi/v1/account/apiRestrictions", restrictions);
      const extra = Object.entries(flags)
        .filter(([name, on]) => on === true && /^(enable|permits)/.test(name) && !ALLOWED.has(name))
        .map(([name]) => PERMISSION_LABELS[name] ?? name);
      if (flags.enableReading !== true || extra.length > 0) {
        const reason = extra.length
          ? `Esta chave também pode ${extra.join(", ")}.`
          : "Esta chave não tem a permissão de leitura ligada.";
        throw new BinanceError(
          "permissoes",
          `${reason} Por segurança, o site só aceita chaves com apenas "Habilitar leitura" (Enable Reading). Edite a chave na Binance ou crie outra.`,
        );
      }
    },

    async btcBalance(): Promise<BtcBalance> {
      const [spotAccount, fundingAssets, flexibleRows, lockedRows] = await Promise.all([
        signed("GET", "/api/v3/account", account, { omitZeroBalances: "true" }),
        signed("POST", "/sapi/v1/asset/get-funding-asset", funding, { asset: "BTC" }),
        allPages("/sapi/v1/simple-earn/flexible/position", flexible),
        allPages("/sapi/v1/simple-earn/locked/position", locked),
      ]);
      const sum = <R extends { asset: string }>(rows: R[], value: (r: R) => number) =>
        rows.filter((r) => r.asset === "BTC").reduce((total, r) => total + value(r), 0);
      const balance = {
        spot: sum(spotAccount.balances, (b) => b.free + b.locked),
        funding: sum(fundingAssets, (b) => b.free + b.locked + b.freeze),
        earnFlexible: sum(flexibleRows, (r) => r.totalAmount),
        earnLocked: sum(lockedRows, (r) => r.amount),
      };
      return { ...balance, total: balance.spot + balance.funding + balance.earnFlexible + balance.earnLocked };
    },
  };
}
