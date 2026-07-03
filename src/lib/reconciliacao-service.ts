import { prisma } from '@/lib/prisma';
import {
  paraCicloParaSimulacao,
  paraContextoCicloFap,
  paraDadosEmpresaParaMinuta,
  paraDivergenciaDominio,
  paraRegistroExtratoPlano,
  paraRegistroInternoPlano,
} from '@/lib/mappers';
import { calcularImpacto, gerarMinutaContestacao, reconciliar, simularFap } from '@/domain/reconciliacao';
import type { StatusDivergencia } from '@/domain/enums';

async function carregarContextoCiclo(cicloId: string) {
  return prisma.cicloFap.findUniqueOrThrow({
    where: { id: cicloId },
    include: {
      estabelecimento: { include: { cliente: true } },
      registrosExtrato: true,
      registrosInternos: true,
    },
  });
}

/**
 * Roda as 10 regras DIV-001..DIV-010 sobre os registros do ciclo e sincroniza
 * a tabela Divergencia (upsert por cicloFapId+codigo+registroExtratoId). O
 * status de uma divergência já revisada (CONFIRMADA/DESCARTADA/EVIDENCIA_PENDENTE)
 * nunca é sobrescrito por uma nova rodada de detecção — só os campos
 * calculados (severidade, impacto, fundamentação) são atualizados.
 */
export async function garantirDivergenciasDoCiclo(cicloId: string): Promise<void> {
  const ciclo = await carregarContextoCiclo(cicloId);

  const registrosExtratoPlano = ciclo.registrosExtrato.map(paraRegistroExtratoPlano);
  const registrosInternoPlano = ciclo.registrosInternos.map(paraRegistroInternoPlano);

  const encontradas = reconciliar(registrosExtratoPlano, registrosInternoPlano, { anoVigencia: ciclo.anoVigencia });
  const contexto = paraContextoCicloFap(ciclo, ciclo.estabelecimento, registrosExtratoPlano);

  for (const divergencia of encontradas) {
    const impactoEstimadoCentavos = calcularImpacto(divergencia, contexto);

    await prisma.divergencia.upsert({
      where: {
        cicloFapId_codigo_registroExtratoId: {
          cicloFapId: cicloId,
          codigo: divergencia.codigo,
          registroExtratoId: divergencia.registroExtratoId,
        },
      },
      create: {
        cicloFapId: cicloId,
        codigo: divergencia.codigo,
        registroExtratoId: divergencia.registroExtratoId,
        registroInternoId: divergencia.registroInternoId,
        severidade: divergencia.severidade,
        impactoIndice: divergencia.impactoIndice,
        impactoEstimadoCentavos,
        status: divergencia.status,
        justificativa: divergencia.justificativa,
        fundamentacaoLegal: divergencia.fundamentacaoLegal,
      },
      update: {
        severidade: divergencia.severidade,
        impactoIndice: divergencia.impactoIndice,
        impactoEstimadoCentavos,
        fundamentacaoLegal: divergencia.fundamentacaoLegal,
      },
    });
  }

  if (ciclo.status === 'IMPORTADO' && encontradas.length > 0) {
    await prisma.cicloFap.update({ where: { id: cicloId }, data: { status: 'RECONCILIADO' } });
  }
}

export async function atualizarStatusDivergencia(
  divergenciaId: string,
  status: StatusDivergencia,
  justificativaDescarte?: string
): Promise<void> {
  if (status === 'DESCARTADA') {
    if (!justificativaDescarte?.trim()) {
      throw new Error('Justificativa é obrigatória para descartar uma divergência.');
    }
    const atual = await prisma.divergencia.findUniqueOrThrow({ where: { id: divergenciaId } });
    await prisma.divergencia.update({
      where: { id: divergenciaId },
      data: {
        status,
        justificativa: `${atual.justificativa ?? ''}\n\nMotivo do descarte: ${justificativaDescarte.trim()}`.trim(),
      },
    });
    return;
  }

  await prisma.divergencia.update({ where: { id: divergenciaId }, data: { status } });
}

export async function executarSimulacaoDoCiclo(cicloId: string) {
  const ciclo = await carregarContextoCiclo(cicloId);
  const registrosExtratoPlano = ciclo.registrosExtrato.map(paraRegistroExtratoPlano);
  const cicloParaSimulacao = paraCicloParaSimulacao(ciclo, ciclo.estabelecimento, registrosExtratoPlano);

  const confirmadasDb = await prisma.divergencia.findMany({
    where: { cicloFapId: cicloId, status: 'CONFIRMADA' },
    include: { registroExtrato: true, registroInterno: true },
  });

  return simularFap(cicloParaSimulacao, confirmadasDb.map(paraDivergenciaDominio));
}

export async function executarGerarContestacaoDoCiclo(cicloId: string) {
  const ciclo = await carregarContextoCiclo(cicloId);

  const confirmadasDb = await prisma.divergencia.findMany({
    where: { cicloFapId: cicloId, status: 'CONFIRMADA' },
    include: { registroExtrato: true, registroInterno: true },
  });

  const dadosEmpresa = paraDadosEmpresaParaMinuta(ciclo.estabelecimento.cliente, ciclo.estabelecimento, ciclo.anoVigencia);
  const texto = gerarMinutaContestacao(confirmadasDb.map(paraDivergenciaDominio), dadosEmpresa);

  return prisma.contestacao.create({
    data: { cicloFapId: cicloId, textoMinuta: texto, caracteres: texto.length },
  });
}
