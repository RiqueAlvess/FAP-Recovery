import { dentroDoPrazoPrescricional } from '../contestation/rules.js';
import type { PagamentoBeneficio } from './types.js';
import { corrigirValorPelaSelic, type ProvedorTaxaSelic } from './selic.js';

export interface ResultadoDiagnostico {
  economiaAnualProspectiva: number;
  creditoRetroativoEstimado: number;
}

/** Economia anual prospectiva: quanto a contribuição RAT cairia se o índice FAP for corrigido. */
export function calcularEconomiaAnualProspectiva(
  contribuicaoRatAtual: number,
  contribuicaoRatComFapCorrigido: number
): number {
  return Math.max(contribuicaoRatAtual - contribuicaoRatComFapCorrigido, 0);
}

/**
 * Crédito retroativo estimado: soma dos valores pagos a maior em ciclos
 * anteriores, corrigidos pela SELIC, respeitando a prescrição quinquenal.
 */
export function calcularCreditoRetroativoEstimado(
  pagamentosAMaiorPorCiclo: PagamentoBeneficio[],
  obterTaxaSelicMensal: ProvedorTaxaSelic,
  dataReferencia: Date = new Date()
): number {
  return pagamentosAMaiorPorCiclo
    .filter((p) => dentroDoPrazoPrescricional(p.data, dataReferencia))
    .reduce((soma, p) => soma + corrigirValorPelaSelic(p.valor, p.data, dataReferencia, obterTaxaSelicMensal), 0);
}

/** Todo diagnóstico gera dois números: economia anual prospectiva e crédito retroativo estimado. */
export function gerarDiagnostico(
  contribuicaoRatAtual: number,
  contribuicaoRatComFapCorrigido: number,
  pagamentosAMaiorPorCiclo: PagamentoBeneficio[],
  obterTaxaSelicMensal: ProvedorTaxaSelic,
  dataReferencia: Date = new Date()
): ResultadoDiagnostico {
  return {
    economiaAnualProspectiva: calcularEconomiaAnualProspectiva(contribuicaoRatAtual, contribuicaoRatComFapCorrigido),
    creditoRetroativoEstimado: calcularCreditoRetroativoEstimado(
      pagamentosAMaiorPorCiclo,
      obterTaxaSelicMensal,
      dataReferencia
    ),
  };
}
