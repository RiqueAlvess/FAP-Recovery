import { FAP_MAXIMO, FAP_MINIMO } from '@/domain/fap';
import { calcularDeltaFapAproximado } from './impacto';
import type { CicloParaSimulacao, ContextoCicloFap, Divergencia, DetalheCicloAnterior, ResultadoSimulacaoFap } from './types';

const MAX_CICLOS_CREDITO_RETROATIVO = 5;

function clamp(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

/**
 * Estima o FAP que um ano anterior teria se as mesmas divergências já
 * corrigidas se aplicassem a ele: aplica o mesmo ΔFAP absoluto apurado no
 * ciclo atual sobre o FAP daquele ano, dentro do piso/teto regulatório.
 * Simplificação necessária: sem os registros originais daquele ciclo, não há
 * como recalcular o ΔFAP específico do ano anterior.
 */
export function estimarFapAnterior(fapAtualDoAno: number, deltaFapCicloAtual: number): number {
  return clamp(fapAtualDoAno - deltaFapCicloAtual, FAP_MINIMO, FAP_MAXIMO);
}

function paraContexto(ciclo: CicloParaSimulacao): ContextoCicloFap {
  return {
    folhaAnualCentavos: ciclo.folhaAnualCentavos,
    aliquotaRat: ciclo.aliquotaRat,
    fapAtual: ciclo.fapAtual,
    indiceFrequenciaAtual: ciclo.indiceFrequenciaAtual,
    indiceGravidadeAtual: ciclo.indiceGravidadeAtual,
    indiceCustoAtual: ciclo.indiceCustoAtual,
    totaisAtuais: ciclo.totaisAtuais,
    pesos: ciclo.pesos,
    fatorConservador: ciclo.fatorConservador,
  };
}

/**
 * Recalcula o FAP do ciclo atual assumindo que as divergências confirmadas
 * foram aceitas, e projeta:
 * - `economiaAnualCentavos` = folhaAnual × alíquota RAT × (fapAtual − fapSimulado)
 * - `creditoRetroativoCentavos` = mesma fórmula aplicada aos ciclos anteriores
 *   informados (máx. 5 anos), corrigida pela taxa SELIC acumulada de cada
 *   período (input manual — este módulo não busca SELIC de nenhuma fonte).
 *
 * O ΔFAP de cada divergência é a mesma aproximação linear de
 * `calcularImpacto` (ver comentário em impacto.ts); aqui os deltas são
 * agregados ANTES de aplicar o clamp de [0,5; 2,0], e só então a economia é
 * calculada a partir do fapSimulado já limitado — evita superestimar quando
 * muitas divergências juntas empurrariam o FAP abaixo do piso regulatório.
 */
export function simularFap(cicloAtual: CicloParaSimulacao, divergenciasConfirmadas: Divergencia[]): ResultadoSimulacaoFap {
  const contexto = paraContexto(cicloAtual);

  const deltaFapTotal = divergenciasConfirmadas.reduce(
    (soma, divergencia) => soma + calcularDeltaFapAproximado(divergencia, contexto),
    0
  );

  const fapSimulado = clamp(cicloAtual.fapAtual - deltaFapTotal, FAP_MINIMO, FAP_MAXIMO);

  const economiaAnualCentavos = Math.round(
    Math.max(cicloAtual.folhaAnualCentavos * (cicloAtual.aliquotaRat / 100) * (cicloAtual.fapAtual - fapSimulado), 0)
  );

  const ciclosAnteriores = (cicloAtual.ciclosAnteriores ?? []).slice(0, MAX_CICLOS_CREDITO_RETROATIVO);

  const detalheCiclosAnteriores: DetalheCicloAnterior[] = ciclosAnteriores.map((ciclo) => {
    const economiaCiclo = ciclo.folhaAnualCentavos * (ciclo.aliquotaRat / 100) * (ciclo.fapAtual - ciclo.fapSimulado);
    const economiaCorrigida = Math.round(Math.max(economiaCiclo, 0) * (1 + ciclo.taxaSelicAcumulada));
    return {
      anoVigencia: ciclo.anoVigencia,
      fapAtual: ciclo.fapAtual,
      fapSimulado: ciclo.fapSimulado,
      taxaSelicAcumulada: ciclo.taxaSelicAcumulada,
      valorCorrigidoCentavos: economiaCorrigida,
    };
  });

  const creditoRetroativoCentavos = detalheCiclosAnteriores.reduce((soma, d) => soma + d.valorCorrigidoCentavos, 0);

  return {
    fapSimulado: Math.round(fapSimulado * 10_000) / 10_000,
    economiaAnualCentavos,
    creditoRetroativoCentavos,
    ciclosConsiderados: ciclosAnteriores.length,
    detalheCiclosAnteriores,
  };
}
