import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EstagioBadge } from '@/components/badges';
import { Num } from '@/components/num';
import { formatCnpjRaiz, formatPercentInt } from '@/lib/format';
import { NovoClienteDialog } from '@/components/clientes/novo-cliente-dialog';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    include: { estabelecimentos: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Clientes</h1>
        <NovoClienteDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão social</TableHead>
                <TableHead>CNPJ raiz</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead>Estabelecimentos</TableHead>
                <TableHead>% êxito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum cliente cadastrado ainda. Use o botão &quot;Novo cliente&quot; acima para começar.
                  </TableCell>
                </TableRow>
              ) : null}
              {clientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                      {cliente.razaoSocial}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Num>{formatCnpjRaiz(cliente.cnpjRaiz)}</Num>
                  </TableCell>
                  <TableCell>
                    <EstagioBadge estagio={cliente.estagio} />
                  </TableCell>
                  <TableCell>
                    <Num>{cliente.estabelecimentos.length}</Num>
                  </TableCell>
                  <TableCell>
                    <Num>{formatPercentInt(cliente.percentualExito)}</Num>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
