import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { paraCicloParaSimulacao, paraDivergenciaDominio, paraRegistroExtratoPlano } from '@/lib/mappers';
import { buscarDivergenciaPorCodigo } from '@/domain/catalogo-divergencias';
import { calcularSimulacaoCompleta, type AnoAnteriorBase } from '@/lib/simulacao-ui';
import { PropostaDocument } from '@/lib/pdf/proposta-document';

const ANOS_RETROATIVOS = 5;

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const incluidasIds: string[] = Array.isArray(body.incluidasIds) ? body.incluidasIds : [];
  const selicPorAno: Record<number, number> = body.selicPorAno ?? {};

  const ciclo = await prisma.cicloFap.findUnique({
    where: { id },
    include: { estabelecimento: { include: { cliente: true } }, registrosExtrato: true },
  });
  if (!ciclo) {
    return NextResponse.json({ error: 'Ciclo não encontrado' }, { status: 404 });
  }

  const confirmadasDb = await prisma.divergencia.findMany({
    where: { cicloFapId: id, status: 'CONFIRMADA' },
    include: { registroExtrato: true, registroInterno: true },
    orderBy: { impactoEstimadoCentavos: 'desc' },
  });

  const anosDesejados = Array.from({ length: ANOS_RETROATIVOS }, (_, i) => ciclo.anoVigencia - (i + 1));
  const ciclosHistoricos = await prisma.cicloFap.findMany({
    where: { estabelecimentoId: ciclo.estabelecimentoId, anoVigencia: { in: anosDesejados } },
  });
  const anosAnteriores: AnoAnteriorBase[] = anosDesejados.map((ano) => {
    const historico = ciclosHistoricos.find((c) => c.anoVigencia === ano);
    return {
      anoVigencia: ano,
      fapAtual: historico ? historico.fapAtribuido / 10_000 : ciclo.fapAtribuido / 10_000,
      origemReal: Boolean(historico),
    };
  });

  const registrosExtratoPlano = ciclo.registrosExtrato.map(paraRegistroExtratoPlano);
  const cicloBase = paraCicloParaSimulacao(ciclo, ciclo.estabelecimento, registrosExtratoPlano);
  const divergenciasConfirmadas = confirmadasDb.map(paraDivergenciaDominio);
  const incluidas = confirmadasDb.map((d) => incluidasIds.includes(d.id));

  const resultado = calcularSimulacaoCompleta({
    cicloBase,
    divergenciasConfirmadas,
    incluidas,
    anosAnteriores,
    selicPorAno,
  });

  const honorarioProjetadoCentavos = Math.round(
    (resultado.economiaAnualCentavos + resultado.creditoRetroativoCentavos) *
      (ciclo.estabelecimento.cliente.percentualExito / 100)
  );

  const divergenciasParaPdf = confirmadasDb
    .filter((d) => incluidasIds.includes(d.id))
    .map((d) => ({
      codigo: d.codigo,
      titulo: buscarDivergenciaPorCodigo(d.codigo)?.titulo ?? d.codigo,
      severidade: d.severidade,
      impactoEstimadoCentavos: d.impactoEstimadoCentavos,
    }));

  const buffer = await renderToBuffer(
    <PropostaDocument
      razaoSocial={ciclo.estabelecimento.cliente.razaoSocial}
      cnpj={ciclo.estabelecimento.cnpj}
      cnaeSubclasse={ciclo.estabelecimento.cnaeSubclasse}
      anoVigencia={ciclo.anoVigencia}
      fapAtual={cicloBase.fapAtual}
      fapSimulado={resultado.fapSimulado}
      economiaAnualCentavos={resultado.economiaAnualCentavos}
      creditoRetroativoCentavos={resultado.creditoRetroativoCentavos}
      honorarioProjetadoCentavos={honorarioProjetadoCentavos}
      percentualExito={ciclo.estabelecimento.cliente.percentualExito}
      divergencias={divergenciasParaPdf}
      geradoEm={new Date()}
    />
  );

  return new NextResponse(new Blob([Uint8Array.from(buffer)], { type: 'application/pdf' }), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposta-fap-${ciclo.anoVigencia}.pdf"`,
    },
  });
}
