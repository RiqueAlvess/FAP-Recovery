import { describe, expect, it } from 'vitest';
import {
  LIMITE_CARACTERES_CONTESTACAO,
  dentroDoPrazoPrescricional,
  dentroDoPrazoRecurso,
  estaDentroDaJanelaContestacao,
  indiceVigenteDuranteContestacao,
  janelaContestacao,
  prazoFinalRecurso,
} from '../src/domain/contestation/rules.js';
import { gerarMinutaContestacao } from '../src/domain/contestation/draft.js';

describe('janela de contestacao', () => {
  it('vai de 1 a 30 de novembro do ano-base', () => {
    const { inicio, fim } = janelaContestacao(2025);
    expect(inicio.getUTCMonth()).toBe(10); // novembro (0-indexed)
    expect(inicio.getUTCDate()).toBe(1);
    expect(fim.getUTCMonth()).toBe(10);
    expect(fim.getUTCDate()).toBe(30);
  });

  it('estaDentroDaJanelaContestacao valida datas dentro e fora da janela', () => {
    expect(estaDentroDaJanelaContestacao(new Date('2025-11-15T12:00:00Z'), 2025)).toBe(true);
    expect(estaDentroDaJanelaContestacao(new Date('2025-12-01T00:00:00Z'), 2025)).toBe(false);
    expect(estaDentroDaJanelaContestacao(new Date('2025-10-31T23:59:59Z'), 2025)).toBe(false);
  });
});

describe('prazo de recurso', () => {
  it('recurso vence 30 dias apos a publicacao do resultado', () => {
    const publicacao = new Date('2026-01-01T00:00:00Z');
    const prazo = prazoFinalRecurso(publicacao);
    expect(prazo.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('dentroDoPrazoRecurso respeita o limite de 30 dias', () => {
    const publicacao = new Date('2026-01-01T00:00:00Z');
    expect(dentroDoPrazoRecurso(new Date('2026-01-31T00:00:00Z'), publicacao)).toBe(true);
    expect(dentroDoPrazoRecurso(new Date('2026-02-01T00:00:01Z'), publicacao)).toBe(false);
  });
});

describe('prescricao da recuperacao retroativa', () => {
  it('permite recuperacao dentro de 5 anos', () => {
    const pagamento = new Date('2021-06-01T00:00:00Z');
    const hoje = new Date('2026-05-31T00:00:00Z');
    expect(dentroDoPrazoPrescricional(pagamento, hoje)).toBe(true);
  });

  it('bloqueia recuperacao apos 5 anos', () => {
    const pagamento = new Date('2021-06-01T00:00:00Z');
    const hoje = new Date('2026-06-02T00:00:00Z');
    expect(dentroDoPrazoPrescricional(pagamento, hoje)).toBe(false);
  });
});

describe('efeito da contestacao', () => {
  it('nao tem efeito suspensivo: indice permanece vigente ate o julgamento', () => {
    expect(indiceVigenteDuranteContestacao()).toBe(true);
  });
});

describe('gerarMinutaContestacao', () => {
  it('nunca excede o limite de caracteres', () => {
    const itens = Array.from({ length: 200 }, (_, i) => ({
      codigo: 'DIV-002',
      referencia: `nit-${i}`,
      detalhe: `Detalhe bem extenso da divergencia numero ${i} explicando o motivo do questionamento perante o INSS`,
    }));

    const minuta = gerarMinutaContestacao(itens);
    expect(minuta.length).toBeLessThanOrEqual(LIMITE_CARACTERES_CONTESTACAO);
  });

  it('inclui todos os itens quando cabem dentro do limite', () => {
    const itens = [
      { codigo: 'DIV-001', referencia: 'ref-1', detalhe: 'CAT duplicada encontrada' },
      { codigo: 'DIV-004', referencia: 'ref-2', detalhe: 'Beneficio fora do periodo-base' },
    ];
    const minuta = gerarMinutaContestacao(itens);
    expect(minuta).toContain('DIV-001');
    expect(minuta).toContain('DIV-004');
    expect(minuta.length).toBeLessThanOrEqual(LIMITE_CARACTERES_CONTESTACAO);
  });
});
