import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { BinanceError, type BinanceErrorCode } from "./client";
import { createRateLimiter } from "./rate-limit";
import { MAX_AGE_MS, isValidMasterKey } from "./vault";

// __Host-: só vale neste domínio, em HTTPS e no caminho "/". O navegador nunca entrega o cookie a JavaScript.
export const CREDENTIALS_COOKIE = "__Host-binance";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
  maxAge: MAX_AGE_MS / 1000,
} as const;

/** Apaga o cookie. Um cookie __Host- só é aceito (inclusive para apagar) com Secure e Path=/. */
export function clearCredentials(response: NextResponse): NextResponse {
  response.cookies.set(CREDENTIALS_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

/** Resposta JSON que nenhum cache guarda. */
export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Chave mestra do ambiente; ausente ou malformada desliga a conexão com a Binance em vez de quebrar. */
export function encryptionKey(): string | null {
  const key = process.env.ENCRYPTION_KEY;
  return key && isValidMasterKey(key) ? key : null;
}

export const missingKeyResponse = () =>
  json(
    {
      code: "indisponivel",
      error:
        process.env.NODE_ENV === "development"
          ? "Falta a ENCRYPTION_KEY no .env.local (veja o .env.example) e reiniciar o npm run dev."
          : "A conexão com a Binance não está ativa neste servidor.",
    },
    503,
  );

/** Só aceita POST vindo do próprio site (o cookie SameSite=Strict já impede o resto). */
export function fromSameSite(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  return request.headers.get("origin") === request.nextUrl.origin;
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function rateLimited(limiter: ReturnType<typeof createRateLimiter>, request: NextRequest): NextResponse | null {
  const result = limiter.take(clientIp(request), Date.now());
  if (result.ok) return null;
  const response = json({ code: "limite", error: "Muitas tentativas seguidas. Espere um minuto e tente de novo." }, 429);
  response.headers.set("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
  return response;
}

const STATUS: Record<BinanceErrorCode, number> = {
  chave: 401,
  assinatura: 401,
  permissoes: 403,
  limite: 429,
  relogio: 502,
  regiao: 502,
  indisponivel: 502,
};

/** Converte qualquer falha em mensagem para o Visitante. Nada é logado: o erro pode carregar dados da chave. */
export function errorResponse(error: unknown): NextResponse {
  const e = error instanceof BinanceError ? error : new BinanceError("indisponivel");
  return json({ code: e.code, error: e.message }, STATUS[e.code]);
}

/** Erros que significam que a chave guardada não serve mais: apagamos o cookie. */
export const invalidatesCredentials = (error: unknown) =>
  error instanceof BinanceError && (error.code === "chave" || error.code === "assinatura" || error.code === "permissoes");
