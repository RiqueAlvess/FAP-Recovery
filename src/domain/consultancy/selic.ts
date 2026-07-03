/** Taxa mensal da SELIC para um dado ano/mês (ex.: 0.0075 representa 0,75%). */
export type ProvedorTaxaSelic = (ano: number, mes: number) => number;

/** Corrige um valor pago no passado pela SELIC acumulada até a data de referência. */
export function corrigirValorPelaSelic(
  valorOriginal: number,
  dataPagamento: Date,
  dataReferencia: Date,
  obterTaxaMensal: ProvedorTaxaSelic
): number {
  let valorCorrigido = valorOriginal;
  const cursor = new Date(Date.UTC(dataPagamento.getUTCFullYear(), dataPagamento.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(dataReferencia.getUTCFullYear(), dataReferencia.getUTCMonth(), 1));

  while (cursor < fim) {
    const taxa = obterTaxaMensal(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1);
    valorCorrigido *= 1 + taxa;
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return valorCorrigido;
}
