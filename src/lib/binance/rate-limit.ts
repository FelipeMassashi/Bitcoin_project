import "server-only";

/**
 * Janela fixa por chave (o IP do Visitante), na memória da instância.
 * Em serverless cada instância tem a sua cota; serve para frear abuso, não como contagem exata.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 10_000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    take(key: string, now: number): { ok: true } | { ok: false; retryAfterMs: number } {
      let w = windows.get(key);
      if (!w || now - w.start >= windowMs) {
        if (!w && windows.size >= maxKeys) {
          for (const [k, old] of windows) if (now - old.start >= windowMs) windows.delete(k);
          // Ainda cheio: descarta a janela mais antiga.
          if (windows.size >= maxKeys) windows.delete(windows.keys().next().value!);
        }
        w = { start: now, count: 0 };
        windows.set(key, w);
      }
      if (w.count >= limit) return { ok: false, retryAfterMs: w.start + windowMs - now };
      w.count++;
      return { ok: true };
    },
    size: () => windows.size,
  };
}
