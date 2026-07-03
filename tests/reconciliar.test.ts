import { describe, expect, it } from 'vitest';
import { reconciliar } from '../src/domain/reconciliacao/reconciliar.js';
import type { RegistroExtratoPlano, RegistroInternoPlano } from '../src/domain/reconciliacao/types.js';

function data(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

let contador = 0;
function proximoId(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${contador}`;
}

function extrato(overrides: Partial<RegistroExtratoPlano> = {}): RegistroExtratoPlano {
  return {
    id: proximoId('ext'),
    tipo: 'CAT',
    nit: null,
    nomeTrabalhador: null,
    especieBeneficio: null,
    dataInicio: null,
    dataFim: null,
    valorCentavos: 0,
    cid: null,
    ...overrides,
  };
}

function interno(overrides: Partial<RegistroInternoPlano> = {}): RegistroInternoPlano {
  return {
    id: proximoId('int'),
    tipo: 'VINCULO',
    nit: null,
    nomeTrabalhador: null,
    matricula: null,
    dataAdmissao: null,
    dataDesligamento: null,
    ...overrides,
  };
}

function possui(divergencias: ReturnType<typeof reconciliar>, codigo: string): boolean {
  return divergencias.some((d) => d.codigo === codigo);
}

describe('DIV-001 — CAT duplicada', () => {
  it('positivo: mesma matrícula/NIT e mesma data de acidente duas vezes', () => {
    const cats = [
      extrato({ tipo: 'CAT', nit: '111', dataInicio: data(2024, 3, 10) }),
      extrato({ tipo: 'CAT', nit: '111', dataInicio: data(2024, 3, 10) }),
    ];
    const resultado = reconciliar(cats, []);
    expect(possui(resultado, 'DIV-001')).toBe(true);
  });

  it('negativo: mesmo NIT mas datas diferentes não é duplicidade', () => {
    const cats = [
      extrato({ tipo: 'CAT', nit: '111', dataInicio: data(2024, 3, 10) }),
      extrato({ tipo: 'CAT', nit: '111', dataInicio: data(2024, 6, 1) }),
    ];
    const resultado = reconciliar(cats, []);
    expect(possui(resultado, 'DIV-001')).toBe(false);
  });
});

describe('DIV-002 — benefício sem vínculo', () => {
  it('positivo: NIT do benefício não existe nos registros internos', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '999', especieBeneficio: 'B91', valorCentavos: 100 })];
    const resultado = reconciliar(extratoRows, []);
    expect(possui(resultado, 'DIV-002')).toBe(true);
  });

  it('negativo: NIT do benefício existe como vínculo interno', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '222', especieBeneficio: 'B91', valorCentavos: 100 })];
    const internoRows = [interno({ tipo: 'VINCULO', nit: '222' })];
    const resultado = reconciliar(extratoRows, internoRows);
    expect(possui(resultado, 'DIV-002')).toBe(false);
  });
});

describe('DIV-003 — NTEP questionável (B91/B92 com CID de baixa plausibilidade)', () => {
  it('positivo: B91 com CID do capítulo F (transtorno mental)', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '333', especieBeneficio: 'B91', cid: 'F32.1' })];
    const resultado = reconciliar(extratoRows, []);
    expect(possui(resultado, 'DIV-003')).toBe(true);
  });

  it('negativo: B91 com CID musculoesquelético plausível para o CNAE', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '333', especieBeneficio: 'B91', cid: 'S82.9' })];
    const resultado = reconciliar(extratoRows, []);
    expect(possui(resultado, 'DIV-003')).toBe(false);
  });
});

describe('DIV-004 — registro fora do período-base', () => {
  it('positivo: CAT com data anterior ao período-base do ano de vigência informado', () => {
    const extratoRows = [extrato({ tipo: 'CAT', nit: '444', dataInicio: data(2020, 1, 5) })];
    const resultado = reconciliar(extratoRows, [], { anoVigencia: 2025 });
    expect(possui(resultado, 'DIV-004')).toBe(true);
  });

  it('negativo: CAT com data dentro do período-base', () => {
    const extratoRows = [extrato({ tipo: 'CAT', nit: '444', dataInicio: data(2023, 6, 15) })];
    const resultado = reconciliar(extratoRows, [], { anoVigencia: 2025 });
    expect(possui(resultado, 'DIV-004')).toBe(false);
  });
});

describe('DIV-005 — aposentadoria especial (B46) após desligamento anterior ao período-base', () => {
  it('positivo: trabalhador desligado antes do início do período-base', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '555', especieBeneficio: 'B46' })];
    const internoRows = [interno({ nit: '555', dataDesligamento: data(2022, 1, 1) })];
    const resultado = reconciliar(extratoRows, internoRows, { anoVigencia: 2025 });
    expect(possui(resultado, 'DIV-005')).toBe(true);
  });

  it('negativo: trabalhador ainda vinculado dentro do período-base', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '555', especieBeneficio: 'B46' })];
    const internoRows = [interno({ nit: '555', dataDesligamento: data(2024, 1, 1) })];
    const resultado = reconciliar(extratoRows, internoRows, { anoVigencia: 2025 });
    expect(possui(resultado, 'DIV-005')).toBe(false);
  });
});

describe('DIV-006 — massa salarial divergente', () => {
  it('positivo: massa salarial do extrato diverge da folha interna além da tolerância de 1%', () => {
    const extratoRows = [extrato({ tipo: 'MASSA_SALARIAL', valorCentavos: 900_000_000 })];
    const internoRows = [interno({ tipo: 'MASSA_SALARIAL', valorCentavos: 800_000_000 })];
    const resultado = reconciliar(extratoRows, internoRows);
    expect(possui(resultado, 'DIV-006')).toBe(true);
  });

  it('negativo: divergência dentro da tolerância de 1%', () => {
    const extratoRows = [extrato({ tipo: 'MASSA_SALARIAL', valorCentavos: 900_000_000 })];
    const internoRows = [interno({ tipo: 'MASSA_SALARIAL', valorCentavos: 899_000_000 })];
    const resultado = reconciliar(extratoRows, internoRows);
    expect(possui(resultado, 'DIV-006')).toBe(false);
  });
});

describe('DIV-007 — número de vínculos divergente', () => {
  it('positivo: contagem de vínculos do extrato diverge da interna', () => {
    const extratoRows = [
      extrato({ tipo: 'VINCULO' }),
      extrato({ tipo: 'VINCULO' }),
      extrato({ tipo: 'VINCULO' }),
      extrato({ tipo: 'VINCULO' }),
      extrato({ tipo: 'VINCULO' }),
    ];
    const internoRows = [interno({ tipo: 'VINCULO' }), interno({ tipo: 'VINCULO' }), interno({ tipo: 'VINCULO' })];
    const resultado = reconciliar(extratoRows, internoRows);
    expect(possui(resultado, 'DIV-007')).toBe(true);
  });

  it('negativo: contagens iguais', () => {
    const extratoRows = [extrato({ tipo: 'VINCULO' }), extrato({ tipo: 'VINCULO' }), extrato({ tipo: 'VINCULO' })];
    const internoRows = [interno({ tipo: 'VINCULO' }), interno({ tipo: 'VINCULO' }), interno({ tipo: 'VINCULO' })];
    const resultado = reconciliar(extratoRows, internoRows);
    expect(possui(resultado, 'DIV-007')).toBe(false);
  });
});

describe('DIV-008 — rotatividade (admissões/rescisões) divergente', () => {
  it('positivo: admissões do extrato divergem das internas no período-base', () => {
    const extratoRows = [
      extrato({ tipo: 'VINCULO', dataInicio: data(2024, 5, 1) }),
      extrato({ tipo: 'VINCULO', dataInicio: data(2024, 6, 1) }),
    ];
    const internoRows = [interno({ tipo: 'VINCULO', dataAdmissao: data(2024, 5, 1) })];
    const resultado = reconciliar(extratoRows, internoRows, { anoVigencia: 2025 });
    expect(possui(resultado, 'DIV-008')).toBe(true);
  });

  it('negativo: admissões e rescisões coincidem no período-base', () => {
    const extratoRows = [extrato({ tipo: 'VINCULO', dataInicio: data(2024, 5, 1) })];
    const internoRows = [interno({ tipo: 'VINCULO', dataAdmissao: data(2024, 5, 1) })];
    const resultado = reconciliar(extratoRows, internoRows, { anoVigencia: 2025 });
    expect(possui(resultado, 'DIV-008')).toBe(false);
  });
});

describe('DIV-009 — benefício de outro estabelecimento (CNPJ) do grupo', () => {
  it('positivo: registro sinalizado como vinculado a CNPJ diferente', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '666', cnpjVinculoDivergente: true })];
    const resultado = reconciliar(extratoRows, []);
    expect(possui(resultado, 'DIV-009')).toBe(true);
  });

  it('negativo: registro do próprio estabelecimento', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '666', cnpjVinculoDivergente: false })];
    const resultado = reconciliar(extratoRows, []);
    expect(possui(resultado, 'DIV-009')).toBe(false);
  });
});

describe('DIV-010 — óbito sem nexo computado como pensão por morte acidentária', () => {
  it('positivo: B93 sem CAT correspondente', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '777', especieBeneficio: 'B93' })];
    const resultado = reconciliar(extratoRows, []);
    expect(possui(resultado, 'DIV-010')).toBe(true);
  });

  it('negativo: B93 com CAT correspondente do mesmo trabalhador', () => {
    const extratoRows = [
      extrato({ tipo: 'BENEFICIO', nit: '777', especieBeneficio: 'B93' }),
      extrato({ tipo: 'CAT', nit: '777', dataInicio: data(2024, 2, 1) }),
    ];
    const resultado = reconciliar(extratoRows, []);
    expect(possui(resultado, 'DIV-010')).toBe(false);
  });
});

describe('reconciliar — resultado geral', () => {
  it('cada divergência inclui fundamentação legal e impactoEstimadoCentavos zerado (a preencher via calcularImpacto)', () => {
    const extratoRows = [extrato({ tipo: 'BENEFICIO', nit: '888', cnpjVinculoDivergente: true })];
    const [divergencia] = reconciliar(extratoRows, []);
    expect(divergencia?.fundamentacaoLegal.length).toBeGreaterThan(0);
    expect(divergencia?.impactoEstimadoCentavos).toBe(0);
    expect(divergencia?.status).toBe('DETECTADA');
  });
});
