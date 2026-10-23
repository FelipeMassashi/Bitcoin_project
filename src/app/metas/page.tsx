import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Metas & projeções" };

export default function Metas() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight">Metas & projeções</h1>
      <EmptyState title="Informe seu investimento para calcular sua meta">
        Você vai ver a que preço o bitcoin precisa chegar para o lucro que deseja e quanto tempo isso costumou levar no
        histórico.
      </EmptyState>
    </div>
  );
}
