/** Formatação BR (CLAUDE.md): R$ 1.234,56 / dd/mm/aaaa / CNPJ mascarado / FAP com 4 decimais. */

export function formatBRLFromCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateBR(data: Date | string): string {
  const valor = typeof data === 'string' ? new Date(data) : data;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(valor);
}

/** FAP armazenado como Int × 10000 (ex.: 11850 => "1,1850"). */
export function formatFapFromInt(fapInt: number): string {
  return (fapInt / 10_000).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function formatFapFromDecimal(fap: number): string {
  return fap.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/** Aceita CNPJ com ou sem máscara; sempre retorna 00.000.000/0000-00. */
export function formatCNPJ(cnpj: string): string {
  const digitos = cnpj.replace(/\D/g, '').padStart(14, '0').slice(-14);
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
}

/** CNPJ raiz (8 dígitos, sem filial/DV): sempre retorna 00.000.000. */
export function formatCnpjRaiz(cnpjRaiz: string): string {
  const digitos = cnpjRaiz.replace(/\D/g, '').padStart(8, '0').slice(-8);
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}`;
}

export function formatPercentInt(percentual: number): string {
  return `${percentual}%`;
}

export function formatPercentual01(fracao: number): string {
  return `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}
