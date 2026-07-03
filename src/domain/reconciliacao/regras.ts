import { buscarDivergenciaPorCodigo } from '@/domain/catalogo-divergencias';
import type { ImpactoIndice, SeveridadeDivergencia } from '@/domain/enums';
import { formatarData } from './formatacao';
import { chaveTrabalhador, encontrarVinculoInterno } from './matching';
import type { Divergencia, RegistroExtratoPlano, RegistroInternoPlano } from './types';

export interface PeriodoBase {
  inicio: Date;
  fim: Date;
}

/**
 * Resolve o período-base de apuração. Quando `anoVigencia` é informado, usa a
 * regra oficial: os dois anos-calendário imediatamente anteriores ao ano de
 * vigência (ex.: vigência 2025 => período-base 01/01/2023 a 31/12/2024). Sem
 * essa informação, infere uma janela de 2 anos terminando na data mais
 * recente encontrada no próprio extrato — uma aproximação necessária, já que
 * `reconciliar` não recebe o ano de vigência como parâmetro obrigatório.
 */
export function resolverPeriodoBase(extrato: RegistroExtratoPlano[], anoVigencia?: number): PeriodoBase | null {
  if (anoVigencia) {
    return {
      inicio: new Date(Date.UTC(anoVigencia - 2, 0, 1)),
      fim: new Date(Date.UTC(anoVigencia - 1, 11, 31)),
    };
  }
  return inferirPeriodoBase(extrato);
}

function inferirPeriodoBase(extrato: RegistroExtratoPlano[]): PeriodoBase | null {
  const datas = extrato.map((r) => r.dataInicio).filter((d): d is Date => d !== null);
  if (datas.length === 0) return null;

  const fim = new Date(Math.max(...datas.map((d) => d.getTime())));
  const inicio = new Date(fim);
  inicio.setUTCFullYear(inicio.getUTCFullYear() - 2);
  return { inicio, fim };
}

function criarDivergencia(
  codigo: string,
  registroExtrato: RegistroExtratoPlano,
  registroInterno: RegistroInternoPlano | null,
  impactoIndicePadrao: ImpactoIndice,
  severidade: SeveridadeDivergencia,
  justificativa: string
): Divergencia {
  const catalogo = buscarDivergenciaPorCodigo(codigo);
  return {
    codigo,
    registroExtratoId: registroExtrato.id,
    registroExtrato,
    registroInternoId: registroInterno?.id ?? null,
    registroInterno,
    severidade,
    impactoIndice: catalogo?.impactoIndice ?? impactoIndicePadrao,
    impactoEstimadoCentavos: 0,
    status: 'DETECTADA',
    justificativa,
    fundamentacaoLegal: catalogo?.fundamentacaoLegal ?? '',
  };
}

/** DIV-001: mesmo trabalhador (NIT ou nome) + mesma data de acidente aparecendo mais de uma vez entre as CATs. */
export function detectarDiv001(extrato: RegistroExtratoPlano[]): Divergencia[] {
  const vistos = new Map<string, RegistroExtratoPlano>();
  const encontradas: Divergencia[] = [];

  for (const registro of extrato) {
    if (registro.tipo !== 'CAT' || !registro.dataInicio) continue;
    const identificador = chaveTrabalhador(registro.nit, registro.nomeTrabalhador);
    if (!identificador) continue;

    const chave = `${identificador}|${registro.dataInicio.toISOString().slice(0, 10)}`;
    const anterior = vistos.get(chave);
    if (anterior) {
      encontradas.push(
        criarDivergencia(
          'DIV-001',
          registro,
          null,
          'FREQUENCIA',
          'ALTA',
          `CAT duplicada: mesmo trabalhador e mesma data (${formatarData(registro.dataInicio)}) já registrados na CAT ${anterior.id}.`
        )
      );
    } else {
      vistos.set(chave, registro);
    }
  }

  return encontradas;
}

/** DIV-002: benefício cujo NIT/nome não corresponde a nenhum vínculo interno conhecido. */
export function detectarDiv002(extrato: RegistroExtratoPlano[], interno: RegistroInternoPlano[]): Divergencia[] {
  return extrato
    .filter((r) => r.tipo === 'BENEFICIO')
    .filter((r) => !encontrarVinculoInterno(r, interno))
    .map((r) =>
      criarDivergencia(
        'DIV-002',
        r,
        null,
        'MULTIPLO',
        'ALTA',
        `Identificação ${r.nit ?? r.nomeTrabalhador ?? '(sem NIT/nome)'} não consta nos registros internos de vínculo do período.`
      )
    );
}

