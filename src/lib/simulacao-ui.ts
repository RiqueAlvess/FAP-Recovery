import { estimarFapAnterior, simularFap } from '@/domain/reconciliacao';
import type { CicloParaSimulacao, Divergencia, ResultadoSimulacaoFap } from '@/domain/reconciliacao';

export interface AnoAnteriorBase {
  anoVigencia: number;
  fapAtual: number;
  /** false quando não existe CicloFap real para o ano — fapAtual foi assumido igual ao ciclo atual. */
  origemReal: boolean;
}

export interface ParametrosSimulacaoUI {
  cicloBase: Omit<CicloParaSimulacao, 'ciclosAnteriores'>;
  divergenciasConfirmadas: Divergencia[];
  /** Quais divergências (por índice, alinhado a divergenciasConfirmadas) entram na simulação. */
  incluidas: boolean[];
  anosAnteriores: AnoAnteriorBase[];
  selicPorAno: Record<number, number>;
}

/**
 * Orquestra a simulação "ao vivo" da tela do simulador: primeiro roda
 * `simularFap` só com o ciclo atual para obter o ΔFAP, usa esse delta para
 * estimar o FAP dos anos anteriores (`estimarFapAnterior`), e roda
 * `simularFap` de novo já com o histórico completo para obter o resultado
 * final (incluindo o detalhamento por ano). Usado tanto pela prévia no
 * navegador quanto pela geração do PDF no servidor — mesma função pura nos
 * dois lados, sem duplicar a conta.
 */
export function calcularSimulacaoCompleta(params: ParametrosSimulacaoUI): ResultadoSimulacaoFap {
  const divergenciasIncluidas = params.divergenciasConfirmadas.filter((_, i) => params.incluidas[i] ?? true);

  const resultadoSemHistorico = simularFap(params.cicloBase, divergenciasIncluidas);
  const deltaFap = params.cicloBase.fapAtual - resultadoSemHistorico.fapSimulado;

  const ciclosAnteriores = params.anosAnteriores.map((ano) => ({
    anoVigencia: ano.anoVigencia,
    folhaAnualCentavos: params.cicloBase.folhaAnualCentavos,
    aliquotaRat: params.cicloBase.aliquotaRat,
    fapAtual: ano.fapAtual,
    fapSimulado: estimarFapAnterior(ano.fapAtual, deltaFap),
    taxaSelicAcumulada: params.selicPorAno[ano.anoVigencia] ?? 0,
  }));

  return simularFap({ ...params.cicloBase, ciclosAnteriores }, divergenciasIncluidas);
}
