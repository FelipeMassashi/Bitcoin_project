import { describe, expect, it } from "vitest";
import { daysToRise, timeToTargetStats } from "./time-to-target";

describe("daysToRise", () => {
  // dia:     0    1    2    3    4    5    6
  const closes = [100, 90, 110, 130, 80, 95, 101];

  it("conta os dias até o primeiro fechamento que toca a alta pedida, dentro do prazo", () => {
    // Prazo de 3 dias; o último dia é o 6, então só os dias 0 a 3 têm o prazo inteiro.
    // Dia 0: 100 → 120, toca no dia 3. Dia 1: 90 → 108, dia 2. Dias 2 e 3: não tocam no prazo.
    expect(daysToRise(closes, 0.2, 3)).toEqual([3, 1, null, null, undefined, undefined, undefined]);
  });

  it("dias sem o prazo inteiro ficam de fora mesmo quando tocaram (senão sobrariam só os sucessos)", () => {
    // Dia 4: 80 → 96 toca no dia 6, mas o prazo de 3 dias não cabe na série.
    expect(daysToRise(closes, 0.2, 3)[4]).toBeUndefined();
  });
});

describe("timeToTargetStats", () => {
  it("percentis tratam 'não chegou no prazo' como o caso mais lento", () => {
    const days = [10, 20, 30, 40, null, null, null, null, undefined];
    const s = timeToTargetStats(days, 365);
    expect(s.samples).toBe(8);
    expect(s.p25).toBe(20);
    expect(s.p50).toBe(40);
    expect(s.p80).toBeNull();
    expect(s.neverWithin).toBeCloseTo(0.5, 12);
  });

  it("filtra os dias pedidos", () => {
    const days = [10, 20, 30, 40];
    const s = timeToTargetStats(days, 365, (i) => i >= 2);
    expect(s.samples).toBe(2);
    expect(s.p50).toBe(30);
  });

  it("conta como 'não chegou' quem chegou só depois do prazo do resumo", () => {
    const s = timeToTargetStats([100, 400, 500, 50], 365);
    expect(s.neverWithin).toBeCloseTo(0.5, 12);
  });
});
