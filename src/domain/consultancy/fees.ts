/** Honorário por êxito: percentual configurável por contrato, default 25%. */
export const HONORARIO_PADRAO_PERCENTUAL = 0.25;

export function calcularHonorario(
  valorRecuperadoOuEconomizado: number,
  percentual = HONORARIO_PADRAO_PERCENTUAL
): number {
  return valorRecuperadoOuEconomizado * percentual;
}
