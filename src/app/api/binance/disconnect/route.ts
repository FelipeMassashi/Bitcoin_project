import type { NextRequest } from "next/server";
import { clearCredentials, fromSameSite, json } from "@/lib/binance/http";

/** Apaga o cookie com as credenciais. Como o servidor não guarda nada, isso desconecta de vez. */
export async function POST(request: NextRequest) {
  if (!fromSameSite(request)) return json({ code: "origem", error: "Requisição recusada." }, 403);
  const response = json({ ok: true });
  clearCredentials(response);
  return response;
}
