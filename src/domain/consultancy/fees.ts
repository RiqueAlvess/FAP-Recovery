/** Honorário por êxito: percentual configurável por contrato, default 25%. */
export const HONORARIO_PADRAO_PERCENTUAL = 0.25;

export function calcularHonorario(
  valorRecuperadoOuEconomizado: number,
  percentual = HONORARIO_PADRAO_PERCENTUAL
): number {
  return valorRecuperadoOuEconomizado * percentual;
}

/** Honorário projetado em centavos, a partir do percentual de êxito contratado (Int 0-100) sobre o valor apurado em centavos. */
export function calcularHonorarioProjetadoCentavos(valorApuradoCentavos: number, percentualExito: number): number {
  return Math.round(valorApuradoCentavos * (percentualExito / 100));
}
