"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useThemeColors } from "@/lib/theme-colors";

// three.js só baixa quando o gradiente animado vai mesmo aparecer.
const ShaderLayer = dynamic(() => import("./ShaderLayer"), { ssr: false });

const REDUCED = "(prefers-reduced-motion: reduce)";
let webgl: boolean | undefined;

function hasWebgl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function canAnimate() {
  if (window.matchMedia(REDUCED).matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  webgl ??= hasWebgl();
  return webgl;
}

// Reage na hora se o Visitante ligar "reduzir movimento" com a página aberta.
function subscribe(notify: () => void) {
  const media = window.matchMedia(REDUCED);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

/**
 * Fundo com o gradiente da marca. Sempre pinta uma versão estática em CSS; por cima, quando o
 * aparelho aguenta e o Visitante não pediu menos movimento, entra o gradiente animado, que pausa
 * fora da tela.
 */
export function GradientBackdrop() {
  const colors = useThemeColors();
  const animated = useSyncExternalStore(subscribe, canAnimate, () => false);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={box} aria-hidden="true" className="absolute inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 140% at 85% 10%, var(--grad-1) 0%, transparent 55%), radial-gradient(90% 120% at 30% 100%, var(--grad-2) 0%, transparent 60%), var(--grad-3)",
        }}
      />
      {animated && colors && (
        <ShaderLayer colors={[colors["grad-3"], colors["grad-2"], colors["grad-1"]]} playing={visible} />
      )}
    </div>
  );
}
