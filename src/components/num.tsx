import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Todo valor numérico (moeda, FAP, percentuais, contadores) usa JetBrains Mono + tabular-nums (CLAUDE.md). */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{children}</span>;
}
