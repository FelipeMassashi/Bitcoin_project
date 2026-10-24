import { describe, expect, it } from "vitest";
import { logReturns, monteCarlo } from "./monte-carlo";

const base = { paths: 2_000, block: 30, step: 1, seed: 42 };

describe("monteCarlo", () => {
  it("a mesma seed dá o mesmo resultado; outra seed, outro", () => {
    const returns = logReturns([100, 103, 99, 108, 104, 111, 107, 115, 112, 120]).concat(Array(40).fill(0.001));
    const run = (seed: number) => monteCarlo({ ...base, returns, horizonDays: 60, target: 1.1, checkpoints: [60], seed });
    expect(run(7)).toEqual(run(7));
    expect(run(7).bands).not.toEqual(run(8).bands);
  });

  it("com retorno constante de 1% ao dia, todas as trajetórias tocam +25% no dia 23", () => {
    const r = monteCarlo({ ...base, returns: Array(60).fill(Math.log(1.01)), horizonDays: 40, target: 1.25, checkpoints: [22, 23] });
    expect(r.hit[22]).toBe(0);
    expect(r.hit[23]).toBe(1);
    expect(r.bands[10].p10).toBeCloseTo(1.01 ** 10, 9);
    expect(r.bands[10].p90).toBeCloseTo(1.01 ** 10, 9);
  });

  it("sorteia blocos de 30 dias seguidos da amostra", () => {
    // Amostra do tamanho de um bloco: todo bloco é a amostra inteira, que dobra o preço no 1º dia.
    const returns = [Math.log(2), ...Array(29).fill(0)];
    const r = monteCarlo({ ...base, returns, horizonDays: 31, target: 10, checkpoints: [31] });
    expect(r.bands[30].p50).toBeCloseTo(2, 9);
    expect(r.bands[31].p50).toBeCloseTo(4, 9);
  });

  it("probabilidade de tocar o alvo confere com um caso feito à mão", () => {
    // Blocos começam no dia 0 (com a alta de 30%) ou no dia 1 (sem ela), com chance igual.
    const returns = [Math.log(1.3), ...Array(30).fill(0)];
    const r = monteCarlo({ ...base, paths: 5_000, returns, horizonDays: 30, target: 1.25, checkpoints: [30] });
    expect(r.hit[30]).toBeGreaterThan(0.46);
    expect(r.hit[30]).toBeLessThan(0.54);
  });

  it("guarda as faixas a cada `step` dias e no último dia", () => {
    const r = monteCarlo({ ...base, step: 7, returns: Array(40).fill(0), horizonDays: 20, target: 2, checkpoints: [] });
    expect(r.days).toEqual([0, 7, 14, 20]);
  });
});
