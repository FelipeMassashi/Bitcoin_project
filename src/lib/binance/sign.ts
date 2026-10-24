import "server-only";
import { createHmac } from "node:crypto";

/** Monta a query string e acrescenta a assinatura HMAC-SHA256 que a Binance exige nos endpoints assinados. */
export function signedQuery(params: Record<string, string | number | boolean>, secret: string): string {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const signature = createHmac("sha256", secret).update(query).digest("hex");
  return `${query}&signature=${signature}`;
}
