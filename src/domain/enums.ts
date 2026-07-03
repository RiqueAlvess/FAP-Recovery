// Vocabulário de domínio persistido como String nas tabelas SQLite (o
// conector sqlite do Prisma não suporta enum nativo). `Cliente.estagio` usa
// EstagioPipeline (src/domain/consultancy/types.ts) e os campos de espécie de
// benefício usam EspecieBeneficio (src/domain/divergences/types.ts) — os
// enums abaixo cobrem o restante do schema (CicloFap, RegistroExtrato,
// RegistroInterno, Divergencia).

export const STATUS_CICLO_FAP = ['IMPORTADO', 'RECONCILIADO', 'CONTESTADO', 'JULGADO'] as const;
export type StatusCicloFap = (typeof STATUS_CICLO_FAP)[number];

/** Compartilhado por RegistroExtrato.tipo e RegistroInterno.tipo. */
export const TIPO_REGISTRO = ['CAT', 'BENEFICIO', 'MASSA_SALARIAL', 'VINCULO'] as const;
export type TipoRegistro = (typeof TIPO_REGISTRO)[number];

export const SEVERIDADE_DIVERGENCIA = ['ALTA', 'MEDIA', 'BAIXA'] as const;
export type SeveridadeDivergencia = (typeof SEVERIDADE_DIVERGENCIA)[number];

/** Índice(s) impactado(s) por uma ocorrência concreta de divergência. */
export const IMPACTO_INDICE = ['FREQUENCIA', 'GRAVIDADE', 'CUSTO', 'MULTIPLO'] as const;
export type ImpactoIndice = (typeof IMPACTO_INDICE)[number];

export const STATUS_DIVERGENCIA = ['DETECTADA', 'CONFIRMADA', 'DESCARTADA', 'EVIDENCIA_PENDENTE'] as const;
export type StatusDivergencia = (typeof STATUS_DIVERGENCIA)[number];
