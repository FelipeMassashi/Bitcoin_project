import { describe, expect, it } from "vitest";
import { BinanceError, createBinanceClient, createWeightGuard } from "./client";

const credentials = { apiKey: "chave-publica", secret: "segredo-nao-vaza" };
const SERVER_TIME = 1_700_000_000_000;

type Route = (url: URL, init: RequestInit) => { status?: number; body: unknown; headers?: Record<string, string> };

/** Binance simulada: responde por caminho e registra as chamadas. */
function fakeBinance(routes: Record<string, Route>) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    const route: Route | undefined =
      url.pathname === "/api/v3/time" ? () => ({ body: { serverTime: SERVER_TIME } }) : routes[url.pathname];
    if (!route) return new Response(JSON.stringify({ code: -1, msg: "rota inesperada" }), { status: 404 });
    const { status = 200, body, headers } = route(url, init);
    return new Response(JSON.stringify(body), { status, headers });
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const client = (fake: ReturnType<typeof fakeBinance>, guard = createWeightGuard()) =>
  createBinanceClient({ credentials, fetch: fake.fetch, now: () => SERVER_TIME - 7_000, guard });

const readOnly = {
  ipRestrict: false,
  createTime: 1623840271000,
  enableReading: true,
  enableWithdrawals: false,
  enableInternalTransfer: false,
  enableMargin: false,
  enableFutures: false,
  permitsUniversalTransfer: false,
  enableVanillaOptions: false,
  enableFixApiTrade: false,
  enableFixReadOnly: true,
  enableSpotAndMarginTrading: false,
  enablePortfolioMarginTrading: false,
};

describe("permissões da chave", () => {
  it("aceita chave somente leitura", async () => {
    const fake = fakeBinance({ "/sapi/v1/account/apiRestrictions": () => ({ body: readOnly }) });
    await expect(client(fake).assertReadOnly()).resolves.toBeUndefined();
  });

  it("recusa chave que pode negociar ou sacar e diz quais permissões sobram", async () => {
    const fake = fakeBinance({
      "/sapi/v1/account/apiRestrictions": () => ({
        body: { ...readOnly, enableSpotAndMarginTrading: true, enableWithdrawals: true },
      }),
    });
    const error = await client(fake).assertReadOnly().catch((e) => e);
    expect(error).toBeInstanceOf(BinanceError);
    expect(error.code).toBe("permissoes");
    expect(error.message).toMatch(/negociar no spot e na margem/);
    expect(error.message).toMatch(/sacar/);
  });

  it("recusa permissões novas que ainda não conhece", async () => {
    const fake = fakeBinance({ "/sapi/v1/account/apiRestrictions": () => ({ body: { ...readOnly, enableAlgoTrading: true } }) });
    await expect(client(fake).assertReadOnly()).rejects.toMatchObject({ code: "permissoes" });
  });

  it("recusa chave sem leitura", async () => {
    const fake = fakeBinance({ "/sapi/v1/account/apiRestrictions": () => ({ body: { ...readOnly, enableReading: false } }) });
    await expect(client(fake).assertReadOnly()).rejects.toMatchObject({ code: "permissoes" });
  });
});

