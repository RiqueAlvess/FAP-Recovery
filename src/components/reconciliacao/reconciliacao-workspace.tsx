'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Divergencia, RegistroExtrato, RegistroInterno } from '@prisma/client';
import { alterarStatusDivergenciaAction, gerarContestacaoAction, simularFapAction } from '@/app/ciclos/[id]/reconciliacao/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CodigoDivergenciaBadge, SeveridadeBadge, StatusDivergenciaBadge } from '@/components/badges';
import { Num } from '@/components/num';
import { formatBRLFromCentavos, formatDateBR, formatFapFromDecimal } from '@/lib/format';

type DivergenciaComRegistros = Divergencia & {
  registroExtrato: RegistroExtrato;
  registroInterno: RegistroInterno | null;
};

interface ResultadoSimulacaoView {
  fapSimulado: number;
  economiaAnualCentavos: number;
  creditoRetroativoCentavos: number;
}

const TODOS = 'TODOS';

function resumoExtrato(registro: RegistroExtrato): string {
  const partes = [
    registro.tipo + (registro.especieBeneficio ? ` ${registro.especieBeneficio}` : ''),
    registro.nomeTrabalhador ?? registro.nit ?? '—',
  ];
  if (registro.dataInicio) partes.push(formatDateBR(registro.dataInicio));
  if (registro.valorCentavos > 0) partes.push(formatBRLFromCentavos(registro.valorCentavos));
  return partes.join(' · ');
}

function resumoInterno(registro: RegistroInterno | null): string {
  if (!registro) return '— (sem correspondência interna)';
  const partes = [registro.tipo, registro.nomeTrabalhador ?? registro.nit ?? registro.matricula ?? '—'];
  if (registro.dataAdmissao) partes.push(`admissão ${formatDateBR(registro.dataAdmissao)}`);
  if (registro.dataDesligamento) partes.push(`desligamento ${formatDateBR(registro.dataDesligamento)}`);
  return partes.join(' · ');
}

