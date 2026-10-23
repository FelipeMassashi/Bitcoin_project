import type { IndicatorKey } from "@/config/signal-weights";
import type { ExplicacaoId } from "@/content/explicacoes";
import { formatSignedPercent } from "@/lib/format/format";
import type { Zone } from "./composite";

const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const two = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedPct = (v: number) => formatSignedPercent(v, 0);

/** Faixas que historicamente marcaram fundos e topos; usadas nos textos e nas linhas dos gráficos. */
export const THRESHOLDS = {
  mayer: { low: 0.8, high: 2.4 },
  drawdownBottoms: -0.75,
  rsiDaily: { low: 30, high: 70 },
  rsiWeekly: { low: 30, high: 80 },
  /** Faixas oficiais da alternative.me: abaixo de 25 é medo extremo, de 76 em diante ganância extrema. */
  fearGreed: { extremeFear: 25, fear: 47, neutral: 55, extremeGreed: 76 },
} as const;

export function fearGreedLabel(value: number): string {
  const f = THRESHOLDS.fearGreed;
  if (value < f.extremeFear) return "Medo extremo";
  if (value < f.fear) return "Medo";
  if (value < f.neutral) return "Neutro";
  if (value < f.extremeGreed) return "Ganância";
  return "Ganância extrema";
}

type Meta = {
  label: string;
  explain: ExplicacaoId;
  format: (value: number) => string;
  /** Frase curta sobre o valor de hoje, sem a nota. */
  read: (value: number) => string;
  /** O que "valor menor" quer dizer para este indicador, na frase da Nota. */
  lower: string;
};

export const INDICATORS: Record<IndicatorKey, Meta> = {
  mayer: {
    label: "Mayer Multiple",
    explain: "mayer",
    format: (v) => `${two.format(v)}×`,
    read: (v) =>
      v < THRESHOLDS.mayer.low ? `Abaixo de ${two.format(THRESHOLDS.mayer.low)}: faixa que no passado apareceu perto de fundos.`
      : v > THRESHOLDS.mayer.high ? `Acima de ${two.format(THRESHOLDS.mayer.high)}: faixa que no passado apareceu perto de topos.`
      : `O preço está ${v >= 1 ? int.format((v - 1) * 100) + "% acima" : int.format((1 - v) * 100) + "% abaixo"} da média de 200 dias.`,
    lower: "Mayer Multiple menor",
  },
  ma200w: {
    label: "Distância da média de 200 semanas",
    explain: "dist200s",
    format: signedPct,
    read: (v) =>
      v < 0 ? "O preço está abaixo da média de 200 semanas, algo raro e historicamente perto de fundos."
      : `O preço está ${int.format(v * 100)}% acima da média de 200 semanas.`,
    lower: "o preço mais perto da média de 200 semanas (ou abaixo dela)",
  },
  drawdown: {
    label: "Queda desde a máxima histórica",
    explain: "drawdown",
    format: signedPct,
    read: (v) => (v > -0.02 ? "O preço está no topo histórico ou muito perto dele." : `O preço está ${int.format(-v * 100)}% abaixo da maior máxima já registrada.`),
    lower: "uma queda maior que a de hoje",
  },
  fearGreed: {
    label: "Medo e ganância",
    explain: "fearGreed",
    format: (v) => `${int.format(v)} · ${fearGreedLabel(v)}`,
    read: (v) => `O mercado está em "${fearGreedLabel(v).toLowerCase()}" (${int.format(v)} de 100).`,
    lower: "",
  },
  rsiDaily: {
    label: "RSI diário",
    explain: "rsiDaily",
    format: (v) => int.format(v),
    read: (v) => {
      const { low, high } = THRESHOLDS.rsiDaily;
      return v > high ? `Acima de ${high}: subiu rápido demais nos últimos dias.` : v < low ? `Abaixo de ${low}: caiu rápido demais nos últimos dias.` : `Entre ${low} e ${high}: sem exagero no curto prazo.`;
    },
    lower: "",
  },
  rsiWeekly: {
    label: "RSI semanal",
    explain: "rsiWeekly",
    format: (v) => int.format(v),
    read: (v) => {
      const { low, high } = THRESHOLDS.rsiWeekly;
      return v > high ? `Acima de ${high}: nível visto perto de topos de ciclo.` : v < low ? `Abaixo de ${low}: nível visto só nos piores momentos dos ciclos.` : "Sem exagero no horizonte de meses.";
    },
    lower: "",
  },
  macd: {
    label: "MACD",
    explain: "macd",
    format: (v) => (v >= 0 ? "Em alta" : "Em queda"),
    read: (v) => (v >= 0 ? "O impulso recente é de alta." : "O impulso recente é de queda."),
    lower: "impulso mais fraco (ou de queda mais forte)",
  },
};

export const ZONE_LABEL: Record<Zone, string> = { compra: "Zona de compra", neutro: "Neutro", venda: "Zona de venda" };

export function notaSentence(key: IndicatorKey, nota: number): string {
  const lower = INDICATORS[key].lower;
  if (!lower) return "Já vem de 0 a 100 e entra direto como nota.";
  return `Nota ${int.format(nota)}: em ${int.format(nota)}% dos dias da história houve ${lower}.`;
}
