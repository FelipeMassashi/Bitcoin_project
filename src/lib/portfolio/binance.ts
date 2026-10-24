"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

// O navegador só conversa com as rotas deste site; quem fala com a Binance é o servidor.
const balanceSchema = z.object({
  spot: z.number(),
  funding: z.number(),
  earnFlexible: z.number(),
  earnLocked: z.number(),
  total: z.number(),
});
export type BtcBalance = z.infer<typeof balanceSchema>;

const errorSchema = z.object({ code: z.string(), error: z.string() });

/** Erro já em português, vindo das rotas /api/binance. */
export class ConnectionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new ConnectionError("rede", "Sem conexão com o site. Verifique sua internet e tente de novo.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorSchema.safeParse(body);
    throw parsed.success
      ? new ConnectionError(parsed.data.code, parsed.data.error)
      : new ConnectionError("indisponivel", "O site não respondeu como esperado. Tente de novo em alguns minutos.");
  }
  return body;
}

const BALANCE_KEY = ["binance-balance"];

/** Erros em que a chave guardada não serve mais (o servidor já apagou o cookie): é preciso conectar de novo. */
export const isCredentialError = (error: unknown) =>
  error instanceof ConnectionError && ["desconectado", "chave", "assinatura", "permissoes"].includes(error.code);

/** Quantidade de BTC da conta conectada; o cookie com a chave vai junto e nunca é lido por este código. */
export function useBinanceBalance(enabled: boolean) {
  return useQuery({
    queryKey: BALANCE_KEY,
    enabled,
    staleTime: 5 * 60_000,
    retry: (count, error) => !isCredentialError(error) && count < 1,
    queryFn: async () => z.object({ balance: balanceSchema }).parse(await call("/api/binance/balance")).balance,
  });
}

export function useBinanceActions() {
  const queryClient = useQueryClient();
  return {
    async connect(apiKey: string, secret: string): Promise<BtcBalance> {
      const body = await call("/api/binance/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, secret }),
      });
      const { balance } = z.object({ balance: balanceSchema }).parse(body);
      queryClient.setQueryData(BALANCE_KEY, balance);
      return balance;
    },
    async disconnect(): Promise<void> {
      await call("/api/binance/disconnect", { method: "POST" });
      queryClient.removeQueries({ queryKey: BALANCE_KEY });
    },
  };
}
