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
- **SheetJS (xlsx)** — exportação de relatórios
- **Deploy:** Vercel (time `Gaúcha Distribuidora`, projeto `ligaset`)

## Onde fica cada coisa
| Pasta | O que tem |
|---|---|
| `app/` | Páginas e rotas. `app/app/**` é a área logada; a raiz tem landing, login, termos e privacidade |
| `app/actions/` | Server Actions — toda escrita no banco passa por aqui (grupos, torneios, pagamentos, financeiro, conta, admin) |
| `components/` | Componentes de UI (MatchCard, Bracket, formulários, etc.) |
| `lib/` | Regras de negócio: `draw.ts` (sorteio), `bracket.ts` (chaveamento), `finance.ts` (financeiro), `reports.ts` (relatórios), `rei.ts` (Rei da Praia), `data.ts` (consultas), `types.ts` |
| `lib/supabase/` | Clientes do Supabase: `client.ts` (browser), `server.ts` (server), `middleware.ts` (sessão), `admin.ts` (service role — **nunca usar em código de cliente**) |
| `app/app/externos/` | **Torneios Federados** — histórico pessoal dos torneios de federação (CBT, FGT, FGBT). Regras em `lib/external.ts`, ações em `app/actions/external.ts` |
| `supabase/migrations/` | Migrations versionadas, `0001` a `0029` |

### Torneios Federados (módulo em teste)
Cada jogador registra os torneios que disputa fora da plataforma: torneio, data,
categoria, parceiro e os jogos (fase, dupla adversária, placar por set). O resultado
final — Campeão, Vice, "eliminado (a) nas quartas" — é **calculado** a partir dos jogos; nunca
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
escolher, com as duplas mais enfrentadas no topo. Isso não é conveniência — o relatório de
melhor/pior dupla agrupa **pelo nome do parceiro**, então "Ana Paula" digitado de três
jeitos viraria três pessoas. Pela mesma razão, **todo nome passa por `properName()`**
(`lib/format.ts`) antes de ser gravado: "andre fiusa" vira "Andre Fiusa", com conectores
(de, da, dos) em minúscula. Parceiros e duplas podem ser editados na tela Parceiros e
duplas — corrigir ali corrige os relatórios.

**Relatórios:** aproveitamento e saldo geral, melhor/pior dupla (mínimo de 3 jogos),
desempenho por categoria, freguês e carrasco (mínimo de 2 confrontos), como foi em cada
torneio e a lista de todos os resultados.

O **placar é por set**, mostrado em formato de súmula (nossa dupla em cima, adversária
embaixo, games à direita), e o terceiro set se chama "Super Tiezão" na tela — é o super
tie-break, e é assim que se fala na quadra. Cada jogo pode ser **editado ou excluído**. A
**categoria já vem preenchida** com a última que o jogador informou (naipe começa em
Masculina), porque quem joga a C Masculina joga sempre a mesma. Níveis incluem Pro, A, B,
C, D, Iniciante e as categorias Sub 12 a Sub 18.

Ao encerrar, o app **pergunta se a pessoa quer registrar uma observação sobre a própria
performance** (`external_tournaments.notes`). Responder "não" finaliza direto; a
observação também pode ser escrita ou editada depois, na tela do torneio encerrado.

**Quem enxerga:** enquanto está em teste, só a lista de testadores — admins da plataforma
mais os ids em `EXTERNAL_TESTER_IDS` (`requireExternalTester` em `lib/admin.ts`).
Propositalmente **separado** de `PLATFORM_ADMIN_EMAILS`: liberar o teste do módulo não
pode dar de brinde o painel de administração. A identificação é por **id de usuário**, e
não por e-mail, porque este repositório é público.

A trava está na rota e nas server actions, **não no RLS** — no banco a regra é "cada um vê
o próprio histórico", que é a definitiva. Para liberar para todos, basta remover a
checagem; o banco não muda.

### Ranking do pneu e confirmação de presença
Os dois são **opcionais por grupo**, ligados em *Configurações* (`group_settings.pneu_enabled`
e `confirmations_enabled`). Nem toda turma usa — o pneu veio do grupo Cartel.

**Pneu** (`public.pneus`, ações em `app/actions/pneus.ts`): quem perde de zero leva um pneu.
Cada linha é um lançamento com `qty`, e a quantidade **pode ser negativa** para corrigir sem
apagar o histórico. A aba mostra o ranking com filtro de período (mês, trimestre, ano, tudo)
— é isso que dá validade ao ranking. Só admin lança, corrige e apaga; todo membro vê.

