"use client";

import { useMemo } from "react";
import { Explain } from "@/components/ui/Explain";
import { LoadError } from "@/components/ui/LoadError";
import { Skeleton } from "@/components/ui/Skeleton";
import { cycleComparison } from "@/lib/indicators/valuation";
import { useDailySeries } from "@/lib/market/queries";

const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const months = (days: number) => `${one.format(days / 30.44)} meses`;

export function HalvingCycle() {
  const daily = useDailySeries();
  const cycles = useMemo(() => (daily.data ? cycleComparison(daily.data.map((p) => p.usd)) : []), [daily.data]);

  if (daily.error) return <LoadError />;
  const current = cycles.at(-1);
  if (daily.isPending || !current || !daily.data) return <Skeleton className="h-64" />;
  const daysNow = daily.data.length - 1 - daily.data.findIndex((p) => p.time === current.halving);
  const previous = cycles.slice(0, -1);
  const topsAfter = previous.filter((c) => c.topDays > daysNow).length;
  // Passados os 2 anos da janela, o Topo do ciclo atual não muda mais.
  const topSettled = daysNow >= 730;
  const halvingNow = `Dia ${int.format(daysNow)} do ${current.cycle}º ciclo. ${
    topSettled
      ? `O topo deste ciclo foi ${one.format(current.topMultiple)}× o preço do halving, ${months(current.topDays)} depois dele.`
      : `Até agora a máxima foi ${one.format(current.topMultiple)}× o preço do halving.`
  }`;

  return (
    <section aria-labelledby="halving-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <h2 id="halving-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
        Em que ponto do ciclo de 4 anos estamos?
        <Explain id="halving" now={halvingNow} />
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Hoje é o dia {int.format(daysNow)} depois do halving de {date.format(current.halving)} ({months(daysNow)}).{" "}
        {topsAfter === 0
          ? `Em todos os ${previous.length} ciclos anteriores o topo já tinha acontecido a esta altura.`
          : `Em ${topsAfter} dos ${previous.length} ciclos anteriores o topo ainda estava por vir a esta altura.`}
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="num w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-2 pr-4 font-normal">Ciclo</th>
              <th className="py-2 pr-4 font-normal">Halving</th>
              <th className="py-2 pr-4 font-normal">No dia {int.format(daysNow)}</th>
              <th className="py-2 pr-4 font-normal">Topo do ciclo</th>
              <th className="py-2 font-normal">Topo veio em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cycles.map((c) => {
              const isCurrent = c === current;
              return (
                <tr key={c.cycle} className={isCurrent ? "font-medium" : undefined}>
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                    {c.cycle}º {isCurrent && <span className="text-accent">· atual</span>}
                  </th>
                  <td className="py-2.5 pr-4">{date.format(c.halving)}</td>
                  <td className="py-2.5 pr-4">{c.sameDayMultiple === null ? "—" : `${one.format(c.sameDayMultiple)}× o preço do halving`}</td>
                  <td className="py-2.5 pr-4">{one.format(c.topMultiple)}×{isCurrent && !topSettled && " até agora"}</td>
                  <td className="py-2.5">{months(c.topDays)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Como isto é calculado</summary>
        <p className="mt-2 max-w-2xl leading-relaxed">
          Multiplicadores sobre o preço em dólar no dia de cada halving. O topo do ciclo é a maior máxima nos dois primeiros
          anos depois do halving: nos ciclos anteriores ele veio entre 12 e 18 meses, e assim um recorde às vésperas do
          halving seguinte não conta como topo. Com só {previous.length} ciclos anteriores, é contexto, não regra; por isso o
          ciclo não entra no sinal.
        </p>
      </details>
    </section>
  );
}
