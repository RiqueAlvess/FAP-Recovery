import type {
  Cliente,
  Divergencia as DivergenciaDb,
  Estabelecimento,
  RegistroExtrato as RegistroExtratoDb,
  RegistroInterno as RegistroInternoDb,
} from '@prisma/client';
import type { EspecieBeneficio } from '@/domain/divergences/types';
import { calcularTotaisIndiceAtual } from '@/domain/reconciliacao';
import type {
  CicloParaSimulacao,
  ContextoCicloFap,
  DadosEmpresaParaMinuta,
  Divergencia as DivergenciaDominio,
  RegistroExtratoPlano,
  RegistroInternoPlano,
} from '@/domain/reconciliacao';
import type { AliquotaRat } from '@/domain/fap';
import type { ImpactoIndice, SeveridadeDivergencia, StatusDivergencia } from '@/domain/enums';

export function paraRegistroExtratoPlano(registro: RegistroExtratoDb): RegistroExtratoPlano {
  return {
    id: registro.id,
    tipo: registro.tipo as RegistroExtratoPlano['tipo'],
    nit: registro.nit,
    nomeTrabalhador: registro.nomeTrabalhador,
    especieBeneficio: registro.especieBeneficio as EspecieBeneficio | null,
    dataInicio: registro.dataInicio,
    dataFim: registro.dataFim,
    valorCentavos: registro.valorCentavos,
    cid: registro.cid,
    // DIV-009 depende de comparar com os outros estabelecimentos do mesmo
    // cliente; o schema atual não captura o CNPJ de vínculo por linha do
    // extrato, então esta flag permanece sempre false nesta versão.
    cnpjVinculoDivergente: false,
  };
}

export function paraRegistroInternoPlano(registro: RegistroInternoDb): RegistroInternoPlano {
  return {
    id: registro.id,
    tipo: registro.tipo as RegistroInternoPlano['tipo'],
    nit: registro.nit,
    nomeTrabalhador: registro.nomeTrabalhador,
    matricula: registro.matricula,
    dataAdmissao: registro.dataAdmissao,
    dataDesligamento: registro.dataDesligamento,
    valorCentavos: extrairValorCentavosDeInterno(registro),
  };
}

/**
 * RegistroInterno não tem coluna valorCentavos (schema Prisma) — para linhas
 * MASSA_SALARIAL, o valor declarado internamente vive em dadosBrutosJson
 * (convenção do parser/seed: `{ valor: <reais> }`).
 */
function extrairValorCentavosDeInterno(registro: RegistroInternoDb): number | undefined {
  if (registro.tipo !== 'MASSA_SALARIAL') return undefined;
  try {
    const bruto = JSON.parse(registro.dadosBrutosJson) as { valor?: unknown };
    return typeof bruto.valor === 'number' ? Math.round(bruto.valor * 100) : undefined;
  } catch {
    return undefined;
  }
}

interface CicloFapComoContexto {
  fapAtribuido: number;
  indiceFrequencia: number;
  indiceGravidade: number;
  indiceCusto: number;
}

/** Monta o ContextoCicloFap (usado por calcularImpacto) a partir das linhas já carregadas do banco. */
export function paraContextoCicloFap(
  ciclo: CicloFapComoContexto,
  estabelecimento: Pick<Estabelecimento, 'aliquotaRat' | 'folhaMediaMensalCentavos'>,
  registrosExtratoPlano: RegistroExtratoPlano[]
): ContextoCicloFap {
  return {
    folhaAnualCentavos: estabelecimento.folhaMediaMensalCentavos * 12,
    aliquotaRat: estabelecimento.aliquotaRat as AliquotaRat,
    fapAtual: ciclo.fapAtribuido / 10_000,
    indiceFrequenciaAtual: ciclo.indiceFrequencia,
    indiceGravidadeAtual: ciclo.indiceGravidade,
    indiceCustoAtual: ciclo.indiceCusto,
    totaisAtuais: calcularTotaisIndiceAtual(registrosExtratoPlano),
  };
}

export function paraCicloParaSimulacao(
  ciclo: CicloFapComoContexto & { anoVigencia: number },
  estabelecimento: Pick<Estabelecimento, 'aliquotaRat' | 'folhaMediaMensalCentavos'>,
  registrosExtratoPlano: RegistroExtratoPlano[]
): CicloParaSimulacao {
  return {
    anoVigencia: ciclo.anoVigencia,
    ...paraContextoCicloFap(ciclo, estabelecimento, registrosExtratoPlano),
  };
}

type DivergenciaComRegistros = DivergenciaDb & {
  registroExtrato: RegistroExtratoDb;
  registroInterno: RegistroInternoDb | null;
};

/** Reidrata uma Divergencia persistida de volta ao tipo puro do domínio, para reuso em calcularImpacto/simularFap/gerarMinutaContestacao. */
export function paraDivergenciaDominio(registro: DivergenciaComRegistros): DivergenciaDominio {
  return {
    codigo: registro.codigo,
    registroExtratoId: registro.registroExtratoId,
    registroExtrato: paraRegistroExtratoPlano(registro.registroExtrato),
    registroInternoId: registro.registroInternoId,
    registroInterno: registro.registroInterno ? paraRegistroInternoPlano(registro.registroInterno) : null,
    severidade: registro.severidade as SeveridadeDivergencia,
    impactoIndice: registro.impactoIndice as ImpactoIndice,
    impactoEstimadoCentavos: registro.impactoEstimadoCentavos,
    status: registro.status as StatusDivergencia,
    justificativa: registro.justificativa ?? '',
    fundamentacaoLegal: registro.fundamentacaoLegal ?? '',
  };
}

export function paraDadosEmpresaParaMinuta(
  cliente: Pick<Cliente, 'razaoSocial'>,
  estabelecimento: Pick<Estabelecimento, 'cnpj' | 'cnaeSubclasse'>,
  anoVigencia: number
): DadosEmpresaParaMinuta {
  return {
    razaoSocial: cliente.razaoSocial,
    cnpj: estabelecimento.cnpj,
    cnaeSubclasse: estabelecimento.cnaeSubclasse,
    anoVigencia,
  };
}
