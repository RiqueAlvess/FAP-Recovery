'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

function textoOuNulo(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? '').trim();
  return texto.length > 0 ? texto : null;
}

export async function createCliente(formData: FormData) {
  const razaoSocial = textoOuNulo(formData.get('razaoSocial'));
  const cnpjRaiz = textoOuNulo(formData.get('cnpjRaiz'));
  if (!razaoSocial || !cnpjRaiz) {
    throw new Error('Razão social e CNPJ raiz são obrigatórios.');
  }

  const cliente = await prisma.cliente.create({
    data: {
      razaoSocial,
      cnpjRaiz,
      contatoNome: textoOuNulo(formData.get('contatoNome')),
      contatoEmail: textoOuNulo(formData.get('contatoEmail')),
      percentualExito: Number(formData.get('percentualExito')) || 25,
      estagio: textoOuNulo(formData.get('estagio')) ?? 'PROSPECT',
    },
  });

  revalidatePath('/clientes');
  redirect(`/clientes/${cliente.id}`);
}

export async function updateCliente(clienteId: string, formData: FormData) {
  await prisma.cliente.update({
    where: { id: clienteId },
    data: {
      razaoSocial: textoOuNulo(formData.get('razaoSocial')) ?? undefined,
      cnpjRaiz: textoOuNulo(formData.get('cnpjRaiz')) ?? undefined,
      contatoNome: textoOuNulo(formData.get('contatoNome')),
      contatoEmail: textoOuNulo(formData.get('contatoEmail')),
      percentualExito: Number(formData.get('percentualExito')) || 25,
      estagio: textoOuNulo(formData.get('estagio')) ?? 'PROSPECT',
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath('/clientes');
  revalidatePath('/dashboard');
}

export async function deleteCliente(clienteId: string) {
  await prisma.cliente.delete({ where: { id: clienteId } });
  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function createEstabelecimento(clienteId: string, formData: FormData) {
  const cnpj = textoOuNulo(formData.get('cnpj'));
  const cnaeSubclasse = textoOuNulo(formData.get('cnaeSubclasse'));
  if (!cnpj || !cnaeSubclasse) {
    throw new Error('CNPJ e CNAE são obrigatórios.');
  }

  await prisma.estabelecimento.create({
    data: {
      clienteId,
      cnpj,
      cnaeSubclasse,
      aliquotaRat: Number(formData.get('aliquotaRat')) || 1,
      folhaMediaMensalCentavos: Math.round((Number(formData.get('folhaMediaMensal')) || 0) * 100),
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

export async function deleteEstabelecimento(clienteId: string, estabelecimentoId: string) {
  await prisma.estabelecimento.delete({ where: { id: estabelecimentoId } });
  revalidatePath(`/clientes/${clienteId}`);
}

export async function createCicloFap(clienteId: string, estabelecimentoId: string, formData: FormData) {
  const fapDecimal = Number(formData.get('fapAtribuido'));
  await prisma.cicloFap.create({
    data: {
      estabelecimentoId,
      anoVigencia: Number(formData.get('anoVigencia')) || new Date().getFullYear(),
      fapAtribuido: Math.round((Number.isFinite(fapDecimal) ? fapDecimal : 1) * 10_000),
      indiceFrequencia: (Number(formData.get('indiceFrequencia')) || 0) / 100,
      indiceGravidade: (Number(formData.get('indiceGravidade')) || 0) / 100,
      indiceCusto: (Number(formData.get('indiceCusto')) || 0) / 100,
      status: 'IMPORTADO',
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath('/dashboard');
}
