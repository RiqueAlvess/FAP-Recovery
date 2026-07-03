import {
  detectarDiv001,
  detectarDiv002,
  detectarDiv003,
  detectarDiv004,
  detectarDiv005,
  detectarDiv006,
  detectarDiv007,
  detectarDiv008,
  detectarDiv009,
  detectarDiv010,
  resolverPeriodoBase,
} from './regras.js';
import type { Divergencia, OpcoesReconciliacao, RegistroExtratoPlano, RegistroInternoPlano } from './types.js';

/**
 * Aplica as 10 regras determinísticas do catálogo DIV-001 a DIV-010 sobre os
 * registros de um ciclo. Retorna Divergencia[] com `impactoEstimadoCentavos`
 * zerado — quem consome o resultado deve chamar `calcularImpacto` por item
 * (esta função não recebe o contexto financeiro do ciclo necessário para isso).
 */
export function reconciliar(
  registrosExtrato: RegistroExtratoPlano[],
  registrosInternos: RegistroInternoPlano[],
  opcoes: OpcoesReconciliacao = {}
): Divergencia[] {
  const periodo = resolverPeriodoBase(registrosExtrato, opcoes.anoVigencia);

  return [
    ...detectarDiv001(registrosExtrato),
    ...detectarDiv002(registrosExtrato, registrosInternos),
    ...detectarDiv003(registrosExtrato),
    ...detectarDiv004(registrosExtrato, periodo),
    ...detectarDiv005(registrosExtrato, registrosInternos, periodo),
    ...detectarDiv006(registrosExtrato, registrosInternos),
    ...detectarDiv007(registrosExtrato, registrosInternos),
    ...detectarDiv008(registrosExtrato, registrosInternos, periodo),
    ...detectarDiv009(registrosExtrato),
    ...detectarDiv010(registrosExtrato),
  ];
}
