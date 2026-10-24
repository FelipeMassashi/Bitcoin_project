"use client";

// Cult UI · rolling-number (https://www.cult-ui.com/docs/components/rolling-number).
// Ajustes locais: com prefers-reduced-motion o número troca na hora, sem rolar; o leitor de tela
// lê só o valor final, não os intermediários da animação.
import { useEffect } from "react";
import { motion, type MotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

interface RollingNumberProps {
  value: number;
  precision?: number;
  format: (value: number) => string;
}

export function RollingNumber({
  value,
  precision = 0,
  format,
}: RollingNumberProps) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display: MotionValue<string> = useTransform(spring, (current) => format(parseFloat(current.toFixed(precision))));

  useEffect(() => {
    if (reduceMotion) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reduceMotion]);

  return (
    <>
      <motion.span aria-hidden="true">{display}</motion.span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
