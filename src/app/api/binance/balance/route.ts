import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { createBinanceClient, type BtcBalance } from "@/lib/binance/client";
import {
  CREDENTIALS_COOKIE,
  clearCredentials,
  encryptionKey,
  errorResponse,
  invalidatesCredentials,
  json,
  missingKeyResponse,
  rateLimited,
} from "@/lib/binance/http";
import { createRateLimiter } from "@/lib/binance/rate-limit";
import { openCredentials } from "@/lib/binance/vault";

const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

// Cache curto (ADR 0001): recarregar a página não refaz as ~6 chamadas assinadas.
// Fica só na memória da instância, pela quantidade de BTC, sob um hash da API Key.
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; balance: BtcBalance }>();

function cached(id: string, now: number): BtcBalance | null {
  const hit = cache.get(id);
  if (hit && now - hit.at < CACHE_MS) return hit.balance;
  cache.delete(id);
  return null;
}

function remember(id: string, balance: BtcBalance, now: number) {
  if (cache.size >= 1000) for (const [k, v] of cache) if (now - v.at >= CACHE_MS) cache.delete(k);
  if (cache.size < 1000) cache.set(id, { at: now, balance });
}

const disconnected = () => {
  const response = json({ code: "desconectado", error: "A conexão com a Binance expirou. Conecte de novo." }, 401);
  clearCredentials(response);
  return response;
};

/** Quantidade de BTC da conta conectada. Confere de novo as permissões: a chave pode ter sido editada na Binance. */
export async function GET(request: NextRequest) {
  const key = encryptionKey();
  if (!key) return missingKeyResponse();
  const limited = rateLimited(limiter, request);
  if (limited) return limited;

  const token = request.cookies.get(CREDENTIALS_COOKIE)?.value;
  const credentials = token ? openCredentials(token, key) : null;
  if (!credentials) return disconnected();
  const id = createHmac("sha256", key).update(credentials.apiKey).digest("base64url");
  const hit = cached(id, Date.now());
  if (hit) return json({ balance: hit });
  try {
    const client = createBinanceClient({ credentials });
    await client.assertReadOnly();
    const balance = await client.btcBalance();
    remember(id, balance, Date.now());
    return json({ balance });
  } catch (error) {
    const response = errorResponse(error);
    if (invalidatesCredentials(error)) clearCredentials(response);
    return response;
  }
}
