import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Meu portfólio" };

export default function Portfolio() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight">Meu portfólio</h1>
      <EmptyState title="Conecte sua Binance ou informe seu investimento para ver esta análise">
        Você vai ver o valor do seu bitcoin ao longo do tempo comparado com o que investiu, e quais aportes estão no
        lucro.
      </EmptyState>
    </div>
  );
}
