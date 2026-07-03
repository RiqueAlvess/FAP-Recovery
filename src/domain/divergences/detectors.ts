import type {
  DadosInternosEmpresa,
  DivergenciaEncontrada,
  ExtratoFap,
  RegistroBeneficio,
  RegistroCat,
  VinculoInterno,
} from './types.js';

function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** DIV-001: mesma matrícula + mesma data de acidente aparecendo mais de uma vez no extrato. */
export function detectarCatsDuplicadas(cats: RegistroCat[]): DivergenciaEncontrada[] {
  const contagemPorChave = new Map<string, number>();
  const encontradas: DivergenciaEncontrada[] = [];

  for (const cat of cats) {
    const chave = `${cat.matricula}|${dataISO(cat.dataAcidente)}`;
    const contagem = (contagemPorChave.get(chave) ?? 0) + 1;
    contagemPorChave.set(chave, contagem);

    if (contagem > 1) {
      encontradas.push({
        codigo: 'DIV-001',
        referencia: chave,
        detalhe: `CAT duplicada para a matrícula ${cat.matricula} na data ${dataISO(cat.dataAcidente)}`,
      });
    }
  }

  return encontradas;
}

/** DIV-002: NIT do benefício não consta na folha/vínculos da empresa no período. */
export function detectarBeneficioSemVinculo(
  beneficios: RegistroBeneficio[],
  vinculos: VinculoInterno[]
): DivergenciaEncontrada[] {
  const nitsComVinculo = new Set(vinculos.map((v) => v.nit));

  return beneficios
    .filter((b) => !nitsComVinculo.has(b.nit))
    .map((b) => ({
      codigo: 'DIV-002',
      referencia: b.nit,
      detalhe: `NIT ${b.nit} não consta na folha/vínculos da empresa no período`,
    }));
}

/**
 * DIV-003: benefício acidentário (B91/B92) cujo CID não tem nexo com o CNAE
 * e para o qual a empresa possui laudo/PPP que afasta o nexo técnico.
 */
export function detectarNtepIndevido(
  beneficios: RegistroBeneficio[],
  cidsComNexoParaCnae: Set<string>,
  matriculasComLaudoQueAfastaNexo: Set<string>
): DivergenciaEncontrada[] {
  return beneficios
    .filter(
      (b) =>
        (b.especie === 'B91' || b.especie === 'B92') &&
        b.cid !== undefined &&
        !cidsComNexoParaCnae.has(b.cid) &&
        b.matricula !== undefined &&
        matriculasComLaudoQueAfastaNexo.has(b.matricula)
    )
    .map((b) => ({
      codigo: 'DIV-003',
      referencia: b.nit,
      detalhe: `Benefício ${b.especie} com CID ${b.cid} sem nexo com o CNAE e laudo técnico que afasta o nexo`,
    }));
}

/** DIV-004: data de início do benefício fora da janela de 2 anos do período-base. */
export function detectarBeneficioForaDoPeriodo(
  beneficios: RegistroBeneficio[],
  periodo: { inicio: Date; fim: Date }
): DivergenciaEncontrada[] {
  return beneficios
    .filter((b) => b.dataInicio < periodo.inicio || b.dataInicio > periodo.fim)
    .map((b) => ({
      codigo: 'DIV-004',
      referencia: b.nit,
      detalhe: `Data de início do benefício (${dataISO(b.dataInicio)}) fora do período-base`,
    }));
}

/** DIV-005: aposentadoria especial (B46) de trabalhador desligado antes do início do período-base. */
export function detectarAposentadoriaEspecialIndevida(
  beneficios: RegistroBeneficio[],
  vinculos: VinculoInterno[],
  periodo: { inicio: Date; fim: Date }
): DivergenciaEncontrada[] {
  const rescisaoPorNit = new Map(vinculos.map((v) => [v.nit, v.dataRescisao]));

  return beneficios
    .filter((b) => b.especie === 'B46')
    .filter((b) => {
      const rescisao = rescisaoPorNit.get(b.nit);
      return rescisao !== undefined && rescisao < periodo.inicio;
    })
    .map((b) => ({
      codigo: 'DIV-005',
      referencia: b.nit,
      detalhe: 'Aposentadoria especial (B46) de trabalhador desligado antes do início do período-base',
    }));
}

/** DIV-006: massa salarial total do extrato diverge da soma da folha (GFIP/eSocial). */
export function detectarMassaSalarialDivergente(
  extrato: Pick<ExtratoFap, 'cnpjEstabelecimento' | 'massaSalarialDeclaradaNoExtrato'>,
  massaSalarialFolha: number,
  tolerancia = 0.01
): DivergenciaEncontrada[] {
  const diferenca = Math.abs(extrato.massaSalarialDeclaradaNoExtrato - massaSalarialFolha);
  const base = Math.max(massaSalarialFolha, 1);

  if (diferenca / base > tolerancia) {
    return [
      {
        codigo: 'DIV-006',
        referencia: extrato.cnpjEstabelecimento,
        detalhe: `Massa salarial do extrato (${extrato.massaSalarialDeclaradaNoExtrato}) diverge da folha (${massaSalarialFolha})`,
      },
    ];
  }

  return [];
}

