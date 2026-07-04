import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { garantirDivergenciasDoCiclo } from '@/lib/reconciliacao-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusCicloBadge } from '@/components/badges';
import { Num } from '@/components/num';
import { formatBRLFromCentavos, formatCNPJ, formatFapFromInt } from '@/lib/format';
import { ReconciliacaoWorkspace } from '@/components/reconciliacao/reconciliacao-workspace';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReconciliacaoPage({ params }: Props) {
  const { id } = await params;

  const cicloExiste = await prisma.cicloFap.findUnique({ where: { id }, select: { id: true } });
  if (!cicloExiste) notFound();

  await garantirDivergenciasDoCiclo(id);

  const ciclo = await prisma.cicloFap.findUniqueOrThrow({
    where: { id },
    include: {
      estabelecimento: { include: { cliente: true } },
      divergencias: {
        include: { registroExtrato: true, registroInterno: true },
        orderBy: [{ impactoEstimadoCentavos: 'desc' }],
      },
      _count: { select: { registrosExtrato: true, registrosInternos: true } },
    },
  });

  const semRegistros = ciclo._count.registrosExtrato === 0 && ciclo._count.registrosInternos === 0;

  const impactoTotal = ciclo.divergencias
    .filter((d) => d.status !== 'DESCARTADA')
    .reduce((soma, d) => soma + d.impactoEstimadoCentavos, 0);

  const porSeveridade = { ALTA: 0, MEDIA: 0, BAIXA: 0 } as Record<string, number>;
  for (const d of ciclo.divergencias) {
    if (d.status === 'DESCARTADA') continue;
    porSeveridade[d.severidade] = (porSeveridade[d.severidade] ?? 0) + 1;
  }

  return (
    <div className="space-y-4 pb-20">
      <div>
        <Link
          href={`/clientes/${ciclo.estabelecimento.clienteId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← {ciclo.estabelecimento.cliente.razaoSocial}
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">
          Reconciliação — ciclo {ciclo.anoVigencia} · {formatCNPJ(ciclo.estabelecimento.cnpj)}
        </h1>
      </div>

      {semRegistros ? (
        <Card>
          <CardContent className="space-y-2 py-8 text-center">
            <p className="font-medium">Este ciclo ainda não tem nenhum registro de extrato ou de dados internos.</p>
            <p className="text-sm text-muted-foreground">
              Sem registros importados não há o que reconciliar. A importação de arquivos CSV/XLSX está no roadmap da
              próxima fase do produto (ver backlog no CLAUDE.md) — por ora, os registros são carregados diretamente no
              banco de dados.
            </p>
            <Link
              href={`/clientes/${ciclo.estabelecimento.clienteId}`}
              className="inline-block text-sm text-primary hover:underline"
            >
              Voltar ao cadastro do cliente
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">FAP atribuído</CardTitle>
          </CardHeader>
          <CardContent>
            <Num className="text-xl font-semibold">{formatFapFromInt(ciclo.fapAtribuido)}</Num>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status do ciclo</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusCicloBadge status={ciclo.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alta severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <Num className="text-xl font-semibold text-destructive">{porSeveridade.ALTA ?? 0}</Num>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média/baixa severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <Num className="text-xl font-semibold">{(porSeveridade.MEDIA ?? 0) + (porSeveridade.BAIXA ?? 0)}</Num>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impacto total estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <Num className="text-xl font-semibold text-success">{formatBRLFromCentavos(impactoTotal)}</Num>
          </CardContent>
        </Card>
          </div>

          <ReconciliacaoWorkspace cicloId={ciclo.id} divergencias={ciclo.divergencias} />
        </>
      )}
    </div>
  );
}
