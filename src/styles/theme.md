# Tema visual — FAP Recovery

Fonte da verdade para tokens de design usados pelos componentes shadcn/ui e
Tailwind (`tailwind.config.ts` + `src/app/globals.css`).

## Tipografia

- **Inter** — fonte padrão de UI (`font-sans`, variável `--font-inter`, via `next/font` em `src/app/layout.tsx`).
- **JetBrains Mono** — todo valor numérico (moeda, FAP, percentuais, CNPJ) usa `font-mono` +
  a utilidade `tabular-nums` do Tailwind, para alinhamento vertical de dígitos.

## Cores de marca

| Token       | Uso                          | Hex       | CSS var (HSL)         |
|-------------|-------------------------------|-----------|------------------------|
| `primary`   | Ações principais, links, foco  | `#1E40AF` | `--primary: 225 71% 40%` |
| `success`   | Divergência confirmada, ganho  | `#047857` | `--success: 163 94% 24%` |
| `warning`   | Evidência pendente, prazo perto| `#B45309` | `--warning: 26 91% 37%`  |
| `destructive` | Divergência descartada, erro | `#B91C1C` | `--destructive: 0 74% 42%` |

Todas as cores são expostas como variáveis CSS em `globals.css` (tema claro e
escuro) e consumidas pelo Tailwind via `hsl(var(--token))`, seguindo a
convenção do shadcn/ui (`components.json`).

## Formatação de valores (BR)

- Moeda: `R$ 1.234,56` — `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Datas: `dd/mm/aaaa` — `Intl.DateTimeFormat('pt-BR')`.
- CNPJ: sempre mascarado `00.000.000/0000-00`.
- FAP: sempre com 4 casas decimais (ex.: `1,2345`).
- Todo número renderizado em tabela ou card usa `font-mono tabular-nums`.

## Densidade

UI de alta densidade (linhas de tabela compactas, poucos espaços em branco
grandes) — é uma ferramenta interna de trabalho, não uma landing page.