/** DIV-007: número médio de vínculos do extrato diverge dos registros internos. */
export function detectarNumeroMedioVinculosDivergente(
  extrato: Pick<ExtratoFap, 'cnpjEstabelecimento' | 'numeroMedioVinculosNoExtrato'>,
  numeroMedioVinculosInterno: number
): DivergenciaEncontrada[] {
  if (extrato.numeroMedioVinculosNoExtrato !== numeroMedioVinculosInterno) {
    return [
      {
        codigo: 'DIV-007',
        referencia: extrato.cnpjEstabelecimento,
        detalhe: `Número médio de vínculos do extrato (${extrato.numeroMedioVinculosNoExtrato}) diverge do registro interno (${numeroMedioVinculosInterno})`,
      },
    ];
  }

  return [];
}

/** DIV-008: admissões/rescisões do extrato divergem dos registros internos, distorcendo a rotatividade. */
export function detectarRotatividadeDivergente(
  extrato: Pick<ExtratoFap, 'cnpjEstabelecimento' | 'admissoesNoExtrato' | 'rescisoesNoExtrato'>,
  admissoesInternas: number,
  rescisoesInternas: number
): DivergenciaEncontrada[] {
  if (extrato.admissoesNoExtrato !== admissoesInternas || extrato.rescisoesNoExtrato !== rescisoesInternas) {
    return [
      {
        codigo: 'DIV-008',
        referencia: extrato.cnpjEstabelecimento,
        detalhe: `Admissões/rescisões do extrato (${extrato.admissoesNoExtrato}/${extrato.rescisoesNoExtrato}) divergem dos registros internos (${admissoesInternas}/${rescisoesInternas})`,
      },
    ];
  }

  return [];
}

/** DIV-009: benefício vinculado a um CNPJ diferente do estabelecimento avaliado. */
export function detectarBeneficioDeOutroEstabelecimento(
  beneficios: RegistroBeneficio[],
  cnpjEstabelecimentoAvaliado: string
): DivergenciaEncontrada[] {
  return beneficios
    .filter((b) => b.cnpjVinculo !== cnpjEstabelecimentoAvaliado)
    .map((b) => ({
      codigo: 'DIV-009',
      referencia: b.nit,
      detalhe: `Benefício vinculado ao CNPJ ${b.cnpjVinculo}, diferente do estabelecimento avaliado (${cnpjEstabelecimentoAvaliado})`,
    }));
}

/** DIV-010: pensão por morte (B93) sem CAT correspondente, sugerindo óbito não acidentário. */
export function detectarObitoNaoAcidentario(
  beneficios: RegistroBeneficio[],
  cats: RegistroCat[]
): DivergenciaEncontrada[] {
  const matriculasComCat = new Set(cats.map((c) => c.matricula));

  return beneficios
    .filter((b) => b.especie === 'B93' && b.resultouMorte === true && (!b.matricula || !matriculasComCat.has(b.matricula)))
    .map((b) => ({
      codigo: 'DIV-010',
      referencia: b.nit,
      detalhe: 'Pensão por morte sem CAT correspondente e sem nexo comprovado',
    }));
}

export interface ContextoDeteccao {
  cidsComNexoParaCnae?: Set<string>;
}

export function detectarTodasDivergencias(
  extrato: ExtratoFap,
  dadosInternos: DadosInternosEmpresa,
  contexto: ContextoDeteccao = {}
): DivergenciaEncontrada[] {
  const matriculasComLaudo = new Set((dadosInternos.laudosQueAfastamNexo ?? []).map((l) => l.matricula));

  return [
    ...detectarCatsDuplicadas(extrato.cats),
    ...detectarBeneficioSemVinculo(extrato.beneficios, dadosInternos.vinculos),
    ...detectarNtepIndevido(extrato.beneficios, contexto.cidsComNexoParaCnae ?? new Set(), matriculasComLaudo),
    ...detectarBeneficioForaDoPeriodo(extrato.beneficios, extrato.periodoBase),
    ...detectarAposentadoriaEspecialIndevida(extrato.beneficios, dadosInternos.vinculos, extrato.periodoBase),
    ...detectarMassaSalarialDivergente(extrato, dadosInternos.massaSalarialFolha),
    ...detectarNumeroMedioVinculosDivergente(extrato, dadosInternos.vinculos.length),
    ...detectarRotatividadeDivergente(extrato, dadosInternos.admissoesRegistros, dadosInternos.rescisoesRegistros),
    ...detectarBeneficioDeOutroEstabelecimento(extrato.beneficios, extrato.cnpjEstabelecimento),
    ...detectarObitoNaoAcidentario(extrato.beneficios, extrato.cats),
  ];
}