O pneu é lançado **automaticamente** ao salvar um placar em que o perdedor não fez nenhum
game (`aplicaPneuAutomatico` em `app/actions/tournaments.ts`). Como o placar pode ser
corrigido, o lançamento automático daquele jogo é sempre refeito do zero — por isso
`pneus.match_id` e `pneus.auto`, com índice único por (jogo, atleta). Corrigir o placar
tira o pneu de quem não merecia mais; o que o administrador lançou na mão nunca é apagado.

**Confirmação** (`public.attendance` + `tournaments.confirmations_open`): o admin abre a lista
no torneio e o pessoal marca "vou / não vou". Cada um responde por si; o admin responde por
qualquer um, porque tem gente que avisa por telefone e não abre o app.

### Jogo/Treino (`treino`)
Dia de jogos em várias quadras, com duplas esperando fora. **Não tem sorteio** — quem
entra é quem estava esperando, então o jogo só pode ser registrado depois de acontecer.
O admin cadastra as duplas do dia uma vez e depois usa um formulário só: dupla A × dupla
B + placar, em um passo (`registrarJogoTreino`). A classificação é **por atleta** e se
atualiza a cada lançamento; o pneu automático vale igual. Reaproveita `createTeamManual`
e o `phase = 'treino'` nos jogos.

### Simples (individual)
Formato `simples`: um contra um, sem duplas, todos contra todos, ranking por atleta.
Aproveita a estrutura que já existia — em `teams`, `player2_id` é opcional, então cada
atleta vira um time de uma pessoa só. A view `group_rankings` já ignora parceiro nulo, e
a exibição do nome do time cai para um nome só quando não há segundo jogador. Mínimo de
3 atletas (nos outros formatos são 4). Não tem edição de dupla no jogo, porque não há
dupla para editar.

### Rei da Praia (`lib/rei.ts`)
Rodízio individual, **pontos corridos — não tem final**. Três regras, nesta ordem de
prioridade:

1. **Todos jogam o mesmo número de jogos.** Cada partida ocupa 4 vagas, então quando
   `n % 4` dá 2 ou 3 sobra uma dupla sem adversário e o método do círculo desequilibra
   (era o bug: com 6 atletas, dois jogavam 4 e quatro jogavam 3). Nesses casos o número de
   rodadas é esticado até `rodadas × vagas` dividir por `n`.
2. **Ninguém repete parceiro** enquanto houver parceiro novo disponível.
3. **A desvantagem de pegar um parceiro frio é distribuída.** Quem volta de um descanso
   está frio e prejudica quem joga de dupla com ele; a ordem das rodadas é escolhida para
   que esse peso caia sobre todos por igual (diferença máxima de 1 entre atletas). As
   parcerias não são alteradas nesse passo — só a ordem das rodadas.

⚠️ **Com 6 atletas as regras 1 e 2 não cabem juntas na versão completa.** "Cada um joga com
cada um" seriam 15 duplas, e cada partida consome 2 — daria 7,5 partidas. Decisão do
Henrique (02/08/2026): **manter 4 jogos para todos** (6 rodadas), em que cada atleta joga
com 4 dos 5 possíveis, sem repetir ninguém. A alternativa descartada era 7 rodadas com
quatro atletas jogando 5 e dois jogando 4.

### Confirmação sem app, lista de espera e troféu do pneu
**Sem app:** `tournaments.confirm_code` + as funções públicas `public_attendance_list(code)`
e `public_attendance_set(code, member, status)` (SECURITY DEFINER, `EXECUTE` para `anon`).
Elas só respondem com o código certo **e** a lista aberta, devolvem apenas nome e resposta
— nunca e-mail ou telefone — e recusam atleta de outro grupo. Página pública `/c/[code]`;
a pessoa acha o próprio nome e responde.

**Lista de espera:** `group_settings.capacity`. Não tem tabela — quem passou da lotação é
derivado da **ordem de confirmação** (`attendance.updated_at`). Por isso, se alguém
desiste, o próximo sobe sozinho.

**Troféu:** `pneu_seasons` guarda o campeão de cada temporada. O campeão é apurado **no
servidor** a partir dos lançamentos do período — não vem pronto da tela.

### Churrasco do jogo
`tournaments.has_churrasco` (chave do admin no card) + `attendance.churrasco`.
A marcação é **independente da presença** — quem está fora da quadra também come —
por isso `attendance.status` virou anulável: existe linha só de churrasco. Quem lê
presença filtra `status = 'yes'`, então branco não conta e o convidado só-da-carne
não entra no sorteio. `public_add_churrasco_guest` cadastra quem vem só comer.

