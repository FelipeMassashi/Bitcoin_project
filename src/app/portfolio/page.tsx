import type { Metadata } from "next";
import { PortfolioDetail } from "@/components/sections/PortfolioDetail";
import { PortfolioSummary } from "@/components/sections/PortfolioSummary";

export const metadata: Metadata = { title: "Meu portfólio" };

export default function Portfolio() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight">Meu portfólio</h1>
      <PortfolioSummary detailLink={false} />
      <PortfolioDetail />
    </div>
  );
}
