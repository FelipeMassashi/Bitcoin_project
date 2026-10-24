import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes do Tailwind resolvendo conflitos (usado pelos componentes da Cult UI). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
