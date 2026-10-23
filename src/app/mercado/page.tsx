import type { Metadata } from "next";
import { MainChart } from "@/components/sections/MainChart";
import { PriceHero } from "@/components/sections/PriceHero";

export const metadata: Metadata = { title: "Mercado" };

export default function Mercado() {
  return (
    <div className="flex flex-col gap-10">
      <PriceHero />
      <MainChart />
    </div>
  );
}
