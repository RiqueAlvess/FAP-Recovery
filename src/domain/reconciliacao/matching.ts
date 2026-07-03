import type { RegistroExtratoPlano, RegistroInternoPlano } from './types.js';

const MARCAS_DIACRITICAS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Remove acentos, pontuacao e normaliza espacos/caixa para comparacao de nomes. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(MARCAS_DIACRITICAS, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Fuzzy simples sem lib externa: nomes iguais apos normalizacao, ou mesmo
 * primeiro nome + pelo menos mais um token em comum (cobre erros de
 * digitacao em sobrenomes do meio, abreviacoes, etc.).
 */
export function nomesSaoEquivalentes(a: string, b: string): boolean {
  const na = normalizarNome(a);
  const nb = normalizarNome(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const tokensA = na.split(' ');
  const tokensB = nb.split(' ');
  if (tokensA[0] !== tokensB[0]) return false;

  const tokensComuns = tokensA.filter((t) => tokensB.includes(t));
  return tokensComuns.length >= Math.min(2, tokensA.length, tokensB.length);
}

/**
 * Localiza o vinculo interno correspondente a um registro do extrato:
 * NIT e o criterio primario; nome normalizado e o fallback fuzzy.
 */
export function encontrarVinculoInterno(
  registro: Pick<RegistroExtratoPlano, 'nit' | 'nomeTrabalhador'>,
  internos: RegistroInternoPlano[]
): RegistroInternoPlano | null {
  if (registro.nit) {
    const porNit = internos.find((i) => i.nit === registro.nit);
    if (porNit) return porNit;
  }

  if (registro.nomeTrabalhador) {
    const porNome = internos.find(
      (i) => i.nomeTrabalhador && nomesSaoEquivalentes(i.nomeTrabalhador, registro.nomeTrabalhador!)
    );
    if (porNome) return porNome;
  }

  return null;
}

/** Chave usada para agrupar/identificar um mesmo trabalhador quando nao ha vinculo formal disponivel. */
export function chaveTrabalhador(nit: string | null, nomeTrabalhador: string | null): string | null {
  if (nit) return `nit:${nit}`;
  if (nomeTrabalhador) return `nome:${normalizarNome(nomeTrabalhador)}`;
  return null;
}