/**
 * DIV-003: NTEP questionável — benefício acidentário (B91/B92) cujo CID
 * pertence ao capítulo F (transtornos mentais e comportamentais), classe
 * classicamente associada a presunção de nexo tecnicamente frágil para
 * atividades predominantemente físicas. É um proxy heurístico: a
 * confirmação definitiva depende de PPP/laudo técnico (ver catálogo).
 */
const PREFIXOS_CID_NTEP_QUESTIONAVEL = ['F'];

export function detectarDiv003(extrato: RegistroExtratoPlano[]): Divergencia[] {
  return extrato
    .filter((r) => r.tipo === 'BENEFICIO' && (r.especieBeneficio === 'B91' || r.especieBeneficio === 'B92'))
    .filter((r) => r.cid && PREFIXOS_CID_NTEP_QUESTIONAVEL.some((p) => r.cid!.toUpperCase().startsWith(p)))
    .map((r) =>
      criarDivergencia(
        'DIV-003',
        r,
        null,
        'MULTIPLO',
        'MEDIA',
        `Benefício ${r.especieBeneficio} com CID ${r.cid} de baixa plausibilidade de nexo técnico com o CNAE (NTEP presumido, sujeito a revisão pericial).`
      )
    );
}

/** DIV-004: CAT/benefício com data fora do período-base (oficial ou inferido). */
export function detectarDiv004(extrato: RegistroExtratoPlano[], periodo: PeriodoBase | null): Divergencia[] {
  if (!periodo) return [];

  return extrato
    .filter((r) => (r.tipo === 'CAT' || r.tipo === 'BENEFICIO') && r.dataInicio)
    .filter((r) => r.dataInicio! < periodo.inicio || r.dataInicio! > periodo.fim)
    .map((r) =>
      criarDivergencia(
        'DIV-004',
        r,
        null,
        'MULTIPLO',
        'ALTA',
        `Data do registro (${formatarData(r.dataInicio!)}) fora do período-base (${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}).`
      )
    );
}

/** DIV-005: aposentadoria especial (B46) vinculada a trabalhador já desligado antes do período-base. */
export function detectarDiv005(
  extrato: RegistroExtratoPlano[],
  interno: RegistroInternoPlano[],
  periodo: PeriodoBase | null
): Divergencia[] {
  if (!periodo) return [];

  const encontradas: Divergencia[] = [];
  for (const registro of extrato) {
    if (registro.tipo !== 'BENEFICIO' || registro.especieBeneficio !== 'B46') continue;
    const vinculo = encontrarVinculoInterno(registro, interno);
    if (!vinculo?.dataDesligamento) continue;
    if (vinculo.dataDesligamento >= periodo.inicio) continue;

    encontradas.push(
      criarDivergencia(
        'DIV-005',
        registro,
        vinculo,
        'CUSTO',
        'MEDIA',
        `Trabalhador desligado em ${formatarData(vinculo.dataDesligamento)}, antes do início do período-base (${formatarData(periodo.inicio)}).`
      )
    );
  }
  return encontradas;
}

/**
 * DIV-006: massa salarial declarada no extrato diverge da folha interna
 * (tolerância de 1%). O valor interno vem de `RegistroInternoPlano.valorCentavos`
 * na linha tipo MASSA_SALARIAL (ver nota em types.ts sobre `dadosBrutosJson`).
 */
export function detectarDiv006(extrato: RegistroExtratoPlano[], interno: RegistroInternoPlano[]): Divergencia[] {
  const massaExtrato = extrato.find((r) => r.tipo === 'MASSA_SALARIAL');
  const massaInterna = interno.find((r) => r.tipo === 'MASSA_SALARIAL');
  if (!massaExtrato || !massaInterna || massaInterna.valorCentavos === undefined) return [];

  const diferenca = Math.abs(massaExtrato.valorCentavos - massaInterna.valorCentavos);
  const tolerancia = massaInterna.valorCentavos * 0.01;
  if (diferenca <= tolerancia) return [];

  return [
    criarDivergencia(
      'DIV-006',
      massaExtrato,
      null,
      'MULTIPLO',
      'MEDIA',
      `Massa salarial do extrato diverge da folha interna em mais de 1% (extrato: ${massaExtrato.valorCentavos} centavos; interno: ${massaInterna.valorCentavos} centavos).`
    ),
  ];
}

