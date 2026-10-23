"use client";

import { useId, useLayoutEffect, useSyncExternalStore } from "react";

type Choice = "sistema" | "claro" | "escuro";
const OPTIONS: { value: Choice; label: string }[] = [
  { value: "sistema", label: "Sistema" },
  { value: "claro", label: "Claro" },
  { value: "escuro", label: "Escuro" },
];

function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === "sistema") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

function stored(): Choice {
  try {
    const t = localStorage.getItem("tema");
    return t === "claro" || t === "escuro" ? t : "sistema";
  } catch {
    return "sistema";
  }
}

const listeners = new Set<() => void>();
function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribe, stored, () => "sistema" as const);
  // A página de Configurações e a barra lateral mostram o controle ao mesmo tempo.
  const name = useId();

  // O script do <head> já aplicou o tema; reaplicamos só para o remount do modo de desenvolvimento.
  useLayoutEffect(() => apply(stored()), []);

  function choose(next: Choice) {
    apply(next);
    try {
      if (next === "sistema") localStorage.removeItem("tema");
      else localStorage.setItem("tema", next);
    } catch {
      // sem localStorage o tema vale até recarregar
    }
    listeners.forEach((notify) => notify());
  }

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs text-muted">Tema</legend>
      <div className="grid grid-cols-3 rounded-control border border-line p-0.5">
        {OPTIONS.map(({ value, label }) => (
          <label
            key={value}
            className="cursor-pointer rounded-[4px] py-1 text-center text-xs text-muted has-checked:bg-surface has-checked:text-ink has-checked:shadow-[0_0_0_1px_var(--line)] has-focus-visible:outline-2 has-focus-visible:outline-accent"
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={choice === value}
              onChange={() => choose(value)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
