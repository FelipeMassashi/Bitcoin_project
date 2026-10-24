import type { ReactNode } from "react";
import { GradientPanel } from "./GradientPanel";

/** Título da página sobre o gradiente da marca. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <GradientPanel as="header" className="px-5 py-7 md:px-8 md:py-9">
      <h1 className="text-2xl font-medium tracking-tight md:text-3xl">{title}</h1>
      {children && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{children}</p>}
    </GradientPanel>
  );
}
