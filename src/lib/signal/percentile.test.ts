import { describe, expect, it } from "vitest";
import { expandingPercentile } from "./percentile";

describe("expandingPercentile", () => {
  it("posição de cada valor entre todos os valores até aquele dia, contando empates pela metade", () => {
    // dia 3: entre [1, 3, 2, 2] o 2 tem 1 menor e 2 iguais → (1 + 2/2) / 4 = 50
    expect(expandingPercentile([1, 3, 2, 2], 1)).toEqual([50, 75, 50, 50]);
  });

  it("só começa depois de um histórico mínimo e ignora dias sem valor", () => {
    expect(expandingPercentile([null, 5, 1, 9], 3)).toEqual([null, null, null, (2 + 0.5) / 3 * 100]);
  });

  it("não usa o futuro: mudar valores posteriores não altera os anteriores", () => {
    const a = expandingPercentile([4, 2, 8, 1, 5], 2);
    const b = expandingPercentile([4, 2, 8, 100, -100], 2);
    expect(b.slice(0, 3)).toEqual(a.slice(0, 3));
  });
});
