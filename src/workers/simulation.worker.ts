/// <reference lib="webworker" />
import { monteCarlo, type MonteCarloInput } from "@/lib/simulation/monte-carlo";

// As 5.000 trajetórias rodam fora da thread da página, para a tela não travar.
self.onmessage = (event: MessageEvent<{ id: number; input: MonteCarloInput }>) => {
  const { id, input } = event.data;
  self.postMessage({ id, result: monteCarlo(input) });
};
