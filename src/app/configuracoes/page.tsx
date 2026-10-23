import type { Metadata } from "next";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export const metadata: Metadata = { title: "Configurações" };

export default function Configuracoes() {
  return (
    <div className="flex max-w-md flex-col gap-8">
      <h1 className="text-2xl font-medium tracking-tight">Configurações</h1>
      <ThemeToggle />
    </div>
  );
}
