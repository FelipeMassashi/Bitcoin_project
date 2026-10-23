import type { Metadata } from "next";
import { HalvingCycle } from "@/components/sections/HalvingCycle";
import { IndicatorHistory } from "@/components/sections/IndicatorHistory";
import { MainChart } from "@/components/sections/MainChart";
import { MonthlyHeatmap, MonthlyPeaks } from "@/components/sections/MonthlyPeaks";
import { PriceHero } from "@/components/sections/PriceHero";
import { SignalPanel } from "@/components/sections/SignalPanel";

export const metadata: Metadata = { title: "Mercado" };

export default function Mercado() {
  return (
    <div className="flex flex-col gap-10">
      <PriceHero />
      <MainChart />
      <SignalPanel />
      <IndicatorHistory />
      <MonthlyPeaks />
      <MonthlyHeatmap />
      <HalvingCycle />
    </div>
  );
}
