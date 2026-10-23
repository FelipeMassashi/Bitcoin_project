"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Visão geral", short: "Início" },
  { href: "/mercado", label: "Mercado", short: "Mercado" },
  { href: "/portfolio", label: "Meu portfólio", short: "Portfólio" },
  { href: "/metas", label: "Metas & projeções", short: "Metas" },
  { href: "/configuracoes", label: "Configurações", short: "Ajustes" },
] as const;

const DISCLAIMER = "Ferramenta de análise. Não é recomendação de investimento.";

function Mark() {
  // Monograma: um "₿" desenhado como duas barras sobre um anel, sem usar emoji nem logo de marca.
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 text-accent">
      <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7.5h4.25a2.25 2.25 0 0 1 0 4.5H9m0 0h4.75a2.25 2.25 0 0 1 0 4.5H9m0-9v9M10.5 6v1.5m2 0V6m-2 12v-1.5m2 1.5v-1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Desktop: coluna fixa à esquerda. */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-5 py-8 md:flex">
        <Link href="/" className="flex items-center gap-2.5 text-[0.95rem] font-semibold tracking-tight">
          <Mark />
          Bitcoin em perspectiva
        </Link>
        <nav aria-label="Seções" className="mt-10 flex flex-col gap-0.5">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className="rounded-control px-2.5 py-2 text-[0.92rem] text-muted transition-colors hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-4">
          <ThemeToggle />
          <p className="text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
        </div>
      </aside>

      {/* Celular: barra inferior com o aviso logo acima. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur-sm md:hidden">
        <p className="border-b border-line px-4 py-1.5 text-center text-[0.7rem] text-muted">{DISCLAIMER}</p>
        <nav aria-label="Seções" className="grid grid-cols-5">
          {NAV.map(({ href, label, short }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive(href) ? "page" : undefined}
              className="px-1 py-3 text-center text-[0.72rem] leading-tight text-muted aria-[current=page]:font-medium aria-[current=page]:text-accent"
            >
              {short}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
