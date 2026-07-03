export const LIMITE_CARACTERES_CONTESTACAO = 5000;
export const PRAZO_RECURSO_DIAS = 30;
export const PRAZO_PRESCRICAO_RECUPERACAO_ANOS = 5;

export interface JanelaContestacao {
  inicio: Date;
  fim: Date;
}

/** Janela de contestação do índice vigente: eletrônica (FAPWeb), fixa de 1 a 30 de novembro. */
export function janelaContestacao(anoBase: number): JanelaContestacao {
  return {
    inicio: new Date(Date.UTC(anoBase, 10, 1, 0, 0, 0)),
    fim: new Date(Date.UTC(anoBase, 10, 30, 23, 59, 59)),
  };
}

export function estaDentroDaJanelaContestacao(data: Date, anoBase: number): boolean {
  const { inicio, fim } = janelaContestacao(anoBase);
  return data >= inicio && data <= fim;
}

/** Recurso: 30 dias corridos após a publicação do resultado da contestação. */
export function prazoFinalRecurso(dataPublicacaoResultado: Date): Date {
  const prazo = new Date(dataPublicacaoResultado);
  prazo.setUTCDate(prazo.getUTCDate() + PRAZO_RECURSO_DIAS);
  return prazo;
}

export function dentroDoPrazoRecurso(data: Date, dataPublicacaoResultado: Date): boolean {
  return data <= prazoFinalRecurso(dataPublicacaoResultado);
}

/** Recuperação retroativa (PER/DCOMP): sem janela fixa, prescrição de 5 anos por pagamento. */
export function dentroDoPrazoPrescricional(dataPagamento: Date, dataReferencia: Date = new Date()): boolean {
  const limite = new Date(dataPagamento);
  limite.setUTCFullYear(limite.getUTCFullYear() + PRAZO_PRESCRICAO_RECUPERACAO_ANOS);
  return dataReferencia <= limite;
}

/** A contestação não tem efeito suspensivo: o índice contestado permanece vigente até o julgamento. */
export function indiceVigenteDuranteContestacao(): boolean {
  return true;
}
