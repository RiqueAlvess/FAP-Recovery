import type { Divergencia as DivergenciaDb, RegistroExtrato as RegistroExtratoDb } from '@prisma/client';
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
import { LIMITE_CARACTERES_CONTESTACAO } from '@/domain/contestation';
import { buscarDivergenciaPorCodigo } from '@/domain/catalogo-divergencias';
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

export interface DivergenciaExcluidaDaMinuta {
  codigo: string;
  titulo: string;
  referencia: string;
}

/**
 * A minuta gerada por `gerarMinutaContestacao` traz cada divergência incluída
 * como uma linha `[CODIGO - titulo] Registro de <referencia>: ...` — usamos
 * essa mesma chave para descobrir, sem alterar a assinatura da função de
 * domínio (que retorna só a string final), quais divergências confirmadas
 * ficaram de fora por causa do limite de caracteres.
 */
export function identificarDivergenciasExcluidasDaMinuta(
  texto: string,
  confirmadas: (DivergenciaDb & { registroExtrato: RegistroExtratoDb })[]
): DivergenciaExcluidaDaMinuta[] {
  return confirmadas
    .map((d) => {
      const titulo = buscarDivergenciaPorCodigo(d.codigo)?.titulo ?? d.codigo;
      const referencia = d.registroExtrato.nomeTrabalhador ?? d.registroExtrato.nit ?? d.registroExtrato.id;
      const chave = `[${d.codigo} - ${titulo}] Registro de ${referencia}:`;
      return { codigo: d.codigo, titulo, referencia, incluida: texto.includes(chave) };
    })
    .filter((d) => !d.incluida)
    .map(({ codigo, titulo, referencia }) => ({ codigo, titulo, referencia }));
}

export interface ResultadoGeracaoContestacao {
  contestacao: Awaited<ReturnType<typeof prisma.contestacao.create>>;
  divergenciasExcluidas: DivergenciaExcluidaDaMinuta[];
}

/**
 * Gera (ou regenera) a minuta de contestação do ciclo. Se já existir uma
 * Contestacao ainda não protocolada, ela é atualizada em vez de criar uma
 * nova linha — uma vez protocolada, a Contestacao vira registro histórico e
 * uma nova geração cria uma linha nova (ex.: ano seguinte).
 */
export async function gerarOuAtualizarContestacaoDoCiclo(cicloId: string): Promise<ResultadoGeracaoContestacao> {
  const ciclo = await carregarContextoCiclo(cicloId);

  const confirmadasDb = await prisma.divergencia.findMany({
    where: { cicloFapId: cicloId, status: 'CONFIRMADA' },
    include: { registroExtrato: true, registroInterno: true },
  });

  const dadosEmpresa = paraDadosEmpresaParaMinuta(ciclo.estabelecimento.cliente, ciclo.estabelecimento, ciclo.anoVigencia);
  const texto = gerarMinutaContestacao(confirmadasDb.map(paraDivergenciaDominio), dadosEmpresa);

  const existente = await prisma.contestacao.findFirst({
    where: { cicloFapId: cicloId, protocoladaEm: null },
    orderBy: { createdAt: 'desc' },
  });

  const contestacao = existente
    ? await prisma.contestacao.update({
        where: { id: existente.id },
        data: { textoMinuta: texto, caracteres: texto.length },
      })
    : await prisma.contestacao.create({
        data: { cicloFapId: cicloId, textoMinuta: texto, caracteres: texto.length },
      });

  return { contestacao, divergenciasExcluidas: identificarDivergenciasExcluidasDaMinuta(texto, confirmadasDb) };
}

export async function salvarMinutaEditada(contestacaoId: string, texto: string): Promise<void> {
  if (texto.length > LIMITE_CARACTERES_CONTESTACAO) {
    throw new Error(`A minuta excede o limite de ${LIMITE_CARACTERES_CONTESTACAO} caracteres.`);
  }
  await prisma.contestacao.update({
    where: { id: contestacaoId },
    data: { textoMinuta: texto, caracteres: texto.length },
  });
}

export async function marcarContestacaoProtocolada(contestacaoId: string, cicloId: string, texto: string): Promise<void> {
  if (texto.length > LIMITE_CARACTERES_CONTESTACAO) {
    throw new Error(`A minuta excede o limite de ${LIMITE_CARACTERES_CONTESTACAO} caracteres.`);
  }

  await prisma.contestacao.update({
    where: { id: contestacaoId },
    data: { textoMinuta: texto, caracteres: texto.length, protocoladaEm: new Date() },
  });

  await prisma.cicloFap.update({ where: { id: cicloId }, data: { status: 'CONTESTADO' } });
}
