import * as React from "react";
import { cn } from "@/lib/utils";

// Cult UI · texture-card (https://www.cult-ui.com/docs/components/texture-card).
// Ajuste local: bordas aninhadas com as cores do projeto; o fundo fica por conta do conteúdo.
export function TextureCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[var(--radius-hero)] border border-[var(--bevel-hi)]", className)} {...props}>
      <div className="rounded-[calc(var(--radius-hero)-1px)] border border-black/10">
        <div className="rounded-[calc(var(--radius-hero)-2px)] border border-[var(--bevel-hi)]">
          <div className="rounded-[calc(var(--radius-hero)-3px)] border border-black/20">
            <div className="relative isolate w-full overflow-hidden rounded-[calc(var(--radius-hero)-4px)] border border-white/25">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