/** DIV-007: número de vínculos considerados no extrato diverge do registrado internamente. */
export function detectarDiv007(extrato: RegistroExtratoPlano[], interno: RegistroInternoPlano[]): Divergencia[] {
  const contagemExtrato = extrato.filter((r) => r.tipo === 'VINCULO').length;
  const contagemInterna = interno.filter((r) => r.tipo === 'VINCULO').length;
  if (contagemExtrato === 0 || contagemExtrato === contagemInterna) return [];

  const referencia = extrato.find((r) => r.tipo === 'VINCULO');
  if (!referencia) return [];

  return [
    criarDivergencia(
      'DIV-007',
      referencia,
      null,
      'FREQUENCIA',
      'MEDIA',
      `Número de vínculos considerados no extrato (${contagemExtrato}) diverge dos registros internos (${contagemInterna}).`
    ),
  ];
}

/**
 * DIV-008: admissões/rescisões usadas para a rotatividade divergem dos
 * registros internos. Convenção: em linhas tipo VINCULO, `dataInicio`/`dataFim`
 * do extrato representam admissão/desligamento, espelhando `dataAdmissao`/
 * `dataDesligamento` do lado interno.
 */
export function detectarDiv008(
  extrato: RegistroExtratoPlano[],
  interno: RegistroInternoPlano[],
  periodo: PeriodoBase | null
): Divergencia[] {
  if (!periodo) return [];

  const dentroDoPeriodo = (data: Date | null) => data !== null && data >= periodo.inicio && data <= periodo.fim;

  const admissoesExtrato = extrato.filter((r) => r.tipo === 'VINCULO' && dentroDoPeriodo(r.dataInicio)).length;
  const rescisoesExtrato = extrato.filter((r) => r.tipo === 'VINCULO' && dentroDoPeriodo(r.dataFim)).length;
  const admissoesInterno = interno.filter((r) => r.tipo === 'VINCULO' && dentroDoPeriodo(r.dataAdmissao)).length;
  const rescisoesInterno = interno.filter((r) => r.tipo === 'VINCULO' && dentroDoPeriodo(r.dataDesligamento)).length;

  if (admissoesExtrato === admissoesInterno && rescisoesExtrato === rescisoesInterno) return [];

  const referencia = extrato.find((r) => r.tipo === 'VINCULO') ?? extrato[0];
  if (!referencia) return [];

  return [
    criarDivergencia(
      'DIV-008',
      referencia,
      null,
      'FREQUENCIA',
      'MEDIA',
      `Admissões/rescisões do extrato (${admissoesExtrato}/${rescisoesExtrato}) divergem dos registros internos (${admissoesInterno}/${rescisoesInterno}) no período-base.`
    ),
  ];
}

/**
 * DIV-009: benefício atribuído a CNPJ diverso do estabelecimento avaliado.
 * Depende de `cnpjVinculoDivergente`, pré-calculado pelo chamador ao cruzar
 * com os demais estabelecimentos do mesmo cliente (fora do escopo desta função pura).
 */
export function detectarDiv009(extrato: RegistroExtratoPlano[]): Divergencia[] {
  return extrato
    .filter((r) => r.tipo === 'BENEFICIO' && r.cnpjVinculoDivergente === true)
    .map((r) =>
      criarDivergencia(
        'DIV-009',
        r,
        null,
        'MULTIPLO',
        'ALTA',
        'Benefício vinculado a CNPJ diferente do estabelecimento avaliado, ainda que do mesmo grupo econômico.'
      )
    );
}

/** DIV-010: pensão por morte (B93) sem CAT correspondente, sugerindo óbito sem nexo acidentário comprovado. */
export function detectarDiv010(extrato: RegistroExtratoPlano[]): Divergencia[] {
  const chavesComCat = new Set(
    extrato
      .filter((r) => r.tipo === 'CAT')
      .map((r) => chaveTrabalhador(r.nit, r.nomeTrabalhador))
      .filter((c): c is string => c !== null)
  );

  return extrato
    .filter((r) => r.tipo === 'BENEFICIO' && r.especieBeneficio === 'B93')
    .filter((r) => {
      const chave = chaveTrabalhador(r.nit, r.nomeTrabalhador);
      return !chave || !chavesComCat.has(chave);
    })
    .map((r) =>
      criarDivergencia(
        'DIV-010',
        r,
        null,
        'MULTIPLO',
        'BAIXA',
        'Pensão por morte (B93) sem CAT correspondente registrada, sugerindo óbito sem nexo acidentário comprovado.'
      )
    );
}
