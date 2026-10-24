"use client";

import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { useState } from "react";

/**
 * O gradiente animado em WebGL (ShaderGradient). Carregado sob demanda pelo GradientBackdrop.
 * `lightType="3d"` e `control="props"`: nada de HDR baixado de servidor de terceiros nem leitura da URL.
 * Fica montado o tempo todo (remontar cria outro contexto WebGL) e só para de animar fora da tela.
 */
export default function ShaderLayer({ colors, playing }: { colors: [string, string, string]; playing: boolean }) {
  // No celular, menos pixels: o gradiente é suave e ninguém nota a diferença.
  const [pixelDensity] = useState(() => (window.matchMedia("(max-width: 767px)").matches ? 0.8 : 1));
  return (
    <ShaderGradientCanvas pixelDensity={pixelDensity} fov={45} pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      <ShaderGradient
        control="props"
        type="plane"
        animate={playing ? "on" : "off"}
        uTime={0.2}
        uSpeed={0.08}
        uStrength={2}
        uDensity={1.3}
        uFrequency={4}
        uAmplitude={0}
        positionX={0}
        positionY={0}
        positionZ={0}
        rotationX={0}
        rotationY={0}
        rotationZ={200}
        color1={colors[0]}
        color2={colors[1]}
        color3={colors[2]}
        reflection={0.1}
        lightType="3d"
        brightness={1.2}
        grain="off"
        cAzimuthAngle={180}
        cPolarAngle={90}
        cDistance={2.2}
        cameraZoom={1.6}
        enableTransition={false}
      />
    </ShaderGradientCanvas>
  );
}
