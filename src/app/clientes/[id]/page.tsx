import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  createCicloFap,
  createEstabelecimento,
  deleteCliente,
  deleteEstabelecimento,
  updateCliente,
} from '@/app/clientes/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EstagioBadge, ROTULOS_ESTAGIO, StatusCicloBadge } from '@/components/badges';
import { Num } from '@/components/num';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { formatBRLFromCentavos, formatCNPJ, formatFapFromInt } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetalhePage({ params }: Props) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      estabelecimentos: {
        include: { ciclosFap: { orderBy: { anoVigencia: 'desc' } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!cliente) notFound();

  const ciclos = cliente.estabelecimentos.flatMap((estabelecimento) =>
    estabelecimento.ciclosFap.map((ciclo) => ({ ciclo, estabelecimento }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/clientes" className="text-sm text-muted-foreground hover:underline">
            ← Clientes
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">{cliente.razaoSocial}</h1>
        </div>
        <form action={deleteCliente.bind(null, cliente.id)}>
          <ConfirmSubmitButton
            type="submit"
            variant="destructive"
            size="sm"
            confirmMessage="Excluir este cliente e todos os dados associados (estabelecimentos, ciclos, divergências)?"
          >
            Excluir cliente
          </ConfirmSubmitButton>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCliente.bind(null, cliente.id)} className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="razaoSocial">Razão social</Label>
              <Input id="razaoSocial" name="razaoSocial" defaultValue={cliente.razaoSocial} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cnpjRaiz">CNPJ raiz</Label>
              <Input id="cnpjRaiz" name="cnpjRaiz" defaultValue={cliente.cnpjRaiz} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="estagio">Estágio do pipeline</Label>
              <NativeSelect id="estagio" name="estagio" defaultValue={cliente.estagio}>
                {Object.entries(ROTULOS_ESTAGIO).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="percentualExito">% de êxito contratado</Label>
              <Input
                id="percentualExito"
                name="percentualExito"
                type="number"
                min={0}
                max={100}
                defaultValue={cliente.percentualExito}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contatoNome">Contato (nome)</Label>
              <Input id="contatoNome" name="contatoNome" defaultValue={cliente.contatoNome ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contatoEmail">Contato (e-mail)</Label>
              <Input id="contatoEmail" name="contatoEmail" type="email" defaultValue={cliente.contatoEmail ?? ''} />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" size="sm">
                Salvar alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="estabelecimentos">
        <TabsList>
          <TabsTrigger value="estabelecimentos">Estabelecimentos</TabsTrigger>
          <TabsTrigger value="ciclos">Ciclos FAP</TabsTrigger>
        </TabsList>

        <TabsContent value="estabelecimentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo estabelecimento</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createEstabelecimento.bind(null, cliente.id)} className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" name="cnpj" placeholder="00.000.000/0001-00" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cnaeSubclasse">CNAE (subclasse)</Label>
                  <Input id="cnaeSubclasse" name="cnaeSubclasse" placeholder="41.20-4-00" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="aliquotaRat">Alíquota RAT</Label>
                  <NativeSelect id="aliquotaRat" name="aliquotaRat" defaultValue="2">
                    <option value={1}>1%</option>
                    <option value={2}>2%</option>
                    <option value={3}>3%</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="folhaMediaMensal">Folha média mensal (R$)</Label>
                  <Input id="folhaMediaMensal" name="folhaMediaMensal" type="number" min={0} step="0.01" />
                </div>
                <div className="col-span-4 flex justify-end">
                  <Button type="submit" size="sm">
                    Adicionar estabelecimento
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>CNAE</TableHead>
                    <TableHead>RAT</TableHead>
                    <TableHead>Folha média mensal</TableHead>
                    <TableHead className="w-[1%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cliente.estabelecimentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum estabelecimento cadastrado ainda. Use o formulário acima para adicionar o primeiro CNPJ.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {cliente.estabelecimentos.map((estabelecimento) => (
                    <TableRow key={estabelecimento.id}>
                      <TableCell>
                        <Num>{formatCNPJ(estabelecimento.cnpj)}</Num>
                      </TableCell>
                      <TableCell>
                        <Num>{estabelecimento.cnaeSubclasse}</Num>
                      </TableCell>
                      <TableCell>
                        <Num>{estabelecimento.aliquotaRat}%</Num>
                      </TableCell>
                      <TableCell>
                        <Num>{formatBRLFromCentavos(estabelecimento.folhaMediaMensalCentavos)}</Num>
                      </TableCell>
                      <TableCell>
                        <form action={deleteEstabelecimento.bind(null, cliente.id, estabelecimento.id)}>
                          <ConfirmSubmitButton
                            type="submit"
                            variant="ghost"
                            size="sm"
                            confirmMessage="Excluir este estabelecimento e todos os ciclos/divergências associados?"
                          >
                            Excluir
                          </ConfirmSubmitButton>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ciclos" className="space-y-4">
          {cliente.estabelecimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cadastre um estabelecimento antes de criar um ciclo FAP.</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novo ciclo FAP</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  action={async (formData: FormData) => {
                    'use server';
                    const estabelecimentoId = String(formData.get('estabelecimentoId'));
                    await createCicloFap(cliente.id, estabelecimentoId, formData);
                  }}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className="space-y-1">
                    <Label htmlFor="estabelecimentoId">Estabelecimento</Label>
                    <NativeSelect id="estabelecimentoId" name="estabelecimentoId" defaultValue={cliente.estabelecimentos[0]?.id}>
                      {cliente.estabelecimentos.map((estabelecimento) => (
                        <option key={estabelecimento.id} value={estabelecimento.id}>
                          {formatCNPJ(estabelecimento.cnpj)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="anoVigencia">Ano de vigência</Label>
                    <Input id="anoVigencia" name="anoVigencia" type="number" defaultValue={new Date().getFullYear()} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fapAtribuido">FAP atribuído</Label>
                    <Input id="fapAtribuido" name="fapAtribuido" type="number" step="0.0001" min={0.5} max={2} defaultValue={1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="indiceFrequencia">Percentil frequência (%)</Label>
                    <Input id="indiceFrequencia" name="indiceFrequencia" type="number" min={0} max={100} defaultValue={0} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="indiceGravidade">Percentil gravidade (%)</Label>
                    <Input id="indiceGravidade" name="indiceGravidade" type="number" min={0} max={100} defaultValue={0} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="indiceCusto">Percentil custo (%)</Label>
                    <Input id="indiceCusto" name="indiceCusto" type="number" min={0} max={100} defaultValue={0} />
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <Button type="submit" size="sm">
                      Criar ciclo
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>FAP atribuído</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[1%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ciclos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum ciclo FAP cadastrado ainda. Use o formulário acima para criar o primeiro ciclo.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {ciclos.map(({ ciclo, estabelecimento }) => (
                    <TableRow key={ciclo.id}>
                      <TableCell>
                        <Num>{formatCNPJ(estabelecimento.cnpj)}</Num>
                      </TableCell>
                      <TableCell>
                        <Num>{ciclo.anoVigencia}</Num>
                      </TableCell>
                      <TableCell>
                        <Num>{formatFapFromInt(ciclo.fapAtribuido)}</Num>
                      </TableCell>
                      <TableCell>
                        <StatusCicloBadge status={ciclo.status} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/ciclos/${ciclo.id}/reconciliacao`} className="text-sm text-primary hover:underline">
                          Abrir reconciliação →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
