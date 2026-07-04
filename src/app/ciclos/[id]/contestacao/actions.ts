'use server';

import { revalidatePath } from 'next/cache';
import {
  gerarOuAtualizarContestacaoDoCiclo,
  marcarContestacaoProtocolada,
  salvarMinutaEditada,
} from '@/lib/reconciliacao-service';

export async function regenerarMinutaAction(cicloId: string) {
  const resultado = await gerarOuAtualizarContestacaoDoCiclo(cicloId);
  revalidatePath(`/ciclos/${cicloId}/contestacao`);
  revalidatePath(`/ciclos/${cicloId}/reconciliacao`);
  return resultado;
}

export async function salvarMinutaAction(cicloId: string, contestacaoId: string, texto: string) {
  await salvarMinutaEditada(contestacaoId, texto);
  revalidatePath(`/ciclos/${cicloId}/contestacao`);
}

export async function marcarProtocoladaAction(cicloId: string, contestacaoId: string, texto: string) {
  await marcarContestacaoProtocolada(contestacaoId, cicloId, texto);
  revalidatePath(`/ciclos/${cicloId}/contestacao`);
  revalidatePath(`/ciclos/${cicloId}/reconciliacao`);
  revalidatePath('/dashboard');
}
