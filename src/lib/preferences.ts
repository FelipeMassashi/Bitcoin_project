"use client";

import { useSyncExternalStore } from "react";
import type { Currency } from "./format/format";

// Preferências que a página lê de forma síncrona (moeda, Meta): ficam no localStorage deste navegador.

/** Uma preferência guardada como texto, com valor padrão quando o navegador bloqueia o localStorage. */
function createPreference<T>(key: string, initial: T, parse: (stored: string) => T | null, serialize: (value: T) => string) {
  const listeners = new Set<() => void>();
  let fallback = initial; // usado quando o navegador bloqueia o localStorage
  let cache: { raw: string | null; value: T } | null = null;

  function read(): T {
    try {
      const raw = localStorage.getItem(key);
      if (cache?.raw !== raw) cache = { raw, value: (raw === null ? null : parse(raw)) ?? fallback };
      return cache.value;
    } catch {
      return fallback;
    }
  }

  function subscribe(notify: () => void) {
    listeners.add(notify);
    window.addEventListener("storage", notify);
    return () => {
      listeners.delete(notify);
      window.removeEventListener("storage", notify);
    };
  }

  return function usePreference(): [T, (next: T) => void] {
    const value = useSyncExternalStore(subscribe, read, () => initial);
    const set = (next: T) => {
      fallback = next;
      cache = null;
      try {
        localStorage.setItem(key, serialize(next));
      } catch {
        // sem localStorage a escolha vale só até recarregar
      }
      listeners.forEach((notify) => notify());
    };
    return [value, set];
  };
}

export const useCurrency = createPreference<Currency>(
  "moeda",
  "BRL",
  (s) => (s === "USD" || s === "BRL" ? s : null),
  (c) => c,
);

export const GOAL_RANGE = { min: 0.1, max: 2, initial: 0.25 } as const;

/** A Meta do Visitante (fração: 0,25 = +25%), usada na calculadora e na linha de alvo do gráfico. */
export const useGoal = createPreference<number>(
  "meta",
  GOAL_RANGE.initial,
  (s) => {
    const n = Number(s);
    return Number.isFinite(n) && n >= GOAL_RANGE.min && n <= GOAL_RANGE.max ? n : null;
  },
  String,
);
