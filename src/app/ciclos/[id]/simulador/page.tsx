import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { paraCicloParaSimulacao, paraDivergenciaDominio, paraRegistroExtratoPlano } from '@/lib/mappers';
import { buscarDivergenciaPorCodigo } from '@/domain/catalogo-divergencias';
import type { AnoAnteriorBase } from '@/lib/simulacao-ui';
import { SimuladorWorkspace } from '@/components/reconciliacao/simulador-workspace';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

const ANOS_RETROATIVOS = 5;

export default async function SimuladorPage({ params }: Props) {
  const { id } = await params;

  const ciclo = await prisma.cicloFap.findUnique({
    where: { id },
    include: {
      estabelecimento: { include: { cliente: true } },
      registrosExtrato: true,
    },
  });

  if (!ciclo) notFound();

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

  const itens = confirmadasDb.map((d) => ({
    id: d.id,
    codigo: d.codigo,
    titulo: buscarDivergenciaPorCodigo(d.codigo)?.titulo ?? d.codigo,
    severidade: d.severidade,
    impactoEstimadoCentavos: d.impactoEstimadoCentavos,
    dominio: paraDivergenciaDominio(d),
  }));

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/ciclos/${ciclo.id}/reconciliacao`} className="text-sm text-muted-foreground hover:underline">
          ← Reconciliação
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">
          Simulador — {ciclo.estabelecimento.cliente.razaoSocial} · ciclo {ciclo.anoVigencia}
        </h1>
      </div>

      <SimuladorWorkspace
        cicloId={ciclo.id}
        cicloBase={cicloBase}
        itens={itens}
        anosAnteriores={anosAnteriores}
        percentualExito={ciclo.estabelecimento.cliente.percentualExito}
      />
    </div>
  );
}
