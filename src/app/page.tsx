import { MainChart } from "@/components/sections/MainChart";
import { PriceHero } from "@/components/sections/PriceHero";
import { SignalSummary } from "@/components/sections/SignalPanel";
import { EmptyState } from "@/components/ui/EmptyState";

export default function VisaoGeral() {
  return (
    <div className="flex flex-col gap-10">
      <PriceHero />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <SignalSummary />
        <EmptyState title="Conecte sua Binance ou informe seu investimento para ver seu resultado">
          Aqui vão aparecer quanto você investiu, quanto vale hoje, seu preço médio e o lucro ou prejuízo, em reais e
          dólares.
        </EmptyState>
      </div>
      <MainChart />
    </div>
  );
}
