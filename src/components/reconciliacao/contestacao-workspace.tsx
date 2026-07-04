'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  marcarProtocoladaAction,
  regenerarMinutaAction,
  salvarMinutaAction,
} from '@/app/ciclos/[id]/contestacao/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Num } from '@/components/num';
import { LIMITE_CARACTERES_CONTESTACAO } from '@/domain/contestation';
import { formatDateBR } from '@/lib/format';

interface DivergenciaExcluida {
  codigo: string;
  titulo: string;
  referencia: string;
}

interface Props {
  cicloId: string;
  contestacaoId: string;
  textoInicial: string;
  protocoladaEm: Date | null;
  divergenciasExcluidasIniciais: DivergenciaExcluida[];
}

const LIMITE_VERDE = 4000;
const LIMITE_AMARELO = 4800;
const PLACEHOLDER_SEM_DIVERGENCIAS = '(nenhuma divergência confirmada informada)';

export function ContestacaoWorkspace({
  cicloId,
  contestacaoId,
  textoInicial,
  protocoladaEm,
  divergenciasExcluidasIniciais,
}: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState(textoInicial);
  const [salvando, setSalvando] = useState(false);
  const [protocolando, setProtocolando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [divergenciasExcluidas, setDivergenciasExcluidas] = useState(divergenciasExcluidasIniciais);
  const [copiado, setCopiado] = useState(false);

  const protocolada = protocoladaEm !== null;
  const semDivergenciasConfirmadas = texto.includes(PLACEHOLDER_SEM_DIVERGENCIAS);
  const tamanho = texto.length;
  const excedeLimite = tamanho > LIMITE_CARACTERES_CONTESTACAO;

  const corBarra = tamanho > LIMITE_AMARELO ? 'bg-destructive' : tamanho > LIMITE_VERDE ? 'bg-warning' : 'bg-success';
  const larguraBarra = Math.min((tamanho / LIMITE_CARACTERES_CONTESTACAO) * 100, 100);

  async function salvar() {
    setSalvando(true);
    try {
      await salvarMinutaAction(cicloId, contestacaoId, texto);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function regenerar() {
    if (!confirm('Regenerar a minuta a partir das divergências confirmadas atuais? As edições manuais serão substituídas.')) {
      return;
    }
    setRegenerando(true);
    try {
      const resultado = await regenerarMinutaAction(cicloId);
      setTexto(resultado.contestacao.textoMinuta);
      setDivergenciasExcluidas(resultado.divergenciasExcluidas);
    } finally {
      setRegenerando(false);
    }
  }

  async function protocolar() {
    if (excedeLimite) return;
    if (!confirm('Marcar esta contestação como protocolada? Isso grava a data de hoje e trava a edição.')) return;
    setProtocolando(true);
    try {
      await marcarProtocoladaAction(cicloId, contestacaoId, texto);
      router.refresh();
    } finally {
      setProtocolando(false);
    }
  }

  function copiar() {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function exportarTxt() {
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `minuta-contestacao-ciclo-${cicloId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {semDivergenciasConfirmadas ? (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="space-y-1 py-4 text-sm">
              <p className="font-medium text-warning">Esta minuta não tem nenhuma divergência confirmada.</p>
              <p className="text-muted-foreground">
                Volte para a{' '}
                <Link href={`/ciclos/${cicloId}/reconciliacao`} className="text-primary hover:underline">
                  reconciliação
                </Link>{' '}
                e confirme ao menos uma divergência antes de protocolar.
              </p>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Minuta de contestação</CardTitle>
            {protocolada ? (
              <span className="text-xs font-medium text-success">Protocolada em {formatDateBR(protocoladaEm!)}</span>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              readOnly={protocolada}
              rows={22}
              className="font-mono text-xs"
            />
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={excedeLimite ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                  <Num>{tamanho}</Num> / <Num>{LIMITE_CARACTERES_CONTESTACAO}</Num> caracteres
                  {excedeLimite ? ' — excede o limite, não é possível salvar ou protocolar' : ''}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full transition-all ${corBarra}`} style={{ width: `${larguraBarra}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {divergenciasExcluidas.length > 0 ? (
          <Card className="border-warning/40 bg-warning/5">
            <CardHeader>
              <CardTitle className="text-sm text-warning">Divergências fora da minuta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">
                {divergenciasExcluidas.length} divergência(s) confirmada(s) não couberam no limite de{' '}
                {LIMITE_CARACTERES_CONTESTACAO} caracteres:
              </p>
              <ul className="space-y-1 text-xs">
                {divergenciasExcluidas.map((d) => (
                  <li key={`${d.codigo}-${d.referencia}`}>
                    <span className="font-mono text-primary">{d.codigo}</span> — {d.titulo}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full" onClick={copiar}>
              {copiado ? 'Copiado!' : 'Copiar para a área de transferência'}
            </Button>
            <Button variant="outline" className="w-full" onClick={exportarTxt}>
              Exportar .txt
            </Button>
            {!protocolada ? (
              <>
                <Button variant="outline" className="w-full" disabled={regenerando} onClick={regenerar}>
                  {regenerando ? 'Regenerando...' : 'Regenerar minuta'}
                </Button>
                <Button className="w-full" disabled={salvando || excedeLimite} onClick={salvar}>
                  {salvando ? 'Salvando...' : 'Salvar edição'}
                </Button>
                <Button className="w-full" disabled={protocolando || excedeLimite} onClick={protocolar}>
                  {protocolando ? 'Protocolando...' : 'Marcar como protocolada'}
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
