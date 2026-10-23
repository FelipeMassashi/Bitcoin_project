"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { explicacoes, type ExplicacaoId } from "@/content/explicacoes";

const WIDTH = 304;
const GUTTER = 16;

/**
 * Ícone (i) que explica uma métrica: o que é, para que serve e, se informado, o que ela diz agora.
 * Abre com o mouse, com o teclado (Enter/Espaço) e com toque; fecha com Esc ou clicando fora.
 */
export function Explain({ id, now }: { id: ExplicacaoId; now?: ReactNode }) {
  const { titulo, oQueE, paraQueServe } = explicacoes[id];
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();

  function place() {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.max(GUTTER, Math.min(rect.left - 12, window.innerWidth - WIDTH - GUTTER));
    setPos({ top: rect.bottom + 8, left });
  }

  function show(pin: boolean) {
    place();
    setOpen(true);
    if (pin) setPinned(true);
  }

  function hide() {
    setOpen(false);
    setPinned(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (hide(), button.current?.focus());
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) hide();
    };
    const onScroll = () => hide();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, { passive: true, once: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  return (
    <span className="inline-flex align-middle" onMouseLeave={() => !pinned && setOpen(false)}>
      <button
        ref={button}
        type="button"
        aria-label={`O que é: ${titulo}`}
        aria-expanded={open}
        aria-controls={panelId}
        onMouseEnter={() => show(false)}
        onClick={() => (pinned ? hide() : show(true))}
        className="inline-grid size-[1.15rem] place-items-center rounded-full text-muted transition-colors hover:text-accent aria-expanded:text-accent"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[0.95rem]">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.85" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={titulo}
          style={{ top: pos.top, left: pos.left, width: WIDTH }}
          className="fixed z-50 rounded-panel border border-line-strong bg-surface p-4 text-left text-[0.85rem] leading-relaxed font-normal tracking-normal text-ink shadow-[0_6px_24px_-12px_rgb(0_0_0/0.25)]"
        >
          <p className="font-medium">{titulo}</p>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="text-xs text-muted">O que é</dt>
              <dd>{oQueE}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Para que serve</dt>
              <dd>{paraQueServe}</dd>
            </div>
            {now && (
              <div className="border-t border-line pt-2">
                <dt className="text-xs text-muted">O que diz agora</dt>
                <dd>{now}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </span>
  );
}
