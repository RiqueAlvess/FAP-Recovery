import { describe, expect, it } from 'vitest';
import { CATALOGO_DIVERGENCIAS, buscarDivergenciaPorCodigo } from '../src/domain/catalogo-divergencias.js';

describe('catálogo de divergências (DIV-001 a DIV-010)', () => {
  it('possui exatamente os 10 códigos, em ordem', () => {
    expect(CATALOGO_DIVERGENCIAS.map((d) => d.codigo)).toEqual([
      'DIV-001',
      'DIV-002',
      'DIV-003',
      'DIV-004',
      'DIV-005',
      'DIV-006',
      'DIV-007',
      'DIV-008',
      'DIV-009',
      'DIV-010',
    ]);
  });

  it('cada entrada tem título, fundamentação legal e evidências', () => {
    for (const entrada of CATALOGO_DIVERGENCIAS) {
      expect(entrada.titulo.length).toBeGreaterThan(0);
      expect(entrada.descricao.length).toBeGreaterThan(0);
      expect(entrada.fundamentacaoLegal.length).toBeGreaterThan(0);
      expect(entrada.evidenciaNecessaria.length).toBeGreaterThan(0);
      expect(['FREQUENCIA', 'GRAVIDADE', 'CUSTO', 'MULTIPLO']).toContain(entrada.impactoIndice);
      expect(['alta', 'media', 'baixa']).toContain(entrada.chanceExito);
    }
  });

  it('busca por código retorna undefined para código inexistente', () => {
    expect(buscarDivergenciaPorCodigo('DIV-999')).toBeUndefined();
    expect(buscarDivergenciaPorCodigo('DIV-001')?.titulo).toBe('CAT duplicada no extrato');
  });
});
