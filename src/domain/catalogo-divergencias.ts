/**
 * Catálogo das 10 divergências contestáveis do FAP. Fundamentação legal
 * resumida com base na Lei 10.666/2003 (institui o FAP e a possibilidade de
 * redução/majoração do RAT), na Resolução CNPS nº 1.316/2010 (metodologia de
 * cálculo — índices por percentil na subclasse CNAE, período-base, trava de
 * rotatividade) e nas portarias interministeriais MTP/MF que publicam
 * anualmente o índice e fixam o calendário de contestação (01–30/nov).
 */

export type ImpactoIndiceCatalogo = 'FREQUENCIA' | 'GRAVIDADE' | 'CUSTO' | 'MULTIPLO';
export type ChanceExitoCatalogo = 'alta' | 'media' | 'baixa';

export interface DivergenciaCatalogoEntry {
  codigo: string;
  titulo: string;
  descricao: string;
  fundamentacaoLegal: string;
  evidenciaNecessaria: string[];
  impactoIndice: ImpactoIndiceCatalogo;
  chanceExito: ChanceExitoCatalogo;
}

export const CATALOGO_DIVERGENCIAS: readonly DivergenciaCatalogoEntry[] = [
  {
    codigo: 'DIV-001',
    titulo: 'CAT duplicada no extrato',
    descricao:
      'A mesma matrícula e a mesma data de acidente aparecem duas ou mais vezes no extrato oficial, inflando artificialmente o índice de frequência.',
    fundamentacaoLegal:
      'Lei 10.666/2003, art. 10, c/c Resolução CNPS nº 1.316/2010 (metodologia do FAP) — o índice de frequência deve refletir eventos efetivamente distintos; duplicidade de CAT é erro de base de dados sujeito a retificação administrativa.',
    evidenciaNecessaria: [
      'Extrato oficial do FAP com as CATs listadas',
      'Cópias das CATs emitidas pela empresa',
      'Demonstração de que se trata do mesmo evento (mesma matrícula e mesma data)',
    ],
    impactoIndice: 'FREQUENCIA',
    chanceExito: 'alta',
  },
  {
    codigo: 'DIV-002',
    titulo: 'Benefício atribuído a trabalhador sem vínculo com a empresa',
    descricao:
      'O NIT do benefício não consta na folha de pagamento nem nos registros de vínculos (eSocial/CAGED) do estabelecimento no período-base.',
    fundamentacaoLegal:
      'Lei 10.666/2003, art. 10, §3º; Decreto 3.048/1999, Anexo V — o FAP deve refletir exclusivamente os riscos do próprio estabelecimento; benefício sem vínculo caracteriza erro de atribuição do INSS/Dataprev.',
    evidenciaNecessaria: [
      'Extrato do CNIS do NIT',
      'Folha de pagamento e eSocial/GFIP do período-base',
      'Extrato de benefícios do INSS',
    ],
    impactoIndice: 'MULTIPLO',
    chanceExito: 'alta',
  },
  {
    codigo: 'DIV-003',
    titulo: 'Nexo técnico epidemiológico (NTEP) aplicado indevidamente',
    descricao:
      'Benefício B91 concedido por presunção de nexo técnico epidemiológico sem correspondência real entre o CID do afastamento e o CNAE da empresa, havendo prova técnica em sentido contrário.',
    fundamentacaoLegal:
      'Lei 8.213/1991, art. 21-A (NTEP), c/c Lei 10.666/2003, art. 10 — a presunção de nexo é relativa (juris tantum) e admite prova em contrário mediante perícia, PPP e laudos técnicos (PCMSO/PGR).',
    evidenciaNecessaria: [
      'CID do benefício',
      'PPP e laudos técnicos (PCMSO/PGR)',
      'Parecer técnico ou pericial que afaste o nexo com o CNAE',
    ],
    impactoIndice: 'MULTIPLO',
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-004',
    titulo: 'Benefício com data fora do período-base de apuração',
    descricao:
      'A data de início do benefício está fora da janela de dois anos-base utilizada para o cálculo do FAP do ano de referência.',
    fundamentacaoLegal:
      'Resolução CNPS nº 1.316/2010 e portarias interministeriais anuais que fixam o período-base de apuração — eventos fora da janela não podem compor os índices do ciclo.',
    evidenciaNecessaria: [
      'Extrato do benefício com data de início',
      'Calendário oficial do período-base publicado na portaria interministerial do ano',
    ],
    impactoIndice: 'MULTIPLO',
    chanceExito: 'alta',
  },
  {
    codigo: 'DIV-005',
    titulo: 'Aposentadoria especial (B46) computada após o desligamento',
    descricao:
      'Benefício B46 concedido a trabalhador cujo vínculo com o estabelecimento já havia sido encerrado antes do início do período-base.',
    fundamentacaoLegal:
      'Decreto 3.048/1999, Anexo V — o custo do benefício só pode ser atribuído ao estabelecimento enquanto subsistir o vínculo/exposição ao risco.',
    evidenciaNecessaria: [
      'Data de desligamento (rescisão) do trabalhador',
      'Extrato do benefício B46',
      'Registros internos de vínculos (eSocial)',
    ],
    impactoIndice: 'CUSTO',
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-006',
    titulo: 'Massa salarial declarada no extrato diverge da folha',
    descricao:
      'O total de massa salarial informado no extrato oficial não corresponde à soma da folha de pagamento (GFIP/eSocial) do estabelecimento no período-base, distorcendo a normalização dos índices.',
    fundamentacaoLegal:
      'Resolução CNPS nº 1.316/2010 — a massa salarial é insumo direto da metodologia de cálculo (normalização dos índices e taxa de rotatividade); divergência de base é passível de retificação.',
    evidenciaNecessaria: ['GFIP/eSocial do período-base', 'Folha de pagamento consolidada', 'Extrato oficial do FAP'],
    impactoIndice: 'MULTIPLO',
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-007',
    titulo: 'Número médio de vínculos divergente',
    descricao:
      'O número médio de vínculos utilizado no extrato não corresponde aos registros internos (eSocial/CAGED), afetando a normalização do índice de frequência.',
    fundamentacaoLegal:
      'Resolução CNPS nº 1.316/2010 — o número médio de vínculos compõe o denominador dos índices e da taxa de rotatividade.',
    evidenciaNecessaria: [
      'eSocial/CAGED do período-base',
      'Registros internos de admissões e demissões',
      'Extrato oficial do FAP',
    ],
    impactoIndice: 'FREQUENCIA',
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-008',
    titulo: 'Taxa de rotatividade calculada com dados incorretos',
    descricao:
      'As admissões e rescisões usadas no extrato para calcular a rotatividade não correspondem aos registros internos, podendo acionar indevidamente a trava de bonificação.',
    fundamentacaoLegal:
      'Resolução CNPS nº 1.316/2010 — rotatividade elevada aciona trava que impede ou reduz a bonificação; base de cálculo incorreta pode prejudicar indevidamente o FAP.',
    evidenciaNecessaria: ['eSocial/CAGED do período-base', 'Registros internos de admissões e rescisões'],
    impactoIndice: 'FREQUENCIA',
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-009',
    titulo: 'Benefício atribuído a CNPJ diverso do estabelecimento avaliado',
    descricao:
      'O benefício está vinculado a um CNPJ diferente do estabelecimento cujo FAP está sendo apurado, ainda que pertencente ao mesmo grupo econômico.',
    fundamentacaoLegal:
      'Lei 10.666/2003, art. 10 — o FAP é apurado por CNPJ/estabelecimento, não por grupo econômico; atribuição cruzada entre CNPJs é erro de base passível de correção.',
    evidenciaNecessaria: ['CNPJ do vínculo do trabalhador', 'CNPJ do estabelecimento avaliado', 'Extrato do benefício'],
    impactoIndice: 'MULTIPLO',
    chanceExito: 'alta',
  },
  {
    codigo: 'DIV-010',
    titulo: 'Óbito sem nexo computado como pensão por morte acidentária',
    descricao:
      'Pensão por morte (B93) computada como acidentária sem CAT registrada e sem nexo técnico comprovado, elevando indevidamente o índice de gravidade — o de maior peso na metodologia — e o índice de custo.',
    fundamentacaoLegal:
      'Lei 8.213/1991, art. 21-A, c/c Resolução CNPS nº 1.316/2010 — óbito sem CAT ou sem nexo técnico comprovado não pode ser classificado como acidentário para fins de apuração do FAP.',
    evidenciaNecessaria: [
      'Ausência de CAT registrada',
      'Certidão de óbito e causa mortis',
      'Laudo ou perícia que afaste o nexo acidentário',
    ],
    impactoIndice: 'MULTIPLO',
    chanceExito: 'baixa',
  },
] as const;

export function buscarDivergenciaPorCodigo(codigo: string): DivergenciaCatalogoEntry | undefined {
  return CATALOGO_DIVERGENCIAS.find((d) => d.codigo === codigo);
}
