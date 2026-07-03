import { describe, expect, it } from 'vitest';
import { FAP_MINIMO } from '../src/domain/fap/index.js';
import { simularFap } from '../src/domain/reconciliacao/simulacao.js';
import type { CicloParaSimulacao, Divergencia, RegistroExtratoPlano } from '../src/domain/reconciliacao/types.js';

function registroExtrato(overrides: Partial<RegistroExtratoPlano> = {}): RegistroExtratoPlano {
  return {
    id: 'ext-1',
    tipo: 'BENEFICIO',
    nit: '123',
    nomeTrabalhador: 'Trabalhador Teste',
    especieBeneficio: 'B91',
    dataInicio: null,
    dataFim: null,
    valorCentavos: 500_000,
    cid: null,
    ...overrides,
  };
}

function divergencia(overrides: Partial<Divergencia> = {}): Divergencia {
  return {
    codigo: 'DIV-006',
    registroExtratoId: 'ext-1',
    registroExtrato: registroExtrato(),
    registroInternoId: null,
    registroInterno: null,
    severidade: 'MEDIA',
    impactoIndice: 'CUSTO',
    impactoEstimadoCentavos: 0,
    status: 'CONFIRMADA',
    justificativa: 'teste',
    fundamentacaoLegal: 'teste',
    ...overrides,
  };
}

const cicloBase: CicloParaSimulacao = {
  anoVigencia: 2025,
  folhaAnualCentavos: 900_000_000,
  aliquotaRat: 3,
  fapAtual: 1.2,
  indiceFrequenciaAtual: 0.6,
  indiceGravidadeAtual: 0.6,
  indiceCustoAtual: 0.6,
  totaisAtuais: { frequencia: 10, gravidade: 5, custo: 1_000_000 },
};

describe('simularFap', () => {
  it('sem divergências confirmadas, fapSimulado é igual ao fapAtual e economia é zero', () => {
    const resultado = simularFap(cicloBase, []);
    expect(resultado.fapSimulado).toBeCloseTo(cicloBase.fapAtual);
    expect(resultado.economiaAnualCentavos).toBe(0);
  });

  it('com divergências confirmadas, o FAP simulado cai e a economia anual é positiva', () => {
    const resultado = simularFap(cicloBase, [divergencia()]);
    expect(resultado.fapSimulado).toBeLessThan(cicloBase.fapAtual);
    expect(resultado.economiaAnualCentavos).toBeGreaterThan(0);
  });

  it('economiaAnualCentavos é consistente com folhaAnual × alíquota × (fapAtual - fapSimulado)', () => {
    const resultado = simularFap(cicloBase, [divergencia()]);
    const esperado = Math.round(
      cicloBase.folhaAnualCentavos * (cicloBase.aliquotaRat / 100) * (cicloBase.fapAtual - resultado.fapSimulado)
    );
    expect(resultado.economiaAnualCentavos).toBe(esperado);
  });

  it('fapSimulado nunca cai abaixo do piso regulatório (0,5)', () => {
    const muitasDivergencias = Array.from({ length: 50 }, (_, i) =>
      divergencia({
        registroExtratoId: `ext-${i}`,
        registroExtrato: registroExtrato({ id: `ext-${i}`, valorCentavos: 900_000 }),
      })
    );
    const resultado = simularFap(cicloBase, muitasDivergencias);
    expect(resultado.fapSimulado).toBeGreaterThanOrEqual(FAP_MINIMO);
  });

  it('sem ciclos anteriores, crédito retroativo é zero', () => {
    const resultado = simularFap(cicloBase, [divergencia()]);
    expect(resultado.creditoRetroativoCentavos).toBe(0);
    expect(resultado.ciclosConsiderados).toBe(0);
  });

  it('crédito retroativo aplica a taxa SELIC acumulada informada por ciclo anterior', () => {
    const cicloComAnteriores: CicloParaSimulacao = {
      ...cicloBase,
      ciclosAnteriores: [
        {
          anoVigencia: 2024,
          folhaAnualCentavos: 900_000_000,
          aliquotaRat: 3,
          fapAtual: 1.2,
          fapSimulado: 1.0,
          taxaSelicAcumulada: 0.1,
        },
      ],
    };
    const resultado = simularFap(cicloComAnteriores, []);
    const economiaCicloAnterior = 900_000_000 * 0.03 * (1.2 - 1.0);
    expect(resultado.creditoRetroativoCentavos).toBe(Math.round(economiaCicloAnterior * 1.1));
  });

  it('limita o crédito retroativo a 5 ciclos anteriores, mesmo se mais forem informados', () => {
    const seisCiclos = Array.from({ length: 6 }, (_, i) => ({
      anoVigencia: 2024 - i,
      folhaAnualCentavos: 900_000_000,
      aliquotaRat: 3 as const,
      fapAtual: 1.2,
      fapSimulado: 1.0,
      taxaSelicAcumulada: 0.05,
    }));
    const resultado = simularFap({ ...cicloBase, ciclosAnteriores: seisCiclos }, []);
    expect(resultado.ciclosConsiderados).toBe(5);
  });
});
