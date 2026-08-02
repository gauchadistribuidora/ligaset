# Projeto Ligaset

## Sobre o projeto
Ligaset é a plataforma de **beach tennis** para organizar grupos, torneios, rankings e
mensalidades. Web app responsivo (mobile-first / PWA) — os jogadores usam pelo celular,
na beira da quadra. Dono do produto: Henrique (Gaúcha Distribuidora).

Site em produção: **https://ligaset.com.br**

## Stack técnico
- **Next.js 14** (App Router + Server Actions) + React 18 + TypeScript
- **Tailwind CSS** — tema esportivo, mobile-first
- **Supabase** — Postgres, Auth (Google + magic link + senha), Storage, Row Level Security
- **Resend** — envio de e-mails (relatórios, convites, comunicados)
- **SheetJS (xlsx)** — exportação de relatórios
- **Deploy:** Vercel (time `Gaúcha Distribuidora`, projeto `ligaset`)

## Onde fica cada coisa
| Pasta | O que tem |
|---|---|
| `app/` | Páginas e rotas. `app/app/**` é a área logada; a raiz tem landing, login, termos e privacidade |
| `app/actions/` | Server Actions — toda escrita no banco passa por aqui (grupos, torneios, pagamentos, financeiro, conta, admin) |
| `components/` | Componentes de UI (MatchCard, Bracket, formulários, etc.) |
| `lib/` | Regras de negócio: `draw.ts` (sorteio), `bracket.ts` (chaveamento), `finance.ts` (financeiro), `reports.ts` (relatórios), `email.ts`/`notify.ts` (envios), `data.ts` (consultas), `types.ts` |
| `lib/supabase/` | Clientes do Supabase: `client.ts` (browser), `server.ts` (server), `middleware.ts` (sessão), `admin.ts` (service role — **nunca usar em código de cliente**) |
| `app/app/externos/` | **Torneios de fora** — histórico pessoal dos torneios que não são do Ligaset. Regras em `lib/external.ts`, ações em `app/actions/external.ts` |
| `supabase/migrations/` | Migrations versionadas, `0001` a `0016` |

### Torneios de fora (módulo em teste)
Cada jogador registra os torneios que disputa fora da plataforma: torneio, data,
categoria, parceiro e os jogos (fase, dupla adversária, placar por set). O resultado
final — Campeão, Vice, "parou nas quartas" — é **calculado** a partir dos jogos; nunca
digitado. O fluxo é fechado pelos botões **Avançou** / **Foi eliminada**.

**Federação** (FGT, FGBT, CBT ou outra) é texto livre no banco de propósito — federação
nova não pode exigir migration. **O nome do torneio se reaproveita**: a lista de torneios
já cadastrados vira opção no formulário, porque os mesmos torneios se repetem ao longo do
ano em datas diferentes. Escolher um traz a federação dele junto. Essa lista é **derivada**
dos torneios do jogador, não é tabela — cadastrou uma vez, aparece nas próximas.

**Categoria** é fechada: nível (Pro, A, B, C, D, Iniciante) + naipe (Masculina, Feminina,
Mista), gravados juntos numa string do tipo `"B Feminina"` — é por ela que os relatórios
agrupam. **Parceiros** (`external_partners`) e **duplas adversárias** (`external_pairs`)
são listas por jogador: o que for digitado entra sozinho na lista e, dali em diante, é só
escolher. Isso não é conveniência — o relatório de melhor/pior dupla agrupa **pelo nome do
parceiro**, então "Ana Paula" digitado de três jeitos viraria três pessoas.

**Relatórios:** aproveitamento e saldo geral, melhor/pior dupla (mínimo de 3 jogos),
desempenho por categoria, freguês e carrasco (mínimo de 2 confrontos), como foi em cada
torneio e a lista de todos os resultados.

O **placar é por set**, e o terceiro set se chama "Super Tiezão" na tela — é o super
tie-break, e é assim que se fala na quadra. A **categoria já vem preenchida** com a última
que o jogador informou (naipe começa em Masculina), porque quem joga a C Masculina joga
sempre a mesma.

**Quem enxerga:** enquanto está em teste, só a lista de testadores — admins da plataforma
mais os ids em `EXTERNAL_TESTER_IDS` (`requireExternalTester` em `lib/admin.ts`).
Propositalmente **separado** de `PLATFORM_ADMIN_EMAILS`: liberar o teste do módulo não
pode dar de brinde o painel de administração. A identificação é por **id de usuário**, e
não por e-mail, porque este repositório é público.

A trava está na rota e nas server actions, **não no RLS** — no banco a regra é "cada um vê
o próprio histórico", que é a definitiva. Para liberar para todos, basta remover a
checagem; o banco não muda.

## Como rodar local
```bash
cd C:\Users\DESKTOP\Documents\GitHub\ligaset
npm install
npm run dev
```
Precisa do arquivo `.env.local` na raiz (não vai para o Git). Veja `.env.local.example`
para a lista completa de variáveis. As chaves ficam no painel do Supabase em
*Project Settings → API* e no painel da Vercel em *Settings → Environment Variables*.

## Como publicar
O deploy é **automático**: todo push no branch `main` do GitHub
(`gauchadistribuidora/ligaset`) dispara build na Vercel e, se passar, vai para produção
em `ligaset.com.br`. Não existe passo manual.

```bash
git add -A
git commit -m "feat: descrição curta do que mudou"
git push origin main
```

Se um deploy quebrar, a produção **continua no último build bom** — dá para reverter pelo
painel da Vercel (Deployments → escolher um anterior → Rollback).

## Banco de dados (Supabase)
- Projeto: `izjrqunvwxhaspbxjsht` (região sa-east-1)
- **Migrations sempre versionadas** em `supabase/migrations/`. Nunca alterar tabela direto
  pelo painel — senão o repositório e o banco saem de sincronia e ninguém mais sabe o que
  está valendo.
- **RLS é obrigatório** em toda tabela com dado de jogador ou financeiro. A regra base está
  em `0003_rls.sql`; o admin de plataforma em `0012_platform_admin.sql`.
- Papéis dentro de um grupo: **dono**, **admin** e **jogador**. Acima deles existe o
  **admin de plataforma** (controlado por `PLATFORM_ADMIN_EMAILS`).

## Regras de trabalho
- **Português do Brasil** em toda a UI, mensagens de erro e nomes de domínio
  (jogador, grupo, torneio, mensalidade, quadra).
- **Mobile-first sempre.** A tela padrão de uso é um celular na beira da quadra.
- **Commits pequenos e descritivos** em português.
- **Não instalar dependência nova sem avisar** o motivo.
- Henrique **não é desenvolvedor**: explique em português claro e proponha sempre o
  caminho mais simples que funciona.

## Quirks conhecidos (não são bugs, mas confundem)
- O `name` no `package.json` ainda é `btplay` — nome antigo do projeto. Só cosmético.
- A pasta `_to_delete/` tem sobra de migração antiga (`_head.tar`). Pode ser removida.
- O repositório é **público** no GitHub. Nenhuma chave secreta pode entrar em arquivo
  versionado — só em `.env.local` (local) e nas variáveis de ambiente da Vercel.
- Há vários PRs abertos do **Dependabot** com upgrades major (Next 16, React 19,
  Tailwind 4, TypeScript 7) cujos builds falham. São atualizações que quebram o projeto —
  não fazer merge sem migração planejada.
