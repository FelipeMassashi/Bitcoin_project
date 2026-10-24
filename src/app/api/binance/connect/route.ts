import type { NextRequest } from "next/server";
import { z } from "zod";
import { createBinanceClient } from "@/lib/binance/client";
import {
  COOKIE_OPTIONS,
  CREDENTIALS_COOKIE,
  encryptionKey,
  errorResponse,
  fromSameSite,
  json,
  missingKeyResponse,
  rateLimited,
} from "@/lib/binance/http";
import { createRateLimiter } from "@/lib/binance/rate-limit";
import { sealCredentials } from "@/lib/binance/vault";

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });
const keyField = z.string().trim().regex(/^[A-Za-z0-9]{32,128}$/);
const body = z.object({ apiKey: keyField, secret: keyField });

/** Valida a chave (somente leitura), lê o saldo e guarda as credenciais cifradas num cookie httpOnly. */
export async function POST(request: NextRequest) {
  if (!fromSameSite(request)) return json({ code: "origem", error: "Requisição recusada." }, 403);
  const limited = rateLimited(limiter, request);
  if (limited) return limited;
  const key = encryptionKey();
  if (!key) return missingKeyResponse();

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ code: "formato", error: "A API Key e a Secret Key têm só letras e números. Copie as duas de novo." }, 400);
  }
  try {
    const client = createBinanceClient({ credentials: parsed.data });
    await client.assertReadOnly();
    const balance = await client.btcBalance();
    const response = json({ balance });
    response.cookies.set(CREDENTIALS_COOKIE, sealCredentials(parsed.data, key), COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
