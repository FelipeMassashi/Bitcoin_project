"use client";

// Cult UI · halo-segmented (https://www.cult-ui.com/docs/components/halo-segmented).
// Ajustes locais: cores do projeto no lugar dos tokens do shadcn, halo com o gradiente da marca
// (amarelo, ouro escuro, preto) e radios nativos no lugar dos toggles, como o Segmented do projeto:
// o leitor de tela anuncia "1 de 2" e as setas trocam a opção.
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const layoutSpring = { type: "spring" as const, bounce: 0.12, damping: 34, stiffness: 420 };

export interface HaloSegmentedItem<T extends string> {
  value: T;
  label: ReactNode;
}

export interface HaloSegmentedProps<T extends string> {
  name: string;
  label: string;
  items: readonly HaloSegmentedItem<T>[];
  value: T;
  onValueChange: (next: T) => void;
}

export function HaloSegmented<T extends string>({ name, label, items, value, onValueChange }: HaloSegmentedProps<T>) {
  const reduceMotion = useReducedMotion() ?? false;
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLLabelElement>>(new Map());
  const [thumb, setThumb] = useState({ x: 0, width: 0 });

  const measureThumb = useCallback(() => {
    const track = trackRef.current;
    const active = itemRefs.current.get(value);
    if (!(track && active)) return setThumb({ x: 0, width: 0 });
    const tr = track.getBoundingClientRect();
    const br = active.getBoundingClientRect();
    setThumb({ x: br.left - tr.left, width: br.width });
  }, [value]);

  useLayoutEffect(() => {
    measureThumb();
  }, [measureThumb]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureThumb());
    ro.observe(track);
    return () => ro.disconnect();
  }, [measureThumb]);

  return (
    <fieldset className="relative inline-flex max-w-full rounded-full p-px">
      <legend className="sr-only">{label}</legend>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <div className="absolute inset-x-0 bottom-0 h-1/2 opacity-70">
          <motion.div
            animate={reduceMotion ? undefined : { left: ["-5%", "75%", "-5%"] }}
            className="absolute -bottom-4 h-14 w-44 blur-xl"
            style={{ background: "linear-gradient(90deg, var(--grad-1), var(--grad-2), var(--grad-3))" }}
            transition={{ duration: 6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
          />
          <motion.div
            animate={reduceMotion ? undefined : { left: ["65%", "10%", "65%"] }}
            className="absolute -bottom-3 left-[40%] h-11 w-36 blur-lg"
            style={{ background: "linear-gradient(90deg, var(--grad-3), var(--grad-1))" }}
            transition={{ duration: 5, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
          />
        </div>
      </div>

      <div
        className={cn(
          "relative rounded-full border border-line-strong backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_1px_2px_rgba(0,0,0,0.2),0_4px_14px_rgba(0,0,0,0.18)]",
        )}
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklch, var(--surface) 82%, transparent) 0%, color-mix(in oklch, var(--surface) 70%, transparent) 100%)",
        }}
      >
        <div className="relative p-1" ref={trackRef}>
          <motion.div
            animate={{ x: thumb.x, width: thumb.width }}
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1 bottom-1 left-0 rounded-full border border-line-strong",
              "bg-[color-mix(in_oklch,var(--surface)_70%,var(--ink)_14%)]",
              "shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_8px_rgba(0,0,0,0.2)]",
            )}
            initial={false}
            transition={reduceMotion ? { duration: 0 } : layoutSpring}
          />

          <div className="relative z-1 flex min-w-0 gap-0">
            {items.map((item) => (
              <label
                key={item.value}
                ref={(el) => {
                  if (el) itemRefs.current.set(item.value, el);
                  else itemRefs.current.delete(item.value);
                }}
                className={cn(
                  "relative flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full px-4 py-1.5 whitespace-nowrap",
                  "text-[0.82rem] font-medium tracking-tight text-muted transition-colors duration-200 ease-out",
                  "has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-accent",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={item.value}
                  checked={value === item.value}
                  onChange={() => onValueChange(item.value)}
                  className="sr-only"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
