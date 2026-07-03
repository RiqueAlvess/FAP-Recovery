import { EstagioPipeline } from './types';

const ORDEM_PIPELINE: EstagioPipeline[] = [
  EstagioPipeline.PROSPECT,
  EstagioPipeline.DIAGNOSTICO,
  EstagioPipeline.PROPOSTA,
  EstagioPipeline.CONTRATADO,
  EstagioPipeline.EM_ANALISE,
  EstagioPipeline.PROTOCOLADO,
  EstagioPipeline.JULGADO,
  EstagioPipeline.FATURADO,
];

/** Pipeline linear: cada estágio só pode avançar para o próximo da sequência. */
export function proximosEstagiosPermitidos(atual: EstagioPipeline): EstagioPipeline[] {
  const indiceAtual = ORDEM_PIPELINE.indexOf(atual);
  const proximo = ORDEM_PIPELINE[indiceAtual + 1];
  return proximo ? [proximo] : [];
}

export function podeAvancarPara(atual: EstagioPipeline, destino: EstagioPipeline): boolean {
  return proximosEstagiosPermitidos(atual).includes(destino);
}
