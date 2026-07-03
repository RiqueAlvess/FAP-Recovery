export type ImpactoIndice = 'frequencia' | 'gravidade' | 'custo';
export type ChanceExito = 'alta' | 'media' | 'baixa';

export interface DivergenciaCatalogo {
  codigo: string;
  descricao: string;
  fundamentacaoLegal: string;
  evidenciaNecessaria: string[];
  impactoNoIndice: ImpactoIndice[];
  chanceExito: ChanceExito;
}

export interface DivergenciaEncontrada {
  codigo: string;
  referencia: string;
  detalhe: string;
}

export type EspecieBeneficio = 'B31' | 'B91' | 'B92' | 'B93' | 'B94' | 'B46';

export interface RegistroCat {
  matricula: string;
  dataAcidente: Date;
}

export interface RegistroBeneficio {
  nit: string;
  matricula?: string;
  especie: EspecieBeneficio;
  cid?: string;
  dataInicio: Date;
  dataFim?: Date;
  valorPago: number;
  cnpjVinculo: string;
  resultouMorte?: boolean;
}

export interface VinculoInterno {
  nit: string;
  matricula: string;
  dataAdmissao: Date;
  dataRescisao?: Date;
}

export interface LaudoQueAfastaNexo {
  matricula: string;
}

export interface ExtratoFap {
  cnpjEstabelecimento: string;
  periodoBase: { inicio: Date; fim: Date };
  cats: RegistroCat[];
  beneficios: RegistroBeneficio[];
  massaSalarialDeclaradaNoExtrato: number;
  numeroMedioVinculosNoExtrato: number;
  admissoesNoExtrato: number;
  rescisoesNoExtrato: number;
}

export interface DadosInternosEmpresa {
  vinculos: VinculoInterno[];
  massaSalarialFolha: number;
  admissoesRegistros: number;
  rescisoesRegistros: number;
  laudosQueAfastamNexo?: LaudoQueAfastaNexo[];
}
