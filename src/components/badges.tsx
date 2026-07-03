import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const ROTULOS_ESTAGIO: Record<string, string> = {
  PROSPECT: 'Prospect',
  DIAGNOSTICO: 'Diagnóstico',
  PROPOSTA: 'Proposta',
  CONTRATADO: 'Contratado',
  EM_ANALISE: 'Em análise',
  PROTOCOLADO: 'Protocolado',
  JULGADO: 'Julgado',
  FATURADO: 'Faturado',
};

const CLASSES_ESTAGIO: Record<string, string> = {
  PROSPECT: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  DIAGNOSTICO: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  PROPOSTA: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
  CONTRATADO: 'bg-primary/15 text-primary hover:bg-primary/15',
  EM_ANALISE: 'bg-warning/15 text-warning hover:bg-warning/15',
  PROTOCOLADO: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  JULGADO: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  FATURADO: 'bg-success/15 text-success hover:bg-success/15',
};

export function EstagioBadge({ estagio }: { estagio: string }) {
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium', CLASSES_ESTAGIO[estagio])}>
      {ROTULOS_ESTAGIO[estagio] ?? estagio}
    </Badge>
  );
}

const ROTULOS_SEVERIDADE: Record<string, string> = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };
const VARIANT_SEVERIDADE: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  ALTA: 'destructive',
  MEDIA: 'warning',
  BAIXA: 'secondary',
};

export function SeveridadeBadge({ severidade }: { severidade: string }) {
  return (
    <Badge variant={VARIANT_SEVERIDADE[severidade] ?? 'secondary'}>{ROTULOS_SEVERIDADE[severidade] ?? severidade}</Badge>
  );
}

const ROTULOS_STATUS_DIVERGENCIA: Record<string, string> = {
  DETECTADA: 'Detectada',
  CONFIRMADA: 'Confirmada',
  DESCARTADA: 'Descartada',
  EVIDENCIA_PENDENTE: 'Evidência pendente',
};
const VARIANT_STATUS_DIVERGENCIA: Record<string, 'secondary' | 'success' | 'destructive' | 'warning'> = {
  DETECTADA: 'secondary',
  CONFIRMADA: 'success',
  DESCARTADA: 'destructive',
  EVIDENCIA_PENDENTE: 'warning',
};

export function StatusDivergenciaBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT_STATUS_DIVERGENCIA[status] ?? 'secondary'}>
      {ROTULOS_STATUS_DIVERGENCIA[status] ?? status}
    </Badge>
  );
}

const ROTULOS_STATUS_CICLO: Record<string, string> = {
  IMPORTADO: 'Importado',
  RECONCILIADO: 'Reconciliado',
  CONTESTADO: 'Contestado',
  JULGADO: 'Julgado',
};
const VARIANT_STATUS_CICLO: Record<string, 'secondary' | 'success' | 'warning' | 'default'> = {
  IMPORTADO: 'secondary',
  RECONCILIADO: 'warning',
  CONTESTADO: 'default',
  JULGADO: 'success',
};

export function StatusCicloBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT_STATUS_CICLO[status] ?? 'secondary'}>{ROTULOS_STATUS_CICLO[status] ?? status}</Badge>;
}

const ROTULOS_CODIGO_DIV = 'DIV';

export function CodigoDivergenciaBadge({ codigo }: { codigo: string }) {
  return (
    <Badge variant="outline" className="border-primary/30 bg-primary/5 font-mono text-primary">
      {codigo.startsWith(ROTULOS_CODIGO_DIV) ? codigo : `DIV-${codigo}`}
    </Badge>
  );
}