function jsonFormatado(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export function ReconciliacaoWorkspace({
  cicloId,
  divergencias,
}: {
  cicloId: string;
  divergencias: DivergenciaComRegistros[];
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  const [filtroSeveridade, setFiltroSeveridade] = useState(TODOS);
  const [filtroCodigo, setFiltroCodigo] = useState(TODOS);
  const [filtroStatus, setFiltroStatus] = useState(TODOS);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [descarteAberto, setDescarteAberto] = useState<string | null>(null);
  const [justificativaDescarte, setJustificativaDescarte] = useState('');

  const [simulacaoAberta, setSimulacaoAberta] = useState(false);
  const [resultadoSimulacao, setResultadoSimulacao] = useState<ResultadoSimulacaoView | null>(null);

  const [contestacaoAberta, setContestacaoAberta] = useState(false);
  const [textoContestacao, setTextoContestacao] = useState('');

  const codigosDisponiveis = useMemo(
    () => Array.from(new Set(divergencias.map((d) => d.codigo))).sort(),
    [divergencias]
  );

  const filtradas = divergencias.filter((d) => {
    if (filtroSeveridade !== TODOS && d.severidade !== filtroSeveridade) return false;
    if (filtroCodigo !== TODOS && d.codigo !== filtroCodigo) return false;
    if (filtroStatus !== TODOS && d.status !== filtroStatus) return false;
    return true;
  });

  const confirmadas = divergencias.filter((d) => d.status === 'CONFIRMADA');
  const impactoConfirmado = confirmadas.reduce((soma, d) => soma + d.impactoEstimadoCentavos, 0);

  function alternarExpandido(id: string) {
    setExpandidos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function confirmar(id: string) {
    startTransition(async () => {
      await alterarStatusDivergenciaAction(cicloId, id, 'CONFIRMADA');
      router.refresh();
    });
  }

  function marcarEvidenciaPendente(id: string) {
    startTransition(async () => {
      await alterarStatusDivergenciaAction(cicloId, id, 'EVIDENCIA_PENDENTE');
      router.refresh();
    });
  }

  function confirmarDescarte() {
    if (!descarteAberto || !justificativaDescarte.trim()) return;
    const id = descarteAberto;
    startTransition(async () => {
      await alterarStatusDivergenciaAction(cicloId, id, 'DESCARTADA', justificativaDescarte);
      setDescarteAberto(null);
      setJustificativaDescarte('');
      router.refresh();
    });
  }

  function simular() {
    startTransition(async () => {
      const resultado = await simularFapAction(cicloId);
      setResultadoSimulacao(resultado);
      setSimulacaoAberta(true);
    });
  }

  function gerarContestacao() {
    startTransition(async () => {
      const resultado = await gerarContestacaoAction(cicloId);
      setTextoContestacao(resultado.contestacao.textoMinuta);
      setContestacaoAberta(true);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Severidade</Label>
          <Select value={filtroSeveridade} onValueChange={setFiltroSeveridade}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              <SelectItem value="ALTA">Alta</SelectItem>
              <SelectItem value="MEDIA">Média</SelectItem>
              <SelectItem value="BAIXA">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Código</Label>
          <Select value={filtroCodigo} onValueChange={setFiltroCodigo}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {codigosDisponiveis.map((codigo) => (
                <SelectItem key={codigo} value={codigo}>
                  {codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              <SelectItem value="DETECTADA">Detectada</SelectItem>
              <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
              <SelectItem value="DESCARTADA">Descartada</SelectItem>
              <SelectItem value="EVIDENCIA_PENDENTE">Evidência pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">
          {filtradas.length} de {divergencias.length} divergência(s)
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[1%]"></TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Registro do extrato</TableHead>
                <TableHead>Registro interno</TableHead>
                <TableHead className="text-right">Impacto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhuma divergência encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : null}
              {filtradas.map((d) => {
                const expandido = expandidos.has(d.id);
                return (
                  <Fragment key={d.id}>
                    <TableRow>
                      <TableCell>
                        <button
                          onClick={() => alternarExpandido(d.id)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Expandir"
                        >
                          {expandido ? '▾' : '▸'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <CodigoDivergenciaBadge codigo={d.codigo} />
                      </TableCell>
                      <TableCell>
                        <SeveridadeBadge severidade={d.severidade} />
                      </TableCell>
                      <TableCell className="max-w-[240px] text-xs">{resumoExtrato(d.registroExtrato)}</TableCell>
                      <TableCell className="max-w-[240px] text-xs">{resumoInterno(d.registroInterno)}</TableCell>
                      <TableCell className="text-right">
                        <Num className="font-medium">{formatBRLFromCentavos(d.impactoEstimadoCentavos)}</Num>
                      </TableCell>
                      <TableCell>
                        <StatusDivergenciaBadge status={d.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={pendente || d.status === 'CONFIRMADA'}
                            onClick={() => confirmar(d.id)}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={pendente || d.status === 'EVIDENCIA_PENDENTE'}
                            onClick={() => marcarEvidenciaPendente(d.id)}
                          >
                            Evidência
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            disabled={pendente || d.status === 'DESCARTADA'}
                            onClick={() => setDescarteAberto(d.id)}
                          >
                            Descartar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandido ? (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30">
                          <div className="grid grid-cols-2 gap-4 py-2">
                            <div>
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                dadosBrutosJson — registro do extrato
                              </p>
                              <pre className="max-h-64 overflow-auto rounded-md bg-background p-2 font-mono text-xs">
                                {jsonFormatado(d.registroExtrato.dadosBrutosJson)}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                dadosBrutosJson — registro interno
                              </p>
                              <pre className="max-h-64 overflow-auto rounded-md bg-background p-2 font-mono text-xs">
                                {d.registroInterno ? jsonFormatado(d.registroInterno.dadosBrutosJson) : '—'}
                              </pre>
                            </div>
                            <div className="col-span-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Justificativa: </span>
                              {d.justificativa}
                              <br />
                              <span className="font-medium text-foreground">Fundamentação legal: </span>
                              {d.fundamentacaoLegal}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <p className="text-sm">
            <Num className="font-medium">{confirmadas.length}</Num> confirmada(s) ·{' '}
            <span className="text-muted-foreground">impacto</span>{' '}
            <Num className="font-medium text-success">{formatBRLFromCentavos(impactoConfirmado)}</Num>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pendente} onClick={simular}>
              Simular FAP
            </Button>
            <Button size="sm" disabled={pendente || confirmadas.length === 0} onClick={gerarContestacao}>
              Gerar contestação
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={descarteAberto !== null} onOpenChange={(aberto) => !aberto && setDescarteAberto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar divergência</DialogTitle>
            <DialogDescription>Justificativa obrigatória — registrada junto ao histórico da divergência.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={justificativaDescarte}
            onChange={(e) => setJustificativaDescarte(e.target.value)}
            placeholder="Explique por que esta divergência não procede..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDescarteAberto(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={!justificativaDescarte.trim() || pendente} onClick={confirmarDescarte}>
              Confirmar descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={simulacaoAberta} onOpenChange={setSimulacaoAberta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulação de impacto no FAP</DialogTitle>
            <DialogDescription>Considera as divergências já confirmadas neste ciclo.</DialogDescription>
          </DialogHeader>
          {resultadoSimulacao ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">FAP simulado</span>
                <Num className="font-medium">{formatFapFromDecimal(resultadoSimulacao.fapSimulado)}</Num>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Economia anual estimada</span>
                <Num className="font-medium text-success">
                  {formatBRLFromCentavos(resultadoSimulacao.economiaAnualCentavos)}
                </Num>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crédito retroativo estimado</span>
                <Num className="font-medium text-success">
                  {formatBRLFromCentavos(resultadoSimulacao.creditoRetroativoCentavos)}
                </Num>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={contestacaoAberta} onOpenChange={setContestacaoAberta}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Minuta de contestação gerada</DialogTitle>
            <DialogDescription>
              <Num>{textoContestacao.length}</Num> / 5.000 caracteres
            </DialogDescription>
          </DialogHeader>
          <Textarea readOnly value={textoContestacao} rows={16} className="font-mono text-xs" />
          <DialogFooter className="justify-between sm:justify-between">
            <Link href={`/ciclos/${cicloId}/contestacao`} className="text-sm text-primary hover:underline">
              Abrir tela de contestação para editar e protocolar →
            </Link>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(textoContestacao)}>
              Copiar texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
