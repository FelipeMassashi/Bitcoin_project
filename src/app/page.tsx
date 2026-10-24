import { MainChart } from "@/components/sections/MainChart";
import { PriceHero } from "@/components/sections/PriceHero";
import { SignalSummary } from "@/components/sections/SignalPanel";
import { PortfolioSummary } from "@/components/sections/PortfolioSummary";

export default function VisaoGeral() {
  return (
    <div className="flex flex-col gap-10">
      <PriceHero />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <SignalSummary />
        <PortfolioSummary />
      </div>
      <MainChart />
    </div>
  );
}
