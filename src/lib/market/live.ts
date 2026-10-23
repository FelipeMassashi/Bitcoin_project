"use client";

import { useSyncExternalStore } from "react";
import type { MarketSymbol } from "./client";
import { parseTickerMessage, type Ticker } from "./ticker";

// Uma única conexão compartilhada por todos os componentes; abre no primeiro
// assinante e fecha quando o último sai. Reconecta com espera crescente (até 30 s).
const URL =
  "wss://data-stream.binance.vision/stream?streams=btcusdt@ticker/btcbrl@ticker/usdtbrl@ticker";

export type LiveTickers = {
  /** Falso enquanto conecta ou reconecta: os preços abaixo podem estar velhos. */
  connected: boolean;
} & Partial<Record<MarketSymbol, Ticker>>;

let snapshot: LiveTickers = { connected: false };

function publish(next: LiveTickers) {
  snapshot = next;
  listeners.forEach((notify) => notify());
}
const listeners = new Set<() => void>();
let socket: WebSocket | null = null;
let retry = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function connect() {
  retryTimer = undefined;
  socket = new WebSocket(URL);
  socket.onopen = () => {
    retry = 0;
    publish({ ...snapshot, connected: true });
  };
  socket.onmessage = (event) => {
    let json: unknown;
    try {
      json = JSON.parse(String(event.data));
    } catch {
      return;
    }
    const ticker = parseTickerMessage(json);
    if (ticker) publish({ ...snapshot, connected: true, [ticker.symbol]: ticker });
  };
  socket.onclose = () => {
    socket = null;
    publish({ ...snapshot, connected: false });
    if (listeners.size === 0) return;
    retryTimer = setTimeout(connect, Math.min(30_000, 1_000 * 2 ** retry++));
  };
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  if (!socket && !retryTimer) connect();
  return () => {
    listeners.delete(notify);
    if (listeners.size > 0) return;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    socket?.close();
  };
}

const empty: LiveTickers = { connected: false };

export function useLiveTickers(): LiveTickers {
  return useSyncExternalStore(subscribe, () => snapshot, () => empty);
}
