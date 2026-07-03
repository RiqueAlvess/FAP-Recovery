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
