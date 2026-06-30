# 🎾 Ligaset

A plataforma completa para organizar **grupos, torneios, rankings e mensalidades** de beach tennis. Web app responsivo (mobile-first / PWA) em Next.js + Supabase.

## Stack

- **Next.js 14** (App Router, Server Actions) + **TypeScript**
- **Tailwind CSS** — tema esportivo premium, mobile-first
- **Supabase** — Postgres, Auth (Google + magic link), Row Level Security
- Pronto para deploy na **Vercel**

## MVP incluído

| Módulo | O que faz |
|---|---|
| **Autenticação** | Login com Google e com e-mail (magic link). Perfil do jogador. |
| **Grupos** | Criar grupo com cor/identidade, convidar membros por e-mail, permissões (dono/admin/jogador). |
| **Torneios** | Criar torneio, definir games por set (4/5/6/7/9) e tie-break, inscrever jogadores. |
| **Sorteio** | Sorteia duplas e gera os jogos automaticamente (todos contra todos), com quadras. |
| **Resultados** | Lançamento de placar com vencedor automático. Classificação do torneio em tempo real. |
| **Ranking** | Ranking do grupo: pontos (vitória=1), vitórias, aproveitamento, saldo de games e desempates. |
| **Mensalidades** | Geração de cobranças do mês, status (pago/pendente/vencido/isento), resumo financeiro. |
| **Dashboards** | Painel do organizador (jogadores, torneios, financeiro) e do jogador (stats pessoais). |

Recursos de V2 já previstos na estrutura: cards automáticos, modo TV, sorteio inteligente, Pix automático, área de arenas.

## Como rodar localmente

```bash
npm install
cp .env.local.example .env.local   # preencha a anon key do Supabase
npm run dev
```

Abra http://localhost:3000

## Banco de dados (Supabase)

Projeto: **ligaset** (`izjrqunvwxhaspbxjsht`, região sa-east-1).

As migrations ficam em `supabase/migrations/`:

1. `0001_init.sql` — tabelas (profiles, groups, group_members, group_settings, tournaments, tournament_players, teams, matches, match_results, payments).
2. `0002_functions_triggers.sql` — triggers (novo usuário → profile; novo grupo → dono+settings; placar → vencedor) e a view `group_rankings`.
3. `0003_rls.sql` — políticas de Row Level Security.

### Configuração de Auth (no painel Supabase)

1. **Authentication > Providers > Google**: habilitar e preencher Client ID/Secret (Google Cloud Console).
2. **Authentication > URL Configuration**: adicionar a URL do site e `…/auth/callback` em Redirect URLs.

## Deploy na Vercel

1. Suba o repositório no GitHub.
2. Importe na Vercel, framework **Next.js**.
3. Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Em Supabase > Auth > URL Configuration, use o domínio da Vercel como Site URL.

## Estrutura

```
app/
  page.tsx                 landing
  login/                   login (Google + magic link)
  auth/                    callback e signout
  app/                     área autenticada
    page.tsx               início (stats + grupos)
    groups/                lista, criar, e [id]/ (visão geral, membros,
                           torneios, ranking, mensalidades, configurações)
    profile/               perfil do jogador
  actions/                 server actions (groups, tournaments, payments, profile)
components/                UI e componentes client
lib/                       supabase clients, tipos, sorteio, formatação
supabase/migrations/       SQL do banco
```
