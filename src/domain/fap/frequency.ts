import type { Ocorrencia } from './types.js';

/**
 * Indice de frequencia: numero de acidentes registrados (CAT) somado aos
 * beneficios acidentarios reconhecidos por nexo tecnico epidemiologico (NTEP) sem CAT.
 */
export function calcularIndiceFrequencia(ocorrencias: Pick<Ocorrencia, 'tipo'>[]): number {
  return ocorrencias.filter((o) => o.tipo === 'CAT' || o.tipo === 'NTEP').length;
}
