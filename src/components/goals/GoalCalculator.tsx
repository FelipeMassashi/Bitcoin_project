"use client";

import { useId, useState } from "react";
import { openPortfolioDialog } from "@/components/portfolio/dialog-store";
import { Explain } from "@/components/ui/Explain";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney, formatSignedPercent, parseDecimal } from "@/lib/format/format";
import { afterNewAporte, amountForProfit } from "@/lib/goals/goal";
import { useGoalView } from "@/lib/goals/use-goal-view";
import { GOAL_RANGE } from "@/lib/preferences";

const input =
  "num w-full rounded-control border border-line-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none";

function MoneyInput({ label, value, onChange, prefix }: { label: string; value: string; onChange: (v: string) => void; prefix: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">{prefix}</span>
        <input id={id} inputMode="decimal" className={input} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

/** Meta com slider, Preço-alvo, Alta necessária, quanto aportar para um lucro e o efeito de um novo Aporte. */
export function GoalCalculator() {
  const { currency, goal, setGoal, price, average, target, rise, position } = useGoalView();
  const [profitText, setProfitText] = useState("10.000");
  const [aporteText, setAporteText] = useState("1.000");
  const sliderId = useId();

  if (price === undefined || target === undefined || rise === undefined) return <Skeleton className="h-96" />;
  const fmt = (v: number) => formatMoney(v, currency);
  const prefix = currency === "BRL" ? "R$" : "US$";
  const goalText = formatSignedPercent(goal, 0);

  const profit = parseDecimal(profitText, "money");
  const aporte = parseDecimal(aporteText, "money");
  const owned = position && average !== null ? { btc: position.btc, invested: position.invested[currency] } : { btc: 0, invested: 0 };
  const after = aporte && aporte > 0 ? afterNewAporte(owned, { amount: aporte, price }, goal) : null;

  const riseNow =
    rise <= 0
      ? `O preço de hoje (${fmt(price)}) já está ${formatSignedPercent(-rise, 1).replace("+", "")} acima do preço-alvo.`
      : `O preço precisa subir ${formatSignedPercent(rise, 1)} a partir de ${fmt(price)} para chegar a ${fmt(target)}.`;

  return (
    <section aria-labelledby="meta-titulo" className="rounded-panel border border-line bg-surface p-4 md:p-6">
      <h2 id="meta-titulo" className="flex items-center gap-2 text-lg font-medium tracking-tight">
        A que preço o bitcoin precisa chegar para a sua meta?
        <Explain id="meta" now={`Sua meta é ${goalText} sobre ${average !== null ? "o seu preço médio" : "o preço de hoje"}.`} />
      </h2>
      {average === null && (
        <p className="mt-1 text-sm text-muted">
          Sem o seu preço médio, as contas usam o preço de hoje, como se você comprasse agora.{" "}
          <button type="button" onClick={() => openPortfolioDialog()} className="text-accent underline-offset-4 hover:underline">
            Informar meu investimento
          </button>
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor={sliderId} className="text-sm text-muted">
                Meta de lucro
              </label>
              <span className="num text-2xl font-light">{goalText}</span>
            </div>
            <input
              id={sliderId}
              type="range"
              min={GOAL_RANGE.min * 100}
              max={GOAL_RANGE.max * 100}
              step={5}
              value={Math.round(goal * 100)}
              onChange={(e) => setGoal(Number(e.target.value) / 100)}
              aria-valuetext={`${goalText} de lucro`}
              className="mt-3 w-full accent-[var(--accent)]"
            />
            <div className="num mt-1 flex justify-between text-xs text-muted">
              <span>+10%</span>
              <span>+200%</span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-5">
            <div>
              <dt className="text-xs text-muted">{average !== null ? "Seu preço médio" : "Preço de hoje"}</dt>
              <dd className="num mt-1 text-lg">{fmt(average ?? price)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                Preço-alvo <Explain id="precoAlvo" />
              </dt>
              <dd className="num mt-1 text-lg text-accent">{fmt(target)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                Alta necessária a partir de hoje <Explain id="altaNecessaria" now={riseNow} />
              </dt>
              <dd className="num mt-1 text-3xl font-light">
                {rise <= 0 ? <span className="text-up">Você já está acima da meta</span> : formatSignedPercent(rise, 1)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-6 lg:border-l lg:border-line lg:pl-8">
          <div>
            <h3 className="flex items-center gap-2 font-medium">
              Quanto aportar para lucrar um valor
              <Explain id="aporteParaLucro" />
            </h3>
            <div className="mt-3">
              <MoneyInput label="Lucro que você quer" value={profitText} onChange={setProfitText} prefix={prefix} />
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              {profit && profit > 0 ? (
                <>
                  Aportando <b className="num font-medium">{fmt(amountForProfit(profit, goal))}</b> hoje, esse dinheiro rende{" "}
                  {fmt(profit)} quando atingir a sua meta de {goalText} sobre o preço de hoje (bitcoin a {fmt(price * (1 + goal))}).
                </>
              ) : (
                <span className="text-muted">Digite o lucro que você quer.</span>
              )}
            </p>
          </div>

          <div className="border-t border-line pt-6">
            <h3 className="flex items-center gap-2 font-medium">
              E se eu aportar mais hoje?
              <Explain id="novoAporte" />
            </h3>
            <div className="mt-3">
              <MoneyInput label="Valor do novo aporte" value={aporteText} onChange={setAporteText} prefix={prefix} />
            </div>
            {after ? (
              <dl className="num mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Preço médio</dt>
                  <dd className="mt-1">{fmt(after.averagePrice)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Preço-alvo</dt>
                  <dd className="mt-1">{fmt(after.targetPrice)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Alta necessária</dt>
                  <dd className="mt-1">{after.requiredRise <= 0 ? "já atingida" : formatSignedPercent(after.requiredRise, 1)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">Digite um valor.</p>
            )}
            {after && average !== null && (
              <p className="mt-3 text-sm text-muted">
                {after.averagePrice < average
                  ? `Aportando abaixo do seu preço médio, ele cai ${formatSignedPercent(after.averagePrice / average - 1, 1).replace("−", "")} e a meta fica mais perto.`
                  : `Aportando acima do seu preço médio, ele sobe ${formatSignedPercent(after.averagePrice / average - 1, 1)} e a meta fica mais longe.`}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
