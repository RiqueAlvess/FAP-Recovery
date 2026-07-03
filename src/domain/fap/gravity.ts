import type { DesfechoGravidade, Ocorrencia } from './types.js';

/**
 * Pesos do indice de gravidade. Morte e invalidez permanente pesam mais que
 * afastamento simples, conforme a metodologia do FAP (Decreto 3.048/1999, Anexo V).
 * Valores default configuraveis: ajustar caso a tabela oficial vigente publique
 * coeficientes distintos.
 */
export const PESOS_GRAVIDADE: Record<DesfechoGravidade, number> = {
  sem_afastamento_relevante: 0,
  afastamento_superior_15_dias: 0.5,
  invalidez_permanente: 0.7,
  pensao_por_morte: 1,
  morte: 1,
};

export function calcularIndiceGravidade(ocorrencias: Pick<Ocorrencia, 'desfecho'>[]): number {
  return ocorrencias.reduce((soma, o) => soma + PESOS_GRAVIDADE[o.desfecho], 0);
}