### Dupla declarada na confirmação
A lista sai em quatro blocos: confirmados com dupla, confirmados sem dupla, falta
confirmar, estão fora (a espera segue marcada dentro dos confirmados, pela hora da
resposta). No mesmo link da presença, cada um escolhe com quem vai jogar
(`public_set_partner`, `attendance.partner_member_id`). A dupla é **recíproca**
(A escolhe B ⇒ B fica com A) e **exclusiva** (ninguém rouba dupla já formada;
trocar de parceiro libera o antigo). Formar dupla confirma a presença dos dois.
O card do admin mostra as duplas e o total.

### Convidado de fora pela lista pública
No seletor de dupla dá para digitar o nome de quem não é do grupo
(`public_add_guest_partner`): entra como `group_members` com `is_guest = true`,
`invited_by` de quem trouxe, já confirmado e em dupla. Gera a mesma cobrança
pendente do outro caminho de convidado. A tela marca **convidado** embaixo do nome.

### Links públicos
Endereço legível: `/jogo/<nome-do-jogo>-<4 caracteres>` e `/convite/<...>` (`lib/slug.ts`).
Um endereço só com número aleatório assusta quem recebe — parece golpe. As duas páginas
públicas têm `generateMetadata`, então o WhatsApp mostra a prévia com o nome do jogo, o
grupo e a data; é isso que mais tira a cara de vírus. `/c/<code>` continua existindo e
redireciona para `/jogo/<code>`, para não quebrar link já enviado.

### Presença, vagas e convidados
**Confirmar presença = entrar na lista do jogo.** Um trigger (`sync_attendance_players`)
espelha `attendance` em `tournament_players`: quem confirma entra no sorteio, quem diz
"não" sai. Eram duas listas separadas e o admin repetia a seleção na mão.

**Vagas** ficam em `tournaments.capacity`, com `group_settings.capacity` de reserva. O
admin altera a qualquer momento no card de confirmação, e "Fechar vagas" iguala o limite
ao número de confirmados. A fila de espera é sempre pela **hora da confirmação**, mesmo
com a lista aparecendo em ordem alfabética — a vaga é de quem chegou primeiro.

### Convidados
Um **convidado** é quem joga com o grupo sem ser membro (`group_members.is_guest`).
Qualquer atleta gera o link em um torneio (`app/actions/guests.ts` + `guest_invites`);
a página pública `/convite/[code]` mostra jogo, horário, quadra, valor e Pix, e quem
aceita entra como convidado — nunca como membro — e já fica com presença confirmada.
Em Membros aparece a etiqueta *Convidado* com quantas vezes veio, que é o que permite
decidir quando chamar para membro. Ao confirmar, o convidado **já gera a cobrança da quadra** (`guest_fee`), sempre
**pendente** — o dinheiro só entra quando o admin confirmar o Pix. Os relatórios
**Convidados**, **Quem mais convida** e **Histórico de presença** vivem disso.

⚠️ **Permissão de função no Postgres:** revogar `EXECUTE` só de `anon` **não funciona** —
toda função nasce com `EXECUTE` para `PUBLIC` e o `anon` herda. Sempre
`revoke execute ... from public, anon` e depois `grant ... to authenticated`.

### Link de convite do grupo
`groups.invite_code` + a função `join_group_by_code(code)` (SECURITY DEFINER, porque quem
ainda não é membro não enxerga o grupo pelo RLS). A função exige login, exige código
válido, entra **sempre como `player`** e é idempotente — abrir o link duas vezes não
duplica. `EXECUTE` revogado do `anon`. A página pública é `/entrar/[code]`; o admin gera e
copia o link em Membros.

### ⚠️ Regra de e-mail
O Ligaset **não manda e-mail próprio**. Os únicos e-mails do app são os de **cadastro e
recuperação de senha**, e quem envia é o **Supabase Auth** (`signInWithOtp`, reset de
senha) — não há Resend nem serviço de envio no projeto. Ao criar qualquer recurso de
comunicação, o canal é o **WhatsApp** (link `wa.me` com o texto pronto) ou a própria tela
do app. Não reintroduza envio de e-mail sem o Henrique pedir.

### Avisos do grupo
Em **Membros → Avisar o grupo**, o admin escolhe um modelo (mensalidade, dia de play ou
texto livre), ajusta o texto e manda pelo **WhatsApp** — ou copia. É tudo no navegador,
sem back-end.

### Agenda de torneios
A tela inicial junta numa lista só os torneios das ligas do jogador e os torneios
federados dele que ainda não terminaram, ordenados por data. O botão de criar pergunta
qual dos dois tipos, porque cada um mora num lugar diferente do app.

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
