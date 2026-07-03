/**
 * Percentil pelo metodo de rank medio: empates contam meio ponto cada,
 * evitando que valores repetidos empurrem o percentil para os extremos.
 */
export function percentileRank(value: number, peerValues: number[]): number {
  if (peerValues.length === 0) return 0.5;

  let menores = 0;
  let iguais = 0;
  for (const v of peerValues) {
    if (v < value) menores += 1;
    else if (v === value) iguais += 1;
  }

  return (menores + iguais / 2) / peerValues.length;
}
