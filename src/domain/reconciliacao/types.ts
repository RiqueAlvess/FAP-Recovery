import type { AliquotaRat, PesosCompositos } from '@/domain/fap';
import type { EspecieBeneficio } from '@/domain/divergences/types';
import type { ImpactoIndice, SeveridadeDivergencia, StatusDivergencia, TipoRegistro } from '@/domain/enums';

/**
 * Formatos de entrada das funções puras deste módulo — espelham as colunas
 * dos models Prisma `RegistroExtrato`/`RegistroInterno` (ver prisma/schema.prisma),
 * mas são tipos TypeScript comuns: nenhum destes arquivos importa `@prisma/client`
 * ou qualquer coisa de `/src/app` ou `/src/components`. Quem persiste os
 * resultados (uma Server Action) é responsável por mapear de/para o Prisma.
 *
 * Dois campos abaixo não existem como coluna no schema porque dependem de
 * contexto que só o chamador tem (outras tabelas, outros estabelecimentos):
 * - `RegistroInternoPlano.valorCentavos`: para registros tipo MASSA_SALARIAL,
 *   o valor declarado internamente vive em `dadosBrutosJson` no banco; quem
 *   monta este objeto deve extraí-lo antes de chamar `reconciliar`.
 * - `RegistroExtratoPlano.cnpjVinculoDivergente`: a DIV-009 exige comparar
 *   com os OUTROS estabelecimentos do mesmo cliente, o que está fora do
 *   escopo de `reconciliar` (que recebe apenas os registros de um ciclo).
 *   Quem tem acesso ao banco deve pré-calcular essa flag.
 */
export interface RegistroExtratoPlano {
  id: string;
  tipo: TipoRegistro;
  nit: string | null;
  nomeTrabalhador: string | null;
  especieBeneficio: EspecieBeneficio | null;
  /** Para tipo VINCULO, representa a data de admissão (convenção deste módulo). */
  dataInicio: Date | null;
  /** Para tipo VINCULO, representa a data de desligamento (convenção deste módulo). */
  dataFim: Date | null;
  valorCentavos: number;
  cid: string | null;
  /** Ver nota acima — calculado pelo chamador a partir de outros estabelecimentos do cliente. */
  cnpjVinculoDivergente?: boolean;
}

export interface RegistroInternoPlano {
  id: string;
  tipo: TipoRegistro;
  nit: string | null;
  nomeTrabalhador: string | null;
  matricula: string | null;
  dataAdmissao: Date | null;
  dataDesligamento: Date | null;
  /** Ver nota acima — extraído pelo chamador de `dadosBrutosJson` para linhas MASSA_SALARIAL. */
  valorCentavos?: number;
}

/** Espelha o model Prisma `Divergencia`, sem os campos gerenciados pelo banco (id, cicloFapId, timestamps). */
export interface Divergencia {
  codigo: string;
  registroExtratoId: string;
  /** Denormalizado para que calcularImpacto/gerarMinutaContestacao não precisem de um lookup externo. */
  registroExtrato: RegistroExtratoPlano;
  registroInternoId: string | null;
  registroInterno: RegistroInternoPlano | null;
  severidade: SeveridadeDivergencia;
  impactoIndice: ImpactoIndice;
  impactoEstimadoCentavos: number;
  status: StatusDivergencia;
  justificativa: string;
  fundamentacaoLegal: string;
}

export interface OpcoesReconciliacao {
  /**
   * Ano de vigência do ciclo (ex.: 2025). Quando informado, o período-base é
   * calculado pela regra oficial (dois anos-calendário anteriores ao ano de
   * vigência). Quando omitido, o período-base é inferido a partir das
   * próprias datas presentes no extrato (ver `inferirPeriodoBase`).
   */
  anoVigencia?: number;
}

export interface TotaisIndiceAtual {
  /** Soma bruta atual do índice de frequência (ex.: nº de CATs computados). */
  frequencia: number;
  /** Soma bruta atual do índice de gravidade (soma dos pesos por desfecho). */
  gravidade: number;
  /** Soma bruta atual do índice de custo, em centavos. */
  custo: number;
}

/** Contexto necessário para converter uma divergência em impacto financeiro estimado. */
export interface ContextoCicloFap {
  folhaAnualCentavos: number;
  aliquotaRat: AliquotaRat;
  fapAtual: number;
  indiceFrequenciaAtual: number;
  indiceGravidadeAtual: number;
  indiceCustoAtual: number;
  totaisAtuais: TotaisIndiceAtual;
  pesos?: PesosCompositos;
  /**
   * Atenua a estimativa linear (0 a 1). Padrão conservador de 0,6: assume que
   * apenas 60% da variação de percentil "ingênua" (proporcional à fração do
   * índice bruto removida) de fato se realiza no ranking real da subclasse,
   * já que a distribuição da subclasse inteira não está disponível.
   */
  fatorConservador?: number;
}

export interface CicloAnteriorParaCredito {
  anoVigencia: number;
  folhaAnualCentavos: number;
  aliquotaRat: AliquotaRat;
  fapAtual: number;
  /** FAP que teria sido apurado caso as mesmas divergências já corrigidas se aplicassem a este ciclo anterior. */
  fapSimulado: number;
  /** Taxa SELIC acumulada da competência até a data de referência (input manual, ex.: 0.32 = 32%). */
  taxaSelicAcumulada: number;
}

export interface CicloParaSimulacao {
  anoVigencia: number;
  folhaAnualCentavos: number;
  aliquotaRat: AliquotaRat;
  fapAtual: number;
  indiceFrequenciaAtual: number;
  indiceGravidadeAtual: number;
  indiceCustoAtual: number;
  totaisAtuais: TotaisIndiceAtual;
  pesos?: PesosCompositos;
  fatorConservador?: number;
  /** Ciclos anteriores para o cálculo do crédito retroativo — apenas os 5 mais recentes são considerados. */
  ciclosAnteriores?: CicloAnteriorParaCredito[];
}

export interface DetalheCicloAnterior {
  anoVigencia: number;
  fapAtual: number;
  fapSimulado: number;
  taxaSelicAcumulada: number;
  /** economiaAnual daquele ciclo já corrigida pela SELIC acumulada informada. */
  valorCorrigidoCentavos: number;
}

export interface ResultadoSimulacaoFap {
  fapSimulado: number;
  economiaAnualCentavos: number;
  creditoRetroativoCentavos: number;
  /** Quantos ciclos anteriores efetivamente entraram no cálculo do crédito retroativo (máx. 5). */
  ciclosConsiderados: number;
  /** Detalhamento por ano-base do crédito retroativo — mesma ordem de `CicloParaSimulacao.ciclosAnteriores`. */
  detalheCiclosAnteriores: DetalheCicloAnterior[];
}

export interface DadosEmpresaParaMinuta {
  razaoSocial: string;
  cnpj: string;
  cnaeSubclasse: string;
  anoVigencia: number;
}
