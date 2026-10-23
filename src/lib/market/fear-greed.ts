import { z } from "zod";

// Índice de medo e ganância da alternative.me: um valor de 0 a 100 por dia (00:00 UTC), desde 01/02/2018.
const URL = "https://api.alternative.me/fng/?limit=0";

const response = z.object({
  data: z.array(z.object({ value: z.string().regex(/^\d+$/).transform(Number), timestamp: z.string().transform(Number) })),
});

/** Mapa dia (ms UTC) → índice. */
export async function fetchFearGreed(signal?: AbortSignal): Promise<Map<number, number>> {
  const res = await fetch(URL, { signal });
  if (!res.ok) throw new Error(`alternative.me respondeu ${res.status}`);
  const { data } = response.parse(await res.json());
  return new Map(data.map((d) => [d.timestamp * 1000, d.value]));
}
