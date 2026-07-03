import { describe, expect, it } from 'vitest';
import { LIMITE_CARACTERES_CONTESTACAO } from '../src/domain/contestation/index.js';
import { gerarMinutaContestacao } from '../src/domain/reconciliacao/minuta.js';
import type { DadosEmpresaParaMinuta, Divergencia, RegistroExtratoPlano } from '../src/domain/reconciliacao/types.js';

function registroExtrato(overrides: Partial<RegistroExtratoPlano> = {}): RegistroExtratoPlano {
  return {
    id: 'ext-1',
    tipo: 'CAT',
    nit: '123',
    nomeTrabalhador: 'Trabalhador Teste',
    especieBeneficio: null,
    dataInicio: null,
    dataFim: null,
    valorCentavos: 0,
    cid: null,
    ...overrides,
  };
}

function divergencia(overrides: Partial<Divergencia> = {}): Divergencia {
  return {
    codigo: 'DIV-001',
    registroExtratoId: 'ext-1',
    registroExtrato: registroExtrato(),
    registroInternoId: null,
    registroInterno: null,
    severidade: 'ALTA',
    impactoIndice: 'FREQUENCIA',
    impactoEstimadoCentavos: 0,
    status: 'CONFIRMADA',
    justificativa: 'Justificativa padrão de teste para a divergência encontrada no extrato oficial do FAP.',
    fundamentacaoLegal: 'Lei 10.666/2003, art. 10, c/c Resolução CNPS nº 1.316/2010.',
    ...overrides,
  };
}

const dadosEmpresa: DadosEmpresaParaMinuta = {
  razaoSocial: 'Construtora Horizonte Sul Ltda.',
  cnpj: '12.345.678/0001-90',
  cnaeSubclasse: '41.20-4-00',
  anoVigencia: 2025,
};

describe('gerarMinutaContestacao', () => {
  it('inclui todas as divergências quando cabem no limite, com cabeçalho e pedido', () => {
    const divergencias = [
      divergencia({ codigo: 'DIV-001', impactoEstimadoCentavos: 10_000 }),
      divergencia({ codigo: 'DIV-006', impactoEstimadoCentavos: 5_000 }),
    ];
    const minuta = gerarMinutaContestacao(divergencias, dadosEmpresa);

    expect(minuta).toContain('CONTESTAÇÃO');
    expect(minuta).toContain('DIV-001');
    expect(minuta).toContain('DIV-006');
    expect(minuta).toContain('DO PEDIDO');
    expect(minuta.length).toBeLessThanOrEqual(LIMITE_CARACTERES_CONTESTACAO);
  });

  it('nunca excede o limite de 5.000 caracteres', () => {
    const divergencias = Array.from({ length: 100 }, (_, i) =>
      divergencia({
        codigo: 'DIV-002',
        registroExtratoId: `ext-${i}`,
        registroExtrato: registroExtrato({ id: `ext-${i}`, nomeTrabalhador: `Trabalhador Número ${i}` }),
        impactoEstimadoCentavos: 100_000 - i,
        justificativa:
          'Justificativa longa e detalhada explicando o motivo da divergência encontrada, com referência ao registro correspondente e ao contexto fático completo da apuração do índice FAP.',
      })
    );

    const minuta = gerarMinutaContestacao(divergencias, dadosEmpresa);
    expect(minuta.length).toBeLessThanOrEqual(LIMITE_CARACTERES_CONTESTACAO);
  });

  it('quando estoura o limite, prioriza por impactoEstimadoCentavos desc e avisa quais ficaram de fora', () => {
    const divergencias = Array.from({ length: 100 }, (_, i) =>
      divergencia({
        codigo: `DIV-00${(i % 9) + 1}`,
        registroExtratoId: `ext-${i}`,
        registroExtrato: registroExtrato({ id: `ext-${i}`, nomeTrabalhador: `Trabalhador Número ${i}` }),
        // maior índice => menor impacto, então o primeiro (i=0) é o de maior prioridade
        impactoEstimadoCentavos: 100_000 - i,
        justificativa:
          'Justificativa longa e detalhada explicando o motivo da divergência encontrada, com referência ao registro correspondente e ao contexto fático completo da apuração do índice FAP.',
      })
    );

    const minuta = gerarMinutaContestacao(divergencias, dadosEmpresa);

    // A divergência de maior impacto (i=0) deve estar incluída.
    expect(minuta).toContain('Trabalhador Número 0');
    // Alguma divergência de baixa prioridade (i=99, menor impacto) não deve constar no corpo.
    expect(minuta).not.toContain('Trabalhador Número 99');
    // O aviso de omissão deve estar presente.
    expect(minuta).toContain('não incluída');
    expect(minuta.length).toBeLessThanOrEqual(LIMITE_CARACTERES_CONTESTACAO);
  });

  it('sem divergências confirmadas, gera minuta com aviso de corpo vazio', () => {
    const minuta = gerarMinutaContestacao([], dadosEmpresa);
    expect(minuta).toContain('nenhuma divergência confirmada');
    expect(minuta.length).toBeLessThanOrEqual(LIMITE_CARACTERES_CONTESTACAO);
  });
});
