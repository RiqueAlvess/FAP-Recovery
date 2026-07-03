import type { DesfechoGravidade } from './types.js';

export interface OpcoesBloqueioBonificacao {
  /** Ex.: nexo afastado por pericia/decisao judicial, isentando o empregador. */
  possuiExcecaoJudicial?: boolean;
}

export interface ResultadoBloqueioBonificacao {
  bloqueado: boolean;
  motivos: string[];
}

/**
 * Morte, invalidez permanente ou pensao por morte no periodo-base impedem
 * bonificacao (FAP < 1,0), salvo excecao comprovada (ex.: nexo afastado
 * judicialmente ou por pericia tecnica).
 */
export function bloqueiaBonificacao(
  ocorrencias: { desfecho: DesfechoGravidade }[],
  opcoes: OpcoesBloqueioBonificacao = {}
): ResultadoBloqueioBonificacao {
  if (opcoes.possuiExcecaoJudicial) {
    return { bloqueado: false, motivos: [] };
  }

  const motivos: string[] = [];
  if (ocorrencias.some((o) => o.desfecho === 'morte')) motivos.push('Óbito acidentário no período-base');
  if (ocorrencias.some((o) => o.desfecho === 'invalidez_permanente')) {
    motivos.push('Invalidez permanente no período-base');
  }
  if (ocorrencias.some((o) => o.desfecho === 'pensao_por_morte')) {
    motivos.push('Pensão por morte no período-base');
  }

  return { bloqueado: motivos.length > 0, motivos };
}

export function aplicarBloqueioBonificacao(fapBruto: number, bloqueado: boolean): number {
  return bloqueado ? Math.max(fapBruto, 1.0) : fapBruto;
}
