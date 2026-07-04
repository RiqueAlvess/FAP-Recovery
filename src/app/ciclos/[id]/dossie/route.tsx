import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { buscarDivergenciaPorCodigo } from '@/domain/catalogo-divergencias';
import { formatCNPJ } from '@/lib/format';
import { DossieDocument, type ItemDossiePdf } from '@/lib/pdf/dossie-document';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const ciclo = await prisma.cicloFap.findUnique({
    where: { id },
    include: { estabelecimento: { include: { cliente: true } } },
  });
  if (!ciclo) {
    return NextResponse.json({ error: 'Ciclo não encontrado' }, { status: 404 });
  }

  const confirmadas = await prisma.divergencia.findMany({
    where: { cicloFapId: id, status: 'CONFIRMADA' },
    include: { registroExtrato: true, registroInterno: true },
    orderBy: { impactoEstimadoCentavos: 'desc' },
  });

  const itens: ItemDossiePdf[] = confirmadas.map((d) => {
    const catalogo = buscarDivergenciaPorCodigo(d.codigo);
    return {
      codigo: d.codigo,
      titulo: catalogo?.titulo ?? d.codigo,
      descricao: catalogo?.descricao ?? '',
      fundamentacaoLegal: catalogo?.fundamentacaoLegal ?? d.fundamentacaoLegal ?? '',
      evidenciaNecessaria: catalogo?.evidenciaNecessaria ?? [],
      severidade: d.severidade,
      impactoEstimadoCentavos: d.impactoEstimadoCentavos,
      justificativa: d.justificativa ?? '',
      registroExtrato: {
        tipo: d.registroExtrato.tipo,
        nit: d.registroExtrato.nit,
        nomeTrabalhador: d.registroExtrato.nomeTrabalhador,
        especieBeneficio: d.registroExtrato.especieBeneficio,
        cid: d.registroExtrato.cid,
        dataInicio: d.registroExtrato.dataInicio,
        dataFim: d.registroExtrato.dataFim,
        valorCentavos: d.registroExtrato.valorCentavos,
      },
      registroInterno: d.registroInterno
        ? {
            tipo: d.registroInterno.tipo,
            nit: d.registroInterno.nit,
            nomeTrabalhador: d.registroInterno.nomeTrabalhador,
            matricula: d.registroInterno.matricula,
            dataAdmissao: d.registroInterno.dataAdmissao,
            dataDesligamento: d.registroInterno.dataDesligamento,
          }
        : null,
    };
  });

  const buffer = await renderToBuffer(
    <DossieDocument
      razaoSocial={ciclo.estabelecimento.cliente.razaoSocial}
      cnpj={formatCNPJ(ciclo.estabelecimento.cnpj)}
      cnaeSubclasse={ciclo.estabelecimento.cnaeSubclasse}
      anoVigencia={ciclo.anoVigencia}
      itens={itens}
      geradoEm={new Date()}
    />
  );

  return new NextResponse(new Blob([Uint8Array.from(buffer)], { type: 'application/pdf' }), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="dossie-evidencias-ciclo-${ciclo.anoVigencia}.pdf"`,
    },
  });
}
