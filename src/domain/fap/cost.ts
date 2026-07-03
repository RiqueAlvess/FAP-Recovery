import type { Ocorrencia } from './types';

const TIPOS_COMPUTAVEIS_NO_CUSTO = new Set(['B91', 'B92', 'B93', 'B94']);

/**
 * Indice de custo: valor dos beneficios acidentarios pagos pelo INSS e
 * atribuidos ao estabelecimento (auxilio-doenca, aposentadoria por invalidez,
 * pensao por morte e auxilio-acidente acidentarios).
 */
export function calcularIndiceCusto(ocorrencias: Pick<Ocorrencia, 'tipo' | 'valorBeneficioPago'>[]): number {
  return ocorrencias
    .filter((o) => TIPOS_COMPUTAVEIS_NO_CUSTO.has(o.tipo))
    .reduce((soma, o) => soma + o.valorBeneficioPago, 0);
}
