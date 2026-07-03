import { describe, expect, it } from 'vitest';
import { percentileRank } from '../src/domain/fap/percentile.js';
import { calcularIndiceFrequencia } from '../src/domain/fap/frequency.js';
import { calcularIndiceGravidade } from '../src/domain/fap/gravity.js';
import { calcularIndiceCusto } from '../src/domain/fap/cost.js';
import { calcularTaxaRotatividade, aplicarAjusteRotatividade } from '../src/domain/fap/turnover.js';
import { bloqueiaBonificacao, aplicarBloqueioBonificacao } from '../src/domain/fap/bonusLock.js';
import { calcularContribuicaoRatAjustada } from '../src/domain/fap/contribution.js';
import { calcularFap, FAP_MAXIMO, FAP_MINIMO } from '../src/domain/fap/calculateFap.js';
import type { DadosEstabelecimento, DadosPeerGroup, Ocorrencia } from '../src/domain/fap/types.js';

describe('percentileRank', () => {
  it('retorna 0.5 para lista de pares vazia', () => {
    expect(percentileRank(10, [])).toBe(0.5);
  });

  it('calcula percentil pelo rank medio considerando empates', () => {
    // [1, 2, 2, 3]: valor 2 -> 1 menor, 2 iguais -> (1 + 2/2) / 4 = 0.5
    expect(percentileRank(2, [1, 2, 2, 3])).toBeCloseTo(0.5);
    expect(percentileRank(0, [1, 2, 2, 3])).toBe(0);
    expect(percentileRank(4, [1, 2, 2, 3])).toBe(1);
  });
});

describe('indices', () => {
  const ocorrencias: Ocorrencia[] = [
    { id: '1', matricula: 'm1', nit: 'n1', tipo: 'CAT', desfecho: 'afastamento_superior_15_dias', valorBeneficioPago: 0 },
    { id: '2', matricula: 'm2', nit: 'n2', tipo: 'NTEP', desfecho: 'sem_afastamento_relevante', valorBeneficioPago: 0 },
    { id: '3', matricula: 'm3', nit: 'n3', tipo: 'B91', desfecho: 'afastamento_superior_15_dias', valorBeneficioPago: 1000 },
    { id: '4', matricula: 'm4', nit: 'n4', tipo: 'B31', desfecho: 'sem_afastamento_relevante', valorBeneficioPago: 500 },
  ];

  it('frequencia conta apenas CAT e NTEP', () => {
    expect(calcularIndiceFrequencia(ocorrencias)).toBe(2);
  });

  it('gravidade soma os pesos por desfecho', () => {
    // dois afastamentos > 15 dias (0.5 cada) + um sem afastamento relevante (0)
    expect(calcularIndiceGravidade(ocorrencias)).toBeCloseTo(1.0);
  });

  it('custo soma apenas beneficios B91-B94', () => {
    expect(calcularIndiceCusto(ocorrencias)).toBe(1000);
  });

  it('morte e invalidez pesam mais que afastamento simples', () => {
    const morte = calcularIndiceGravidade([{ desfecho: 'morte' }]);
    const invalidez = calcularIndiceGravidade([{ desfecho: 'invalidez_permanente' }]);
    const afastamento = calcularIndiceGravidade([{ desfecho: 'afastamento_superior_15_dias' }]);
    expect(morte).toBeGreaterThan(afastamento);
    expect(invalidez).toBeGreaterThan(afastamento);
  });
});

describe('rotatividade', () => {
  it('nao aplica trava quando rotatividade esta dentro do limite', () => {
    const taxa = calcularTaxaRotatividade(5, 5, 100);
    expect(taxa).toBeCloseTo(0.05);
    const { indiceAjustado, travaAplicada } = aplicarAjusteRotatividade(10, taxa);
    expect(travaAplicada).toBe(false);
    expect(indiceAjustado).toBe(10);
  });

  it('aplica trava quando rotatividade excede o limite', () => {
    const taxa = calcularTaxaRotatividade(90, 90, 100); // 0.9 > 0.75
    const { indiceAjustado, travaAplicada } = aplicarAjusteRotatividade(10, taxa);
    expect(travaAplicada).toBe(true);
    expect(indiceAjustado).toBeGreaterThan(10);
  });

  it('numero medio de vinculos zero nao gera divisao por zero', () => {
    expect(calcularTaxaRotatividade(1, 1, 0)).toBe(0);
  });
});

