import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { janelaContestacao } from '@/domain/contestation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EstagioBadge } from '@/components/badges';
import { Num } from '@/components/num';
import { formatBRLFromCentavos, formatPercentInt } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function carregarDados() {
  const clientes = await prisma.cliente.findMany({
    include: {
      estabelecimentos: {
        include: {
          ciclosFap: {
            include: { divergencias: true, contestacoes: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return clientes;
}

function calcularJanela() {
  const hoje = new Date();
  let janela = janelaContestacao(hoje.getUTCFullYear());
  if (hoje > janela.fim) {
    janela = janelaContestacao(hoje.getUTCFullYear() + 1);
  }
  const dentroDaJanela = hoje >= janela.inicio && hoje <= janela.fim;
  const referencia = dentroDaJanela ? janela.fim : janela.inicio;
  const dias = Math.ceil((referencia.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  return { dentroDaJanela, dias };
}

export default async function DashboardPage() {
  const clientes = await carregarDados();
  const { dentroDaJanela, dias } = calcularJanela();

  const resumoClientes = clientes.map((cliente) => {
    const divergencias = cliente.estabelecimentos.flatMap((e) => e.ciclosFap.flatMap((c) => c.divergencias));
    const naoDescartadas = divergencias.filter((d) => d.status !== 'DESCARTADA');
    const economiaCentavos = naoDescartadas.reduce((soma, d) => soma + d.impactoEstimadoCentavos, 0);
    const honorarioCentavos = Math.round(economiaCentavos * (cliente.percentualExito / 100));
    return { cliente, economiaCentavos, honorarioCentavos };
  });

  const clientesAtivos = clientes.filter((c) => c.estagio !== 'FATURADO').length;
  const economiaPotencialTotal = resumoClientes.reduce((s, r) => s + r.economiaCentavos, 0);
  const honorariosProjetadosTotal = resumoClientes.reduce((s, r) => s + r.honorarioCentavos, 0);

  const acoes: { label: string; href: string }[] = [];
  if (!dentroDaJanela && dias <= 30) {
    acoes.push({ label: `Janela de contestação abre em ${dias} dia(s) (01/11)`, href: '#' });
  }
  if (dentroDaJanela) {
    acoes.push({ label: `Janela de contestação aberta — encerra em ${dias} dia(s) (30/11)`, href: '#' });
  }
  for (const cliente of clientes) {
    for (const estabelecimento of cliente.estabelecimentos) {
      for (const ciclo of estabelecimento.ciclosFap) {
        if (ciclo.status === 'IMPORTADO') {
          acoes.push({
            label: `Reconciliar ciclo ${ciclo.anoVigencia} de ${cliente.razaoSocial}`,
            href: `/ciclos/${ciclo.id}/reconciliacao`,
          });
        } else {
          const confirmadas = ciclo.divergencias.filter((d) => d.status === 'CONFIRMADA');
          if (confirmadas.length > 0 && ciclo.contestacoes.length === 0) {
            acoes.push({
              label: `Gerar contestação para ${cliente.razaoSocial} (${ciclo.anoVigencia})`,
              href: `/ciclos/${ciclo.id}/reconciliacao`,
            });
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <Num className="text-2xl font-semibold">{clientesAtivos}</Num>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Economia potencial identificada</CardTitle>
          </CardHeader>
          <CardContent>
            <Num className="text-2xl font-semibold">{formatBRLFromCentavos(economiaPotencialTotal)}</Num>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Honorários projetados</CardTitle>
          </CardHeader>
          <CardContent>
            <Num className="text-2xl font-semibold text-success">{formatBRLFromCentavos(honorariosProjetadosTotal)}</Num>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {dentroDaJanela ? 'Janela de contestação encerra em' : 'Dias até a janela de contestação'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Num className="text-2xl font-semibold">{dias}</Num>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Carteira por estágio do pipeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>% êxito</TableHead>
                  <TableHead className="text-right">Economia identificada</TableHead>
                  <TableHead className="text-right">Honorário projetado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum cliente cadastrado.
                    </TableCell>
                  </TableRow>
                ) : null}
                {resumoClientes.map(({ cliente, economiaCentavos, honorarioCentavos }) => (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                        {cliente.razaoSocial}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <EstagioBadge estagio={cliente.estagio} />
                    </TableCell>
                    <TableCell>
                      <Num>{formatPercentInt(cliente.percentualExito)}</Num>
                    </TableCell>
                    <TableCell className="text-right">
                      <Num>{formatBRLFromCentavos(economiaCentavos)}</Num>
                    </TableCell>
                    <TableCell className="text-right">
                      <Num className="text-success">{formatBRLFromCentavos(honorarioCentavos)}</Num>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas ações</CardTitle>
          </CardHeader>
          <CardContent>
            {acoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ação pendente no momento.</p>
            ) : (
              <ul className="space-y-2">
                {acoes.map((acao, i) => (
                  <li key={i} className="text-sm">
                    {acao.href === '#' ? (
                      <span className="text-muted-foreground">{acao.label}</span>
                    ) : (
                      <Link href={acao.href} className="text-primary hover:underline">
                        {acao.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
