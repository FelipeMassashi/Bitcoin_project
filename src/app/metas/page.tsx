import type { Metadata } from "next";
import { DcaSimulator } from "@/components/goals/DcaSimulator";
import { GoalCalculator } from "@/components/goals/GoalCalculator";
import { HistoricalTime } from "@/components/goals/HistoricalTime";
import { MonteCarloFan } from "@/components/goals/MonteCarloFan";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Metas & projeções" };

export default function Metas() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Metas & projeções">
        Ninguém sabe o preço de amanhã. As estimativas abaixo mostram faixas e chances com base no que já aconteceu, sempre
        com o cálculo à vista.
      </PageHeader>
      <GoalCalculator />
      <HistoricalTime />
      <MonteCarloFan />
      <DcaSimulator />
    </div>
  );
}
