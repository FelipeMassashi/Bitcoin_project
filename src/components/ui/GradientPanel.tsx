import type { ReactNode } from "react";
import { TextureCard } from "@/components/cult/texture-card";
import { GradientBackdrop } from "./GradientBackdrop";

/** Bloco sobre o gradiente da marca: moldura, gradiente, véu de contraste e tokens claros por cima. */
export function GradientPanel({ as: Tag = "section", className, children, ...aria }: {
  as?: "section" | "header";
  className: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  return (
    <TextureCard>
      <Tag className={`on-gradient relative ${className}`} {...aria}>
        <GradientBackdrop />
        <div aria-hidden="true" className="gradient-veil absolute inset-0 -z-10" />
        {children}
      </Tag>
    </TextureCard>
  );
}
