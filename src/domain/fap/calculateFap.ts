import type { DadosEstabelecimento, DadosPeerGroup, FapResult, PeriodoBase } from './types.js';
import { percentileRank } from './percentile.js';
import { calcularIndiceFrequencia } from './frequency.js';
import { calcularIndiceGravidade } from './gravity.js';
import { calcularIndiceCusto } from './cost.js';
import { calcularTaxaRotatividade, aplicarAjusteRotatividade } from './turnover.js';
import { bloqueiaBonificacao, aplicarBloqueioBonificacao } from './bonusLock.js';

export const FAP_MINIMO = 0.5;
export const FAP_MAXIMO = 2.0;
export const FAP_NEUTRO = 1.0;

export interface PesosCompositos {
  frequencia: number;
  gravidade: number;
  custo: number;
}

export const PESOS_PADRAO: PesosCompositos = { frequencia: 1 / 3, gravidade: 1 / 3, custo: 1 / 3 };

export interface OpcoesCalculoFap {
  pesos?: PesosCompositos;
  possuiExcecaoJudicialBloqueioBonificacao?: boolean;
}

export function calcularFap(
  estabelecimento: DadosEstabelecimento,
  peerGroup: DadosPeerGroup,
  periodo: PeriodoBase,
  opcoes: OpcoesCalculoFap = {}
): FapResult {
  const pesos = opcoes.pesos ?? PESOS_PADRAO;

  const indiceFrequenciaBruto = calcularIndiceFrequencia(estabelecimento.ocorrencias);
  const taxaRotatividade = calcularTaxaRotatividade(
    estabelecimento.admissoes,
    estabelecimento.rescisoes,
    estabelecimento.numeroMedioVinculos
  );
  const { indiceAjustado: indiceFrequencia, travaAplicada } = aplicarAjusteRotatividade(
    indiceFrequenciaBruto,
    taxaRotatividade
  );

  const indiceGravidade = calcularIndiceGravidade(estabelecimento.ocorrencias);
  const indiceCusto = calcularIndiceCusto(estabelecimento.ocorrencias);

  const percentilFrequencia = percentileRank(indiceFrequencia, peerGroup.frequencias);
  const percentilGravidade = percentileRank(indiceGravidade, peerGroup.gravidades);
  const percentilCusto = percentileRank(indiceCusto, peerGroup.custos);

  const percentilComposto =
    pesos.frequencia * percentilFrequencia + pesos.gravidade * percentilGravidade + pesos.custo * percentilCusto;

  const fapBruto = FAP_MINIMO + percentilComposto * (FAP_MAXIMO - FAP_MINIMO);

  const { bloqueado, motivos } = bloqueiaBonificacao(estabelecimento.ocorrencias, {
    possuiExcecaoJudicial: opcoes.possuiExcecaoJudicialBloqueioBonificacao,
  });
  const fapFinal = clamp(aplicarBloqueioBonificacao(fapBruto, bloqueado), FAP_MINIMO, FAP_MAXIMO);

  return {
    cnpj: estabelecimento.cnpj,
    periodo,
    indiceFrequencia,
    indiceGravidade,
    indiceCusto,
    percentilFrequencia,
    percentilGravidade,
    percentilCusto,
    fapBruto: roundTo4(fapBruto),
    fapFinal: roundTo4(fapFinal),
    travaRotatividadeAplicada: travaAplicada,
    bloqueioBonificacaoAplicado: bloqueado,
    motivosBloqueio: motivos,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function roundTo4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
