import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { gerarOuAtualizarContestacaoDoCiclo, identificarDivergenciasExcluidasDaMinuta } from '@/lib/reconciliacao-service';
import { ContestacaoWorkspace } from '@/components/reconciliacao/contestacao-workspace';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContestacaoPage({ params }: Props) {
  const { id } = await params;

  const ciclo = await prisma.cicloFap.findUnique({
    where: { id },
    include: {
      estabelecimento: { include: { cliente: true } },
      contestacoes: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!ciclo) notFound();

  let contestacaoAtual = ciclo.contestacoes[0] ?? null;
  let divergenciasExcluidas;

  if (!contestacaoAtual) {
    const resultado = await gerarOuAtualizarContestacaoDoCiclo(id);
    contestacaoAtual = resultado.contestacao;
    divergenciasExcluidas = resultado.divergenciasExcluidas;
  } else {
    const confirmadasDb = await prisma.divergencia.findMany({
      where: { cicloFapId: id, status: 'CONFIRMADA' },
      include: { registroExtrato: true, registroInterno: true },
    });
    divergenciasExcluidas = identificarDivergenciasExcluidasDaMinuta(contestacaoAtual.textoMinuta, confirmadasDb);
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/ciclos/${id}/reconciliacao`} className="text-sm text-muted-foreground hover:underline">
          ← Reconciliação
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">
          Contestação — {ciclo.estabelecimento.cliente.razaoSocial} · ciclo {ciclo.anoVigencia}
        </h1>
      </div>

      <ContestacaoWorkspace
        cicloId={id}
        contestacaoId={contestacaoAtual.id}
        textoInicial={contestacaoAtual.textoMinuta}
        protocoladaEm={contestacaoAtual.protocoladaEm}
        divergenciasExcluidasIniciais={divergenciasExcluidas}
      />
    </div>
  );
}
