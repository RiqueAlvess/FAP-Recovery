import type { DivergenciaCatalogo } from './types';

export const CATALOGO_DIVERGENCIAS: DivergenciaCatalogo[] = [
  {
    codigo: 'DIV-001',
    descricao: 'CAT duplicada',
    fundamentacaoLegal:
      'Decreto 3.048/1999, Anexo V (metodologia do FAP) — direito à retificação de dados incorretos usados na apuração do índice.',
    evidenciaNecessaria: [
      'Extrato de CATs do estabelecimento',
      'Comprovação de que se trata do mesmo evento (mesma matrícula e data)',
    ],
    impactoNoIndice: ['frequencia'],
    chanceExito: 'alta',
  },
  {
    codigo: 'DIV-002',
    descricao: 'Benefício de trabalhador sem vínculo com a empresa',
    fundamentacaoLegal:
      'Lei 8.213/1991, art. 22, §3º; Decreto 3.048/1999, Anexo V — o FAP deve refletir apenas os riscos do próprio estabelecimento.',
    evidenciaNecessaria: [
      'CNIS/relação de vínculos do NIT',
      'Folha de pagamento e GFIP/eSocial do período',
      'Extrato de benefícios do INSS',
    ],
    impactoNoIndice: ['frequencia', 'gravidade', 'custo'],
    chanceExito: 'alta',
  },
  {
    codigo: 'DIV-003',
    descricao: 'Afastamento comum (B31) computado como acidentário (B91) via NTEP indevido',
    fundamentacaoLegal: 'Lei 8.213/1991, art. 21-A (NTEP) — presunção relativa, que admite prova em contrário.',
    evidenciaNecessaria: [
      'CID do benefício',
      'PPP e laudos técnicos (PCMSO/PGR)',
      'Demonstração de ausência de nexo técnico com o CNAE',
    ],
    impactoNoIndice: ['frequencia', 'gravidade', 'custo'],
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-004',
    descricao: 'Benefício com data de início fora do período-base do cálculo',
    fundamentacaoLegal:
      'Decreto 3.048/1999, Anexo V — apuração restrita à janela de 2 anos-base anteriores ao ano de referência do FAP.',
    evidenciaNecessaria: ['Extrato do benefício com data de início', 'Janela oficial do período-base divulgada'],
    impactoNoIndice: ['frequencia', 'gravidade', 'custo'],
    chanceExito: 'alta',
  },
  {
    codigo: 'DIV-005',
    descricao: 'Aposentadoria especial (B46) de ex-colaborador computada indevidamente',
    fundamentacaoLegal:
      'Decreto 3.048/1999, Anexo V — o vínculo deve estar ativo/relacionado ao estabelecimento no período-base.',
    evidenciaNecessaria: [
      'Data de desligamento (rescisão) do trabalhador',
      'Extrato do benefício B46',
      'Registros internos de vínculos',
    ],
    impactoNoIndice: ['custo'],
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-006',
    descricao: 'Massa salarial divergente entre o extrato do FAP e a folha declarada',
    fundamentacaoLegal:
      'Decreto 3.048/1999, Anexo V — a massa salarial integra o cálculo da taxa de rotatividade e a normalização dos índices.',
    evidenciaNecessaria: ['GFIP/eSocial do período-base', 'Folha de pagamento consolidada', 'Extrato oficial do FAP'],
    impactoNoIndice: ['frequencia', 'gravidade', 'custo'],
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-007',
    descricao: 'Número médio de vínculos incorreto',
    fundamentacaoLegal:
      'Decreto 3.048/1999, Anexo V — o número médio de vínculos compõe a taxa de rotatividade e a normalização dos índices.',
    evidenciaNecessaria: ['Registros internos de admissões/demissões', 'eSocial/CAGED do período', 'Extrato oficial do FAP'],
    impactoNoIndice: ['frequencia'],
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-008',
    descricao: 'Rotatividade calculada com admissões/rescisões incorretas',
    fundamentacaoLegal: 'Decreto 3.048/1999, Anexo V — trava de bonificação vinculada à taxa de rotatividade.',
    evidenciaNecessaria: ['eSocial/CAGED do período', 'Registros internos de admissões e rescisões'],
    impactoNoIndice: ['frequencia'],
    chanceExito: 'media',
  },
  {
    codigo: 'DIV-009',
    descricao: 'Benefício atribuído a outro estabelecimento (CNPJ) do mesmo grupo econômico',
    fundamentacaoLegal: 'Decreto 3.048/1999, Anexo V — o FAP é apurado por CNPJ/estabelecimento, não por grupo econômico.',
    evidenciaNecessaria: ['CNPJ do vínculo do trabalhador', 'CNPJ do estabelecimento avaliado', 'Extrato do benefício'],
    impactoNoIndice: ['frequencia', 'gravidade', 'custo'],
    chanceExito: 'alta',
  },
  {
    codigo: 'DIV-010',
    descricao: 'Óbito não acidentário computado indevidamente',
    fundamentacaoLegal: 'Lei 8.213/1991, art. 21-A — ausência de CAT ou de nexo técnico para a pensão por morte.',
    evidenciaNecessaria: ['Ausência de CAT registrada', 'Certidão de óbito e causa mortis', 'Laudo/perícia que afaste o nexo'],
    impactoNoIndice: ['gravidade', 'custo'],
    chanceExito: 'baixa',
  },
];

export function buscarDivergenciaPorCodigo(codigo: string): DivergenciaCatalogo | undefined {
  return CATALOGO_DIVERGENCIAS.find((d) => d.codigo === codigo);
}
