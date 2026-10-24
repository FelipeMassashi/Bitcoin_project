import type { Metadata } from "next";
import { PortfolioDetail } from "@/components/sections/PortfolioDetail";
import { PortfolioSummary } from "@/components/sections/PortfolioSummary";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Meu portfólio" };

export default function Portfolio() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Meu portfólio">Quanto vale o seu bitcoin, quanto você investiu e como cada aporte está indo.</PageHeader>
      <PortfolioSummary detailLink={false} />
      <PortfolioDetail />
    </div>
  );
}
