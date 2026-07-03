import type { AliquotaRat } from './types.js';

/** Contribuição RAT ajustada = Folha x Alíquota RAT x FAP. */
export function calcularContribuicaoRatAjustada(folha: number, aliquotaRat: AliquotaRat, fap: number): number {
  return folha * (aliquotaRat / 100) * fap;
}
