"use client";

import { useEffect, useRef, useState } from "react";
import type { MonteCarloInput, MonteCarloResult } from "./monte-carlo";

type State =
  | { status: "idle" }
  /** `result` é o cálculo anterior, mantido na tela enquanto o novo roda. */
  | { status: "running"; result?: MonteCarloResult }
  | { status: "done"; result: MonteCarloResult }
  | { status: "error" };

/** Roda o Monte Carlo num Web Worker; um novo `input` descarta o cálculo anterior. */
export function useMonteCarlo(input: MonteCarloInput | null): State {
  const worker = useRef<Worker | null>(null);
  const counter = useRef(0);
  const failed = useRef(false);
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    const w = new Worker(new URL("../../workers/simulation.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    w.onmessage = (event: MessageEvent<{ id: number; result: MonteCarloResult }>) => {
      if (event.data.id === counter.current) setState({ status: "done", result: event.data.result });
    };
    const fail = () => {
      failed.current = true;
      setState({ status: "error" });
    };
    w.onerror = fail;
    w.onmessageerror = fail;
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!input || !worker.current || failed.current) return;
    const id = ++counter.current;
    worker.current.postMessage({ id, input });
    // O resultado chega pelo onmessage; marcar "calculando" aqui evita mostrar o leque antigo.
    queueMicrotask(() => {
      if (id !== counter.current || failed.current) return;
      setState((prev) => ({ status: "running", result: "result" in prev ? prev.result : undefined }));
    });
  }, [input]);

  return state;
}
