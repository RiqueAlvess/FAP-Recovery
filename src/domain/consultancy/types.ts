export enum EstagioPipeline {
  PROSPECT = 'PROSPECT',
  DIAGNOSTICO = 'DIAGNOSTICO',
  PROPOSTA = 'PROPOSTA',
  CONTRATADO = 'CONTRATADO',
  EM_ANALISE = 'EM_ANALISE',
  PROTOCOLADO = 'PROTOCOLADO',
  JULGADO = 'JULGADO',
  FATURADO = 'FATURADO',
}

export interface PagamentoBeneficio {
  data: Date;
  valor: number;
}
