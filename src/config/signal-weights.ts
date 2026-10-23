// Pesos do Sinal composto (somam 100). Mudou aqui, muda o site e o backtest.
// Os mais pesados são os que historicamente melhor separaram fundos de topos no bitcoin
// (Mayer Multiple e distância da média de 200 semanas); os osciladores de curto prazo pesam menos.
export const SIGNAL_WEIGHTS = {
  mayer: 25,
  ma200w: 20,
  drawdown: 15,
  fearGreed: 15,
  rsiDaily: 10,
  rsiWeekly: 10,
  macd: 5,
} as const;

export type IndicatorKey = keyof typeof SIGNAL_WEIGHTS;

// Zona de compra abaixo de 35, venda acima de 65, neutro entre os dois.
export const ZONE_LIMITS = { buyBelow: 35, sellAbove: 65 } as const;

// Abaixo desta fração dos pesos disponíveis (ex.: início do histórico) o sinal não é calculado.
export const MIN_WEIGHT_FRACTION = 0.5;
