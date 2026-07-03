import { describe, expect, it } from 'vitest';
import { calcularImpacto, calcularTotaisIndiceAtual } from '../src/domain/reconciliacao/impacto.js';
import type { ContextoCicloFap, Divergencia, RegistroExtratoPlano } from '../src/domain/reconciliacao/types.js';

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
    status: 'DETECTADA',
    justificativa: 'teste',
    fundamentacaoLegal: 'teste',
    ...overrides,
  };
}

const contextoBase: ContextoCicloFap = {
  folhaAnualCentavos: 900_000_000, // R$ 9.000.000,00/ano
  aliquotaRat: 3,
  fapAtual: 1.2,
  indiceFrequenciaAtual: 0.6,
  indiceGravidadeAtual: 0.6,
  indiceCustoAtual: 0.6,
  totaisAtuais: { frequencia: 10, gravidade: 5, custo: 1_000_000 },
};

describe('calcularImpacto', () => {
  it('retorna 0 quando o total bruto do índice afetado é 0 (sem base para proporção)', () => {
    const d = divergencia({ impactoIndice: 'FREQUENCIA' });
    const contexto: ContextoCicloFap = { ...contextoBase, totaisAtuais: { frequencia: 0, gravidade: 0, custo: 0 } };
    expect(calcularImpacto(d, contexto)).toBe(0);
  });

  it('produz impacto positivo para uma divergência de frequência (CAT removida)', () => {
    const d = divergencia({ impactoIndice: 'FREQUENCIA', registroExtrato: registroExtrato({ tipo: 'CAT' }) });
    expect(calcularImpacto(d, contextoBase)).toBeGreaterThan(0);
  });

  it('produz impacto maior para uma divergência de custo com valor mais alto', () => {
    const dBaixo = divergencia({
      impactoIndice: 'CUSTO',
      registroExtrato: registroExtrato({ tipo: 'BENEFICIO', especieBeneficio: 'B91', valorCentavos: 50_000 }),
    });
    const dAlto = divergencia({
      impactoIndice: 'CUSTO',
      registroExtrato: registroExtrato({ tipo: 'BENEFICIO', especieBeneficio: 'B91', valorCentavos: 500_000 }),
    });
    expect(calcularImpacto(dAlto, contextoBase)).toBeGreaterThan(calcularImpacto(dBaixo, contextoBase));
  });

  it('fatorConservador reduz proporcionalmente a estimativa', () => {
    const d = divergencia({
      impactoIndice: 'CUSTO',
      registroExtrato: registroExtrato({ tipo: 'BENEFICIO', especieBeneficio: 'B91', valorCentavos: 200_000 }),
    });
    const impactoPadrao = calcularImpacto(d, contextoBase);
    const impactoConservador = calcularImpacto(d, { ...contextoBase, fatorConservador: 0.1 });
    expect(impactoConservador).toBeLessThan(impactoPadrao);
  });

  it('nunca retorna valor negativo', () => {
    const d = divergencia({ impactoIndice: 'GRAVIDADE', registroExtrato: registroExtrato({ tipo: 'VINCULO' }) });
    expect(calcularImpacto(d, contextoBase)).toBeGreaterThanOrEqual(0);
  });
});

describe('calcularTotaisIndiceAtual', () => {
  it('soma frequência (CATs), gravidade (pesos por espécie) e custo (valorCentavos dos benefícios)', () => {
    const registros: RegistroExtratoPlano[] = [
      registroExtrato({ tipo: 'CAT' }),
      registroExtrato({ tipo: 'CAT' }),
      registroExtrato({ tipo: 'BENEFICIO', especieBeneficio: 'B92', valorCentavos: 300_000 }),
      registroExtrato({ tipo: 'BENEFICIO', especieBeneficio: 'B91', valorCentavos: 100_000 }),
      registroExtrato({ tipo: 'VINCULO' }),
    ];

    const totais = calcularTotaisIndiceAtual(registros);

    expect(totais.frequencia).toBe(2);
    expect(totais.custo).toBe(400_000);
    expect(totais.gravidade).toBeGreaterThan(0);
  });

  it('retorna zeros para lista vazia', () => {
    expect(calcularTotaisIndiceAtual([])).toEqual({ frequencia: 0, gravidade: 0, custo: 0 });
  });
});
