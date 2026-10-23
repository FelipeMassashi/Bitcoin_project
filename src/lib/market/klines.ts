import { z } from "zod";

/** Um candle já numérico. `time` é a abertura do período, em ms UTC. */
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const decimal = z.string().regex(/^\d+(\.\d+)?$/).transform(Number);

const klineRow = z
  .tuple([z.number().int(), decimal, decimal, decimal, decimal, decimal])
  .rest(z.unknown())
  .transform(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));

const klinesResponse = z.array(klineRow);

export function parseKlines(json: unknown): Candle[] {
  return klinesResponse.parse(json);
}
