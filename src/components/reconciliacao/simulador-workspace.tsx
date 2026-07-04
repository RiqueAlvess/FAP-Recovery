'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeveridadeBadge } from '@/components/badges';
import { Num } from '@/components/num';
import { formatBRLFromCentavos, formatFapFromDecimal } from '@/lib/format';
import { calcularSimulacaoCompleta, type AnoAnteriorBase } from '@/lib/simulacao-ui';
import type { CicloParaSimulacao, Divergencia as DivergenciaDominio } from '@/domain/reconciliacao';

interface ItemSimulacao {
  id: string;
  codigo: string;
  titulo: string;
  severidade: string;
  impactoEstimadoCentavos: number;
  dominio: DivergenciaDominio;
}

interface Props {
  cicloId: string;
  cicloBase: Omit<CicloParaSimulacao, 'ciclosAnteriores'>;
  itens: ItemSimulacao[];
  anosAnteriores: AnoAnteriorBase[];
  percentualExito: number;
}

export function SimuladorWorkspace({ cicloId, cicloBase, itens, anosAnteriores, percentualExito }: Props) {
  const [incluidos, setIncluidos] = useState<Record<string, boolean>>(
    () => Object.fromEntries(itens.map((i) => [i.id, true]))
  );
  const [selicPorAno, setSelicPorAno] = useState<Record<number, number>>(
    () => Object.fromEntries(anosAnteriores.map((a) => [a.anoVigencia, 0]))
  );
  const [exportando, setExportando] = useState(false);

  const resultado = useMemo(() => {
    const incluidas = itens.map((i) => incluidos[i.id] ?? true);
    return calcularSimulacaoCompleta({
      cicloBase,
      divergenciasConfirmadas: itens.map((i) => i.dominio),
      incluidas,
      anosAnteriores,
      selicPorAno,
    });
  }, [itens, incluidos, cicloBase, anosAnteriores, selicPorAno]);

  const honorarioProjetadoCentavos = Math.round(
    (resultado.economiaAnualCentavos + resultado.creditoRetroativoCentavos) * (percentualExito / 100)
  );

  async function exportarPdf() {
    setExportando(true);
    try {
      const incluidasIds = itens.filter((i) => incluidos[i.id] ?? true).map((i) => i.id);
      const resposta = await fetch(`/ciclos/${cicloId}/simulador/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incluidasIds, selicPorAno }),
      });
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proposta-fap-${cicloBase.anoVigencia}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Divergências confirmadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma divergência confirmada neste ciclo ainda.</p>
          ) : null}
          {itens.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 rounded-md border p-2 text-sm hover:bg-muted/40"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={incluidos[item.id] ?? true}
                onChange={(e) => setIncluidos((atual) => ({ ...atual, [item.id]: e.target.checked }))}
              />
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary">{item.codigo}</span>
                  <SeveridadeBadge severidade={item.severidade} />
                </span>
                <span className="mt-0.5 block text-muted-foreground">{item.titulo}</span>
              </span>
              <Num className="whitespace-nowrap font-medium">{formatBRLFromCentavos(item.impactoEstimadoCentavos)}</Num>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">FAP atual</p>
              <Num className="text-2xl font-semibold">{formatFapFromDecimal(cicloBase.fapAtual)}</Num>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">FAP simulado</p>
              <Num className="text-2xl font-semibold text-success">{formatFapFromDecimal(resultado.fapSimulado)}</Num>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Economia anual</p>
              <Num className="text-2xl font-semibold text-success">
                {formatBRLFromCentavos(resultado.economiaAnualCentavos)}
              </Num>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Honorário projetado</p>
              <Num className="text-2xl font-semibold">{formatBRLFromCentavos(honorarioProjetadoCentavos)}</Num>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crédito retroativo por ano</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Ano</th>
                  <th className="px-4 py-2 font-medium">FAP à época</th>
                  <th className="px-4 py-2 font-medium">FAP corrigido (est.)</th>
                  <th className="px-4 py-2 font-medium">SELIC acumulada (%)</th>
                  <th className="px-4 py-2 text-right font-medium">Valor corrigido</th>
                </tr>
              </thead>
              <tbody>
                {resultado.detalheCiclosAnteriores.map((linha, i) => (
                  <tr key={linha.anoVigencia} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <Num>{linha.anoVigencia}</Num>
                      {!anosAnteriores[i]?.origemReal ? (
                        <span className="ml-1 text-xs text-muted-foreground">(estimado)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      <Num>{formatFapFromDecimal(linha.fapAtual)}</Num>
                    </td>
                    <td className="px-4 py-2">
                      <Num>{formatFapFromDecimal(linha.fapSimulado)}</Num>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8 w-24 rounded-md border border-input bg-background px-2 font-mono text-sm tabular-nums"
                        value={(selicPorAno[linha.anoVigencia] ?? 0) * 100}
                        onChange={(e) =>
                          setSelicPorAno((atual) => ({
                            ...atual,
                            [linha.anoVigencia]: Number(e.target.value) / 100,
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Num className="font-medium">{formatBRLFromCentavos(linha.valorCorrigidoCentavos)}</Num>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between border-t px-4 py-3">
              <span className="text-sm font-medium">Crédito retroativo total</span>
              <Num className="font-semibold text-success">
                {formatBRLFromCentavos(resultado.creditoRetroativoCentavos)}
              </Num>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-xs text-muted-foreground">Total geral (economia anual + crédito retroativo)</p>
              <Num className="text-xl font-semibold text-success">
                {formatBRLFromCentavos(resultado.economiaAnualCentavos + resultado.creditoRetroativoCentavos)}
              </Num>
            </div>
            <Button onClick={exportarPdf} disabled={exportando}>
              {exportando ? 'Gerando...' : 'Exportar proposta em PDF'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