describe("saldo de BTC", () => {
  const balanceRoutes = (overrides: Record<string, Route> = {}): Record<string, Route> => ({
    "/api/v3/account": () => ({
      body: { balances: [{ asset: "BTC", free: "0.10000000", locked: "0.01000000" }, { asset: "USDT", free: "50", locked: "0" }] },
    }),
    "/sapi/v1/asset/get-funding-asset": () => ({
      body: [{ asset: "BTC", free: "0.002", locked: "0", freeze: "0.001", withdrawing: "0", btcValuation: "0.003" }],
    }),
    "/sapi/v1/simple-earn/flexible/position": (url) => ({
      body:
        url.searchParams.get("current") === "1"
          ? { rows: [{ asset: "BTC", totalAmount: "0.2" }], total: 2 }
          : { rows: [{ asset: "BTC", totalAmount: "0.05" }], total: 2 },
    }),
    "/sapi/v1/simple-earn/locked/position": () => ({ body: { rows: [{ asset: "BTC", amount: "0.3" }], total: 1 } }),
    ...overrides,
  });

  it("soma Spot, Funding e Simple Earn flexível e bloqueado, com paginação", async () => {
    const fake = fakeBinance(balanceRoutes());
    const balance = await client(fake).btcBalance();
    expect(balance.spot).toBeCloseTo(0.11, 12);
    expect(balance.funding).toBeCloseTo(0.003, 12);
    expect(balance.earnFlexible).toBeCloseTo(0.25, 12);
    expect(balance.earnLocked).toBeCloseTo(0.3, 12);
    expect(balance.total).toBeCloseTo(0.663, 12);
  });

  it("assina cada chamada com a hora do servidor, sem expor a Secret", async () => {
    const fake = fakeBinance(balanceRoutes());
    await client(fake).btcBalance();
    const signed = fake.calls.filter((c) => c.url.pathname !== "/api/v3/time");
    expect(signed.length).toBeGreaterThan(0);
    for (const { url, init } of signed) {
      expect(new Headers(init.headers).get("X-MBX-APIKEY")).toBe(credentials.apiKey);
      expect(url.searchParams.get("signature")).toMatch(/^[0-9a-f]{64}$/);
      expect(url.searchParams.get("recvWindow")).toBe("5000");
      // O relógio local está 7 s atrasado; o timestamp segue o da Binance.
      expect(Number(url.searchParams.get("timestamp"))).toBe(SERVER_TIME);
      expect(url.toString()).not.toContain(credentials.secret);
    }
    expect(fake.calls.find((c) => c.url.pathname === "/sapi/v1/asset/get-funding-asset")?.init.method).toBe("POST");
  });
});

describe("erros da Binance em português", () => {
  const failing = (status: number, body: unknown, headers?: Record<string, string>) =>
    fakeBinance({ "/sapi/v1/account/apiRestrictions": () => ({ status, body, headers }) });

  it.each([
    [401, { code: -2015, msg: "Invalid API-key, IP, or permissions for action." }, "chave"],
    [400, { code: -1022, msg: "Signature for this request is not valid." }, "assinatura"],
    [400, { code: -1021, msg: "Timestamp for this request is outside of the recvWindow." }, "relogio"],
    [451, { code: 0, msg: "Service unavailable from a restricted location" }, "regiao"],
    [500, "<html>", "indisponivel"],
  ])("HTTP %i vira o erro %s", async (status, body, code) => {
    const error = await client(failing(status, body)).assertReadOnly().catch((e) => e);
    expect(error).toBeInstanceOf(BinanceError);
    expect(error.code).toBe(code);
    expect(error.message).not.toMatch(/Invalid|Signature|Timestamp/);
  });

  it("depois de um 429, para de chamar a Binance até passar o tempo pedido", async () => {
    const guard = createWeightGuard();
    const fake = failing(429, { code: -1003, msg: "Too many requests" }, { "Retry-After": "30" });
    await expect(client(fake, guard).assertReadOnly()).rejects.toMatchObject({ code: "limite" });
    const before = fake.calls.length;
    await expect(client(fake, guard).assertReadOnly()).rejects.toMatchObject({ code: "limite" });
    expect(fake.calls.length).toBe(before);
  });

  it("para de chamar quando o peso usado no minuto chega perto do limite", async () => {
    const guard = createWeightGuard();
    const fake = fakeBinance({
      "/sapi/v1/account/apiRestrictions": () => ({ body: readOnly, headers: { "x-mbx-used-weight-1m": "5900" } }),
    });
    await client(fake, guard).assertReadOnly();
    const before = fake.calls.length;
    await expect(client(fake, guard).assertReadOnly()).rejects.toMatchObject({ code: "limite" });
    expect(fake.calls.length).toBe(before);
  });
});
