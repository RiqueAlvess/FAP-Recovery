'use server';

import { revalidatePath } from 'next/cache';
import {
  atualizarStatusDivergencia,
  executarGerarContestacaoDoCiclo,
  executarSimulacaoDoCiclo,
} from '@/lib/reconciliacao-service';
import type { StatusDivergencia } from '@/domain/enums';

export async function alterarStatusDivergenciaAction(
  cicloId: string,
  divergenciaId: string,
  status: StatusDivergencia,
  justificativaDescarte?: string
) {
  await atualizarStatusDivergencia(divergenciaId, status, justificativaDescarte);
  revalidatePath(`/ciclos/${cicloId}/reconciliacao`);
  revalidatePath('/dashboard');
}

export async function simularFapAction(cicloId: string) {
  return executarSimulacaoDoCiclo(cicloId);
}

export async function gerarContestacaoAction(cicloId: string) {
  const contestacao = await executarGerarContestacaoDoCiclo(cicloId);
  revalidatePath(`/ciclos/${cicloId}/reconciliacao`);
  revalidatePath('/dashboard');
  return contestacao;
}
