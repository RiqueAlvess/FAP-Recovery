import { FAP_MAXIMO, FAP_MINIMO, PESOS_PADRAO } from '@/domain/fap';
import { PESOS_GRAVIDADE } from '@/domain/fap/gravity';
import type { EspecieBeneficio } from '@/domain/divergences/types';
import type { ContextoCicloFap, Divergencia, RegistroExtratoPlano } from './types.js';

/**
 * === Aproximação linear documentada ===
 *
 * A metodologia oficial do FAP converte cada índice bruto (frequência,
 * gravidade, custo) em um PERCENTIL dentro da subclasse CNAE inteira antes de
 * compor o FAP. Recalcular esse percentil com exatidão exigiria os dados de
 * todas as empresas da subclasse no período-base — informação que uma
 * consultoria não tem acesso.
 *
 * Esta função aproxima o efeito de remover um único registro assumindo que,
 * numa vizinhança pequena do ranking, o percentil varia aproximadamente de
 * forma proporcional à fração do índice bruto que aquele registro representa:
 *
 *   Δpercentil_X ≈ percentilAtual_X × (valorDoRegistro_X / totalBruto_X)
 *
 * Isso é uma simplificação (o ranking real não é linear nas bordas da
 * distribuição), por isso o resultado é multiplicado por um
 * `fatorConservador` (padrão 0,6) que deliberadamente subestima o ganho —
 * preferimos uma proposta comercial conservadora a uma promessa otimista
 * demais. O fator é configurável via `ContextoCicloFap.fatorConservador`
 * para calibração futura com dados reais de recursos julgados.
 */
export const FATOR_CONSERVADOR_PADRAO = 0.6;

/** Mesmos coeficientes de src/domain/fap/gravity.ts, indexados por espécie de benefício em vez de desfecho. */
const PESO_GRAVIDADE_POR_ESPECIE: Partial<Record<EspecieBeneficio, number>> = {
  B91: PESOS_GRAVIDADE.afastamento_superior_15_dias,
  B94: PESOS_GRAVIDADE.afastamento_superior_15_dias,
  B92: PESOS_GRAVIDADE.invalidez_permanente,
  B93: PESOS_GRAVIDADE.pensao_por_morte,
  // B31 (afastamento comum) e B46 (aposentadoria especial) não têm peso de gravidade acidentária.
};

function deltaFrequencia(registro: RegistroExtratoPlano): number {
  return registro.tipo === 'CAT' ? 1 : 0;
}

function deltaGravidade(registro: RegistroExtratoPlano): number {
  if (registro.tipo !== 'BENEFICIO' || !registro.especieBeneficio) return 0;
  return PESO_GRAVIDADE_POR_ESPECIE[registro.especieBeneficio] ?? 0;
}

function deltaCusto(registro: RegistroExtratoPlano): number {
  return registro.tipo === 'BENEFICIO' ? registro.valorCentavos : 0;
}

/**
 * Núcleo compartilhado da aproximação linear: quanto o FAP cairia (unidade
 * FAP, ex.: 0,015) ao remover os dados de uma única divergência. Usado tanto
 * por `calcularImpacto` (converte para centavos) quanto por `simularFap`
 * (agrega várias divergências antes de converter uma única vez).
 */
export function calcularDeltaFapAproximado(divergencia: Divergencia, contexto: ContextoCicloFap): number {
  const pesos = contexto.pesos ?? PESOS_PADRAO;
  const fatorConservador = contexto.fatorConservador ?? FATOR_CONSERVADOR_PADRAO;
  const registro = divergencia.registroExtrato;

  const percentilDeltaFrequencia =
    contexto.totaisAtuais.frequencia > 0
      ? contexto.indiceFrequenciaAtual * (deltaFrequencia(registro) / contexto.totaisAtuais.frequencia)
      : 0;
  const percentilDeltaGravidade =
    contexto.totaisAtuais.gravidade > 0
      ? contexto.indiceGravidadeAtual * (deltaGravidade(registro) / contexto.totaisAtuais.gravidade)
      : 0;
  const percentilDeltaCusto =
    contexto.totaisAtuais.custo > 0
      ? contexto.indiceCustoAtual * (deltaCusto(registro) / contexto.totaisAtuais.custo)
      : 0;

  const percentilCompostoDelta =
    pesos.frequencia * percentilDeltaFrequencia +
    pesos.gravidade * percentilDeltaGravidade +
    pesos.custo * percentilDeltaCusto;

  return percentilCompostoDelta * (FAP_MAXIMO - FAP_MINIMO) * fatorConservador;
}

/**
 * Estima, em centavos, quanto a contribuição RAT/FAP anual cairia se esta
 * divergência específica fosse corrigida isoladamente (ver aproximação linear
 * documentada acima).
 */
export function calcularImpacto(divergencia: Divergencia, contexto: ContextoCicloFap): number {
  const deltaFap = calcularDeltaFapAproximado(divergencia, contexto);
  const economia = contexto.folhaAnualCentavos * (contexto.aliquotaRat / 100) * deltaFap;
  return Math.round(Math.max(economia, 0));
}
