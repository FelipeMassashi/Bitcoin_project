/** Períodos do histórico usados como amostra nas estimativas de tempo. */
export const SAMPLES = [
  { value: "4", label: "4 anos", years: 4 },
  { value: "8", label: "8 anos", years: 8 },
  { value: "tudo", label: "Desde 2011", years: Infinity },
] as const;
export type SampleId = (typeof SAMPLES)[number]["value"];

/** Primeiro índice da série dentro da amostra (série diária, um ponto por dia). */
export function sampleStart(length: number, sample: SampleId): number {
  const years = SAMPLES.find((s) => s.value === sample)!.years;
  return Number.isFinite(years) ? Math.max(0, length - Math.round(years * 365.25)) : 0;
}

export const DAYS_PER_MONTH = 30.44;
const one = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** "12 dias", "3,5 meses", "1,2 ano". */
export function formatDuration(days: number): string {
  if (days < 45) return `${Math.round(days)} ${Math.round(days) === 1 ? "dia" : "dias"}`;
  if (days < 365) return `${one.format(days / DAYS_PER_MONTH)} meses`;
  const years = days / 365.25;
  return `${one.format(years)} ${years < 2 ? "ano" : "anos"}`;
}
