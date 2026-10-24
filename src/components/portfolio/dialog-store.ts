"use client";

import { useSyncExternalStore } from "react";

export type DialogTab = "binance" | "manual";
type DialogState = { open: false } | { open: true; tab?: DialogTab };

let state: DialogState = { open: false };
const listeners = new Set<() => void>();
const set = (next: DialogState) => {
  state = next;
  listeners.forEach((notify) => notify());
};

/** Abre a janela "Seu investimento" de qualquer lugar da página. */
export const openPortfolioDialog = (tab?: DialogTab) => set({ open: true, tab });
export const closePortfolioDialog = () => set({ open: false });

const closed: DialogState = { open: false };
export function usePortfolioDialog(): DialogState {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => state,
    () => closed,
  );
}
