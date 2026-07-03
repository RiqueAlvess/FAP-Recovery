/** Formatação BR (ver CLAUDE.md): datas dd/mm/aaaa e moeda R$ 1.234,56 a partir de centavos. */

export function formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(data);
}

export function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
