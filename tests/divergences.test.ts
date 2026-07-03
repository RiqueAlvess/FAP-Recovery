import { describe, expect, it } from 'vitest';
import { CATALOGO_DIVERGENCIAS, buscarDivergenciaPorCodigo } from '../src/domain/divergences/catalog.js';
import {
  detectarAposentadoriaEspecialIndevida,
  detectarBeneficioDeOutroEstabelecimento,
  detectarBeneficioForaDoPeriodo,
  detectarBeneficioSemVinculo,
  detectarCatsDuplicadas,
  detectarMassaSalarialDivergente,
  detectarNtepIndevido,
  detectarNumeroMedioVinculosDivergente,
  detectarObitoNaoAcidentario,
  detectarRotatividadeDivergente,
  detectarTodasDivergencias,
} from '../src/domain/divergences/detectors.js';
import type { ExtratoFap, DadosInternosEmpresa } from '../src/domain/divergences/types.js';

describe('catalogo de divergencias', () => {
  it('possui exatamente os 10 codigos DIV-001 a DIV-010', () => {
    const codigos = CATALOGO_DIVERGENCIAS.map((d) => d.codigo);
    expect(codigos).toEqual([
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

  it('cada entrada tem fundamentacao legal e evidencia necessaria', () => {
    for (const divergencia of CATALOGO_DIVERGENCIAS) {
      expect(divergencia.fundamentacaoLegal.length).toBeGreaterThan(0);
      expect(divergencia.evidenciaNecessaria.length).toBeGreaterThan(0);
      expect(divergencia.impactoNoIndice.length).toBeGreaterThan(0);
    }
  });

  it('busca por codigo retorna undefined para codigo inexistente', () => {
    expect(buscarDivergenciaPorCodigo('DIV-999')).toBeUndefined();
    expect(buscarDivergenciaPorCodigo('DIV-001')?.descricao).toBe('CAT duplicada');
  });
});

describe('detectores', () => {
  it('DIV-001: identifica CAT duplicada por matricula + data', () => {
    const encontradas = detectarCatsDuplicadas([
      { matricula: 'm1', dataAcidente: new Date('2023-05-01') },
      { matricula: 'm1', dataAcidente: new Date('2023-05-01') },
      { matricula: 'm2', dataAcidente: new Date('2023-05-01') },
    ]);
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-001');
  });

  it('DIV-002: identifica beneficio sem vinculo na empresa', () => {
    const encontradas = detectarBeneficioSemVinculo(
      [
        {
          nit: 'nit-1',
          especie: 'B91',
          dataInicio: new Date('2023-01-01'),
          valorPago: 100,
          cnpjVinculo: 'cnpj-a',
        },
      ],
      [{ nit: 'nit-2', matricula: 'm2', dataAdmissao: new Date('2020-01-01') }]
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-002');
  });

  it('DIV-003: identifica NTEP indevido quando CID sem nexo e ha laudo que afasta', () => {
    const encontradas = detectarNtepIndevido(
      [
        {
          nit: 'nit-1',
          matricula: 'm1',
          especie: 'B91',
          cid: 'Z00',
          dataInicio: new Date('2023-01-01'),
          valorPago: 100,
          cnpjVinculo: 'cnpj-a',
        },
      ],
      new Set(['M54']), // CIDs com nexo conhecido para o CNAE
      new Set(['m1'])
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-003');
  });

  it('DIV-004: identifica beneficio com data fora do periodo-base', () => {
    const encontradas = detectarBeneficioForaDoPeriodo(
      [
        {
          nit: 'nit-1',
          especie: 'B91',
          dataInicio: new Date('2019-01-01'),
          valorPago: 100,
          cnpjVinculo: 'cnpj-a',
        },
      ],
      { inicio: new Date('2022-01-01'), fim: new Date('2023-12-31') }
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-004');
  });

  it('DIV-005: identifica B46 de trabalhador desligado antes do periodo-base', () => {
    const encontradas = detectarAposentadoriaEspecialIndevida(
      [
        {
          nit: 'nit-1',
          especie: 'B46',
          dataInicio: new Date('2023-01-01'),
          valorPago: 100,
          cnpjVinculo: 'cnpj-a',
        },
      ],
      [{ nit: 'nit-1', matricula: 'm1', dataAdmissao: new Date('2010-01-01'), dataRescisao: new Date('2020-01-01') }],
      { inicio: new Date('2022-01-01'), fim: new Date('2023-12-31') }
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-005');
  });

  it('DIV-006: identifica massa salarial divergente acima da tolerancia', () => {
    const encontradas = detectarMassaSalarialDivergente(
      { cnpjEstabelecimento: 'cnpj-a', massaSalarialDeclaradaNoExtrato: 120000 },
      100000
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-006');
  });

  it('DIV-007: identifica numero medio de vinculos divergente', () => {
    const encontradas = detectarNumeroMedioVinculosDivergente(
      { cnpjEstabelecimento: 'cnpj-a', numeroMedioVinculosNoExtrato: 50 },
      45
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-007');
  });

  it('DIV-008: identifica rotatividade calculada com admissoes/rescisoes incorretas', () => {
    const encontradas = detectarRotatividadeDivergente(
      { cnpjEstabelecimento: 'cnpj-a', admissoesNoExtrato: 10, rescisoesNoExtrato: 8 },
      7,
      8
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-008');
  });

  it('DIV-009: identifica beneficio de outro CNPJ do grupo', () => {
    const encontradas = detectarBeneficioDeOutroEstabelecimento(
      [
        {
          nit: 'nit-1',
          especie: 'B91',
          dataInicio: new Date('2023-01-01'),
          valorPago: 100,
          cnpjVinculo: 'cnpj-b',
        },
      ],
      'cnpj-a'
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-009');
  });

  it('DIV-010: identifica pensao por morte sem CAT correspondente', () => {
    const encontradas = detectarObitoNaoAcidentario(
      [
        {
          nit: 'nit-1',
          matricula: 'm1',
          especie: 'B93',
          dataInicio: new Date('2023-01-01'),
          valorPago: 100,
          cnpjVinculo: 'cnpj-a',
          resultouMorte: true,
        },
      ],
      []
    );
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0]?.codigo).toBe('DIV-010');
  });

  it('detectarTodasDivergencias agrega achados de todos os detectores', () => {
    const extrato: ExtratoFap = {
      cnpjEstabelecimento: 'cnpj-a',
      periodoBase: { inicio: new Date('2022-01-01'), fim: new Date('2023-12-31') },
      cats: [
        { matricula: 'm1', dataAcidente: new Date('2023-05-01') },
        { matricula: 'm1', dataAcidente: new Date('2023-05-01') },
      ],
      beneficios: [
        {
          nit: 'nit-sem-vinculo',
          especie: 'B91',
          dataInicio: new Date('2023-01-01'),
          valorPago: 100,
          cnpjVinculo: 'cnpj-a',
        },
      ],
      massaSalarialDeclaradaNoExtrato: 100000,
      numeroMedioVinculosNoExtrato: 50,
      admissoesNoExtrato: 5,
      rescisoesNoExtrato: 5,
    };
    const dadosInternos: DadosInternosEmpresa = {
      vinculos: [],
      massaSalarialFolha: 100000,
      admissoesRegistros: 5,
      rescisoesRegistros: 5,
    };

    const encontradas = detectarTodasDivergencias(extrato, dadosInternos);
    const codigos = new Set(encontradas.map((d) => d.codigo));
    expect(codigos.has('DIV-001')).toBe(true);
    expect(codigos.has('DIV-002')).toBe(true);
  });
});