describe('bloqueio de bonificacao', () => {
  it('bloqueia quando ha morte no periodo', () => {
    const { bloqueado, motivos } = bloqueiaBonificacao([{ desfecho: 'morte' }]);
    expect(bloqueado).toBe(true);
    expect(motivos.length).toBeGreaterThan(0);
  });

  it('nao bloqueia quando ha excecao judicial', () => {
    const { bloqueado } = bloqueiaBonificacao([{ desfecho: 'morte' }], { possuiExcecaoJudicial: true });
    expect(bloqueado).toBe(false);
  });

  it('forca FAP minimo de 1.0 quando bloqueado', () => {
    expect(aplicarBloqueioBonificacao(0.6, true)).toBe(1.0);
    expect(aplicarBloqueioBonificacao(1.4, true)).toBe(1.4);
    expect(aplicarBloqueioBonificacao(0.6, false)).toBe(0.6);
  });
});

describe('calcularContribuicaoRatAjustada', () => {
  it('multiplica folha x aliquota x fap', () => {
    expect(calcularContribuicaoRatAjustada(100000, 2, 1.5)).toBeCloseTo(3000);
  });
});

describe('calcularFap (fluxo completo)', () => {
  const peerGroup: DadosPeerGroup = {
    cnaeSubclasse: '10.11-2',
    frequencias: [0, 1, 2, 3, 4, 5],
    gravidades: [0, 0.5, 1, 1.5, 2],
    custos: [0, 1000, 2000, 5000, 10000],
  };
  const periodo = { inicio: new Date('2023-01-01'), fim: new Date('2024-12-31') };

  it('resultado fica sempre entre 0.5 e 2.0', () => {
    const estabelecimento: DadosEstabelecimento = {
      cnpj: '00.000.000/0001-00',
      cnaeSubclasse: { codigo: '10.11-2', aliquotaRat: 2 },
      numeroMedioVinculos: 50,
      admissoes: 5,
      rescisoes: 5,
      ocorrencias: [],
    };

    const resultado = calcularFap(estabelecimento, peerGroup, periodo);
    expect(resultado.fapFinal).toBeGreaterThanOrEqual(FAP_MINIMO);
    expect(resultado.fapFinal).toBeLessThanOrEqual(FAP_MAXIMO);
  });

  it('bloqueia bonificacao quando ha morte, mesmo com bons indices relativos', () => {
    const estabelecimento: DadosEstabelecimento = {
      cnpj: '00.000.000/0001-00',
      cnaeSubclasse: { codigo: '10.11-2', aliquotaRat: 2 },
      numeroMedioVinculos: 50,
      admissoes: 5,
      rescisoes: 5,
      ocorrencias: [
        { id: '1', matricula: 'm1', nit: 'n1', tipo: 'CAT', desfecho: 'morte', valorBeneficioPago: 0 },
      ],
    };

    const resultado = calcularFap(estabelecimento, peerGroup, periodo);
    expect(resultado.bloqueioBonificacaoAplicado).toBe(true);
    expect(resultado.fapFinal).toBeGreaterThanOrEqual(1.0);
  });

  it('excecao judicial libera a bonificacao mesmo com morte registrada', () => {
    const estabelecimento: DadosEstabelecimento = {
      cnpj: '00.000.000/0001-00',
      cnaeSubclasse: { codigo: '10.11-2', aliquotaRat: 2 },
      numeroMedioVinculos: 50,
      admissoes: 5,
      rescisoes: 5,
      ocorrencias: [
        { id: '1', matricula: 'm1', nit: 'n1', tipo: 'CAT', desfecho: 'morte', valorBeneficioPago: 0 },
      ],
    };

    const resultado = calcularFap(estabelecimento, peerGroup, periodo, {
      possuiExcecaoJudicialBloqueioBonificacao: true,
    });
    expect(resultado.bloqueioBonificacaoAplicado).toBe(false);
  });
});
