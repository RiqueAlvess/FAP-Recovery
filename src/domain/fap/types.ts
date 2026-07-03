export type AliquotaRat = 1 | 2 | 3;

export interface CnaeSubclasse {
  codigo: string;
  aliquotaRat: AliquotaRat;
}

export type TipoOcorrencia = 'CAT' | 'NTEP' | 'B91' | 'B92' | 'B93' | 'B94' | 'B31' | 'B46';

export type DesfechoGravidade =
  | 'sem_afastamento_relevante'
  | 'afastamento_superior_15_dias'
  | 'invalidez_permanente'
  | 'pensao_por_morte'
  | 'morte';

export interface Ocorrencia {
  id: string;
  matricula: string;
  nit: string;
  tipo: TipoOcorrencia;
  desfecho: DesfechoGravidade;
  valorBeneficioPago: number;
}

export interface PeriodoBase {
  inicio: Date;
  fim: Date;
}

export interface DadosEstabelecimento {
  cnpj: string;
  cnaeSubclasse: CnaeSubclasse;
  numeroMedioVinculos: number;
  admissoes: number;
  rescisoes: number;
  ocorrencias: Ocorrencia[];
}

export interface DadosPeerGroup {
  cnaeSubclasse: string;
  frequencias: number[];
  gravidades: number[];
  custos: number[];
}

export interface FapResult {
  cnpj: string;
  periodo: PeriodoBase;
  indiceFrequencia: number;
  indiceGravidade: number;
  indiceCusto: number;
  percentilFrequencia: number;
  percentilGravidade: number;
  percentilCusto: number;
  fapBruto: number;
  fapFinal: number;
  travaRotatividadeAplicada: boolean;
  bloqueioBonificacaoAplicado: boolean;
  motivosBloqueio: string[];
}
