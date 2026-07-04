# FAP Recovery — Contexto do Projeto
## O que é
Ferramenta interna de consultoria para revisão retroativa e contestação do FAP (Fator Acidentário de Prevenção) de empresas brasileiras. Modelo de negócio: honorário por êxito sobre economia gerada.
## Domínio essencial
- Contribuição = Folha × RAT (1-3% por CNAE) × FAP (0,5000-2,0000)
- FAP calculado sobre 2 anos de dados (CATs, benefícios B91/B92/B93/B94, massa salarial, vínculos, rotatividade), em percentis dentro da subclasse CNAE
- Contestação do índice: somente 01-30/nov, texto de máx 5.000 caracteres, sem anexos
- Recuperação retroativa: PER/DCOMP, até 5 anos, o ano todo
## Convenções do código
- Monólito Next.js App Router; Server Actions para mutações; Prisma/SQLite
- Formatação BR sempre: R$ 1.234,56 / dd/mm/aaaa / CNPJ mascarado / FAP com 4 decimais
- Valores monetários em centavos (Int) no banco; FAP como Int (valor × 10000)
- Toda regra de negócio vive em /src/domain (funções puras, testadas com Vitest) — NUNCA em componentes React
- UI: shadcn/ui + Tailwind, densidade alta, tema descrito em /src/styles (Inter + JetBrains Mono para números, primária #1E40AF, sucesso #047857, alerta #B45309, erro #B91C1C, tabular-nums em todo valor numérico)
## Estrutura
/src/domain (regras puras) · /src/app (rotas/telas) · /src/components · /prisma
## Regra de ouro
Divergências são detectadas por regras determinísticas (catálogo DIV-001 a DIV-010), nunca por heurística vaga. Cada divergência carrega fundamentação legal e impacto no índice.
## Changelog (MVP)
- Domínio (`/src/domain`): cálculo de FAP (frequência/gravidade/custo, percentis por CNAE, bônus/trava), catálogo de divergências DIV-001 a DIV-010 com fundamentação legal, regras de contestação (janela 01-30/nov, limite de 5.000 caracteres, prazos de recurso/prescrição), regras de honorário por êxito — tudo puro, coberto por 93 testes Vitest.
- Prisma/SQLite: schema completo (Cliente, Estabelecimento, CicloFap, RegistroExtrato, RegistroInterno, Divergencia, Contestacao) + seed com 4 anomalias propositais para validar as regras DIV.
- Pipeline de reconciliação: `reconciliar()` casa registros de extrato com registros internos (NIT + fuzzy nome/data) e aplica as 10 regras DIV; `calcularImpacto()` estima o efeito de cada divergência no índice; `simularFap()` projeta o FAP corrigido (inclusive anos anteriores, com correção SELIC); `gerarMinutaContestacao()` monta o texto legal respeitando o limite de 5.000 caracteres.
- Telas: `/dashboard` (carteira, economia potencial, próximas ações), `/clientes` + `/clientes/[id]` (cadastro de cliente/estabelecimento/ciclo), `/ciclos/[id]/reconciliacao` (tela principal — grade de divergências com filtros, confirmação/descarte, justificativa), `/ciclos/[id]/simulador` (simulação ao vivo do FAP corrigido + crédito retroativo, com exportação de proposta em PDF), `/ciclos/[id]/contestacao` (minuta editável com barra de progresso de caracteres e aviso de divergências fora do limite).
- Exportação de "Dossiê de evidências": PDF interno por divergência confirmada com código, fundamentação legal completa, registro do extrato, registro interno, justificativa e checklist de evidência pendente — para revisão do advogado antes do protocolo.
- Revisão de consistência: formatação BR (CNPJ mascarado, CNPJ raiz, FAP com 4 decimais, moeda) auditada em todas as telas e nos dois documentos PDF; estados vazios em toda tabela/listagem agora trazem uma instrução acionável (ex: ciclo sem nenhum registro importado explica que não há o que reconciliar e linka de volta ao cadastro do cliente, em vez de sugerir "nenhuma divergência encontrada"); cálculo de honorário projetado (antes duplicado em 3 lugares) foi centralizado em `/src/domain/consultancy`.
## Backlog (Fase 2)
- Autenticação e autorização (hoje o app não tem login).
- Multi-usuário / multi-tenant (hoje é um único usuário/escritório).
- Migração de SQLite para Postgres (para uso além de um ambiente local/single-writer).
- Importação de arquivos CSV/XLSX de extrato e dados internos (hoje os registros são carregados diretamente no banco via seed/script; não há tela de upload).
- Monitoramento contínuo de eventos eSocial — a fase 2 do negócio, para detectar divergências antes do fechamento do índice em vez de só na janela de contestação.
