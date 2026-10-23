import { MainChart } from "@/components/sections/MainChart";
import { PriceHero } from "@/components/sections/PriceHero";
import { EmptyState } from "@/components/ui/EmptyState";

export default function VisaoGeral() {
  return (
    <div className="flex flex-col gap-10">
      <PriceHero />
      <EmptyState title="Conecte sua Binance ou informe seu investimento para ver seu resultado">
        Aqui vão aparecer quanto você investiu, quanto vale hoje, seu preço médio e o lucro ou prejuízo, em reais e
        dólares.
      </EmptyState>
      <MainChart />
    </div>
  );
}
