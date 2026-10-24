"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { CostInput } from "./position";

// Os dados do Visitante ficam só no IndexedDB deste navegador (ADR 0001). Nada vai para o servidor.
const DB_NAME = "btc-project";
const STORE = "portfolio";
const KEY = "atual";

const currency = z.enum(["BRL", "USD"]);
const positive = z.number().finite().positive();
const costSchema: z.ZodType<CostInput> = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("total"),
    amount: positive,
    currency,
    date: z.number().optional(),
    averagePrice: positive.optional(),
  }),
  z.object({
    kind: z.literal("aportes"),
    aportes: z.array(z.object({ id: z.string(), date: z.number(), amount: positive, currency, btc: positive.optional() })),
    vendas: z.array(z.object({ id: z.string(), date: z.number(), btc: positive, amount: positive.optional(), currency })),
  }),
]);

const portfolioSchema = z.object({
  source: z.enum(["manual", "binance"]),
  /** null enquanto o Visitante conectou a Binance mas ainda não informou quanto pagou. */
  cost: costSchema.nullable(),
  /** Quantidade informada à mão (Fonte Manual com Total investido). */
  btc: positive.optional(),
});
export type StoredPortfolio = z.infer<typeof portfolioSchema>;

export type PortfolioState = { status: "loading" } | { status: "ready"; data: StoredPortfolio | null; persisted: boolean };

let snapshot: PortfolioState = { status: "loading" };
const listeners = new Set<() => void>();
let started = false;

function publish(next: PortfolioState) {
  snapshot = next;
  listeners.forEach((notify) => notify());
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function load() {
  try {
    const raw = await run("readonly", (s) => s.get(KEY));
    const parsed = portfolioSchema.safeParse(raw);
    publish({ status: "ready", data: parsed.success ? parsed.data : null, persisted: true });
  } catch {
    // Navegação privada ou IndexedDB bloqueado: os dados valem só até fechar a aba.
    publish({ status: "ready", data: null, persisted: false });
  }
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  if (!started) {
    started = true;
    void load();
  }
  return () => listeners.delete(notify);
}

const loading: PortfolioState = { status: "loading" };

export function usePortfolio(): PortfolioState {
  return useSyncExternalStore(subscribe, () => snapshot, () => loading);
}

export async function savePortfolio(data: StoredPortfolio): Promise<void> {
  const valid = portfolioSchema.parse(data);
  let persisted = true;
  try {
    await run("readwrite", (s) => s.put(valid, KEY));
  } catch {
    persisted = false;
  }
  publish({ status: "ready", data: valid, persisted });
}

/** Apaga tudo o que o Visitante informou neste navegador. */
export async function clearPortfolio(): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    // nada guardado
  }
  publish({ status: "ready", data: null, persisted: snapshot.status === "ready" && snapshot.persisted });
}
