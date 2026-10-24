import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("limite por IP", () => {
  it("deixa passar até o limite na janela e bloqueia o seguinte", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect([0, 1, 2].map((t) => limiter.take("1.1.1.1", t).ok)).toEqual([true, true, true]);
    expect(limiter.take("1.1.1.1", 10_000)).toEqual({ ok: false, retryAfterMs: 50_000 });
  });

  it("libera de novo quando a janela passa", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.take("1.1.1.1", 0);
    expect(limiter.take("1.1.1.1", 60_000).ok).toBe(true);
  });

  it("cada IP tem a própria cota", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.take("1.1.1.1", 0);
    expect(limiter.take("2.2.2.2", 0).ok).toBe(true);
  });

  it("não acumula IPs indefinidamente na memória", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    limiter.take("1.1.1.1", 0);
    limiter.take("2.2.2.2", 0);
    limiter.take("3.3.3.3", 0);
    expect(limiter.size()).toBeLessThanOrEqual(2);
  });
});
