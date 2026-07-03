import { describe, expect, it } from 'vitest';
import { EstagioPipeline } from '../src/domain/consultancy/types.js';
import { podeAvancarPara, proximosEstagiosPermitidos } from '../src/domain/consultancy/pipeline.js';
import { HONORARIO_PADRAO_PERCENTUAL, calcularHonorario } from '../src/domain/consultancy/fees.js';
import { corrigirValorPelaSelic } from '../src/domain/consultancy/selic.js';
import {
  calcularCreditoRetroativoEstimado,
  calcularEconomiaAnualProspectiva,
  gerarDiagnostico,
} from '../src/domain/consultancy/diagnosis.js';

describe('pipeline de cliente', () => {
  it('segue a ordem Prospect -> Diagnostico -> Proposta -> ... -> Faturado', () => {
    expect(proximosEstagiosPermitidos(EstagioPipeline.PROSPECT)).toEqual([EstagioPipeline.DIAGNOSTICO]);
    expect(proximosEstagiosPermitidos(EstagioPipeline.JULGADO)).toEqual([EstagioPipeline.FATURADO]);
    expect(proximosEstagiosPermitidos(EstagioPipeline.FATURADO)).toEqual([]);
  });

  it('nao permite pular estagios', () => {
    expect(podeAvancarPara(EstagioPipeline.PROSPECT, EstagioPipeline.PROPOSTA)).toBe(false);
    expect(podeAvancarPara(EstagioPipeline.PROSPECT, EstagioPipeline.DIAGNOSTICO)).toBe(true);
  });
});

describe('honorario por exito', () => {
  it('usa 25% como default', () => {
    expect(HONORARIO_PADRAO_PERCENTUAL).toBe(0.25);
    expect(calcularHonorario(10000)).toBe(2500);
  });

  it('aceita percentual customizado por contrato', () => {
    expect(calcularHonorario(10000, 0.3)).toBe(3000);
  });
});

describe('correcao pela SELIC', () => {
  it('aplica juros compostos mes a mes', () => {
    const taxaFixa = () => 0.01; // 1% ao mes
    const corrigido = corrigirValorPelaSelic(
      1000,
      new Date('2024-01-01T00:00:00Z'),
      new Date('2024-04-01T00:00:00Z'),
      taxaFixa
    );
    expect(corrigido).toBeCloseTo(1000 * 1.01 ** 3);
  });

  it('nao corrige quando o periodo e zero', () => {
    const data = new Date('2024-01-01T00:00:00Z');
    expect(corrigirValorPelaSelic(1000, data, data, () => 0.01)).toBe(1000);
  });
});

describe('diagnostico', () => {
  it('economia anual prospectiva nunca e negativa', () => {
    expect(calcularEconomiaAnualProspectiva(1000, 1500)).toBe(0);
    expect(calcularEconomiaAnualProspectiva(1500, 1000)).toBe(500);
  });

  it('credito retroativo exclui pagamentos prescritos', () => {
    const hoje = new Date('2026-07-03T00:00:00Z');
    const pagamentos = [
      { data: new Date('2025-01-01T00:00:00Z'), valor: 1000 }, // dentro do prazo
      { data: new Date('2019-01-01T00:00:00Z'), valor: 1000 }, // prescrito
    ];
    const credito = calcularCreditoRetroativoEstimado(pagamentos, () => 0, hoje);
    expect(credito).toBeCloseTo(1000);
  });

  it('gerarDiagnostico retorna sempre os dois numeros', () => {
    const hoje = new Date('2026-07-03T00:00:00Z');
    const resultado = gerarDiagnostico(
      5000,
      4000,
      [{ data: new Date('2024-01-01T00:00:00Z'), valor: 2000 }],
      () => 0.005,
      hoje
    );
    expect(resultado.economiaAnualProspectiva).toBe(1000);
    expect(resultado.creditoRetroativoEstimado).toBeGreaterThan(2000);
  });
});
