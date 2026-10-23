"use client";

import { useSyncExternalStore } from "react";
import type { Currency } from "./format/format";

// Preferências de exibição, não dados do Visitante: ficam no localStorage deste navegador.
const CURRENCY_KEY = "moeda";
const listeners = new Set<() => void>();
let fallback: Currency = "BRL"; // usado quando o navegador bloqueia o localStorage

function readCurrency(): Currency {
  try {
    const stored = localStorage.getItem(CURRENCY_KEY);
    return stored === "USD" || stored === "BRL" ? stored : fallback;
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

export function useCurrency(): [Currency, (next: Currency) => void] {
  const currency = useSyncExternalStore(subscribe, readCurrency, () => "BRL" as const);
  const setCurrency = (next: Currency) => {
    fallback = next;
    try {
      localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      // sem localStorage a escolha vale só até recarregar
    }
    listeners.forEach((notify) => notify());
  };
  return [currency, setCurrency];
}
