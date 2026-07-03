/** Acima deste patamar de rotatividade, a trava de bonificacao ajusta o indice de frequencia. */
export const LIMITE_ROTATIVIDADE_TRAVA_BONIFICACAO = 0.75;

export function calcularTaxaRotatividade(
  admissoes: number,
  rescisoes: number,
  numeroMedioVinculos: number
): number {
  if (numeroMedioVinculos <= 0) return 0;
  return Math.min(admissoes, rescisoes) / numeroMedioVinculos;
}

export interface AjusteRotatividade {
  indiceAjustado: number;
  travaAplicada: boolean;
}

/**
 * Rotatividade acima do limite indica possivel desligamento estrategico de
 * trabalhadores acidentados para maquiar o indice de frequencia; nesse caso o
 * indice e majorado proporcionalmente ao excesso de rotatividade.
 */
export function aplicarAjusteRotatividade(indiceFrequencia: number, taxaRotatividade: number): AjusteRotatividade {
  if (taxaRotatividade > LIMITE_ROTATIVIDADE_TRAVA_BONIFICACAO) {
    const excesso = taxaRotatividade - LIMITE_ROTATIVIDADE_TRAVA_BONIFICACAO;
    return { indiceAjustado: indiceFrequencia * (1 + excesso), travaAplicada: true };
  }
  return { indiceAjustado: indiceFrequencia, travaAplicada: false };
}
