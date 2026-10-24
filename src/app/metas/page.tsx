import type { Metadata } from "next";
import { DcaSimulator } from "@/components/goals/DcaSimulator";
import { GoalCalculator } from "@/components/goals/GoalCalculator";
import { HistoricalTime } from "@/components/goals/HistoricalTime";
import { MonteCarloFan } from "@/components/goals/MonteCarloFan";

export const metadata: Metadata = { title: "Metas & projeções" };

export default function Metas() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Metas & projeções</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Ninguém sabe o preço de amanhã. As estimativas abaixo mostram faixas e chances com base no que já aconteceu, sempre
          com o cálculo à vista.
        </p>
      </div>
      <GoalCalculator />
      <HistoricalTime />
      <MonteCarloFan />
      <DcaSimulator />
    </div>
  );
}
