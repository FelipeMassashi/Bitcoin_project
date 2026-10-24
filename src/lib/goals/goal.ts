/** Preço-alvo: Preço médio × (1 + Meta). */
export function targetPrice(averagePrice: number, goal: number): number {
  return averagePrice * (1 + goal);
}

/** Alta necessária: quanto o preço de hoje precisa subir para tocar o Preço-alvo (negativa se já passou). */
export function requiredRise(target: number, price: number): number {
  return target / price - 1;
}

/** Quanto aportar hoje para lucrar `profit` se o preço subir `rise` a partir de agora. */
export function amountForProfit(profit: number, rise: number): number {
  return profit / rise;
}

/** Posição depois de um novo Aporte comprado ao preço de hoje: novo Preço médio, Preço-alvo e Alta necessária. */
export function afterNewAporte(
  position: { btc: number; invested: number },
  aporte: { amount: number; price: number },
  goal: number,
) {
  const btc = position.btc + aporte.amount / aporte.price;
  const averagePrice = (position.invested + aporte.amount) / btc;
  const target = targetPrice(averagePrice, goal);
  return { btc, averagePrice, targetPrice: target, requiredRise: requiredRise(target, aporte.price) };
}
