"use client";

import { useSyncExternalStore } from "react";

// Os gráficos desenham em canvas e não enxergam CSS: lemos os mesmos tokens de globals.css
// e avisamos quando o tema muda (atributo data-theme ou preferência do sistema).
const TOKENS = ["paper", "surface", "ink", "muted", "line", "line-strong", "accent", "up", "down"] as const;
export type ThemeColors = Record<(typeof TOKENS)[number], string>;

let cache: ThemeColors | null = null;
let cacheKey = "";

function read(): ThemeColors {
  const style = getComputedStyle(document.documentElement);
  const key = TOKENS.map((t) => style.getPropertyValue(`--${t}`).trim()).join("|");
  if (key !== cacheKey || !cache) {
    cacheKey = key;
    cache = Object.fromEntries(key.split("|").map((v, i) => [TOKENS[i], v])) as ThemeColors;
  }
  return cache;
}

function subscribe(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notify);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", notify);
  };
}

export function useThemeColors(): ThemeColors | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
