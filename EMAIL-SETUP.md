# LigaSet — Configuração de e-mail e novas funcionalidades

Este guia acompanha as mudanças de código feitas para: recuperação de senha,
convites por e-mail, notificações e edição de torneios encerrados.

## O que já foi feito no código

1. **Editar torneio encerrado** ✅ (funciona sem nenhuma configuração)
   Na tela de um torneio finalizado agora aparece o botão
   **"✏️ Reabrir para corrigir placares"**. Ele volta o torneio para "em
   andamento", você corrige o placar errado e clica em "🏁 Encerrar torneio"
   de novo. Não precisa mais excluir e recriar.

2. **Recuperação de senha** ✅ (o código já existia; falta a *entrega* do e-mail — ver abaixo)
   No login, "Esqueci a senha" envia o e-mail de redefinição e leva para a
   página de criar nova senha.

3. **Convites por e-mail** ✅ (código pronto; entrega do e-mail — ver abaixo)
   Em **Membros**, o admin tem agora **"✉️ Convidar por e-mail"**: cole um ou
   vários e-mails de uma vez. Quem ainda não está no grupo entra como jogador
   automaticamente e recebe o link de acesso.

4. **Notificações por e-mail** ✅ (precisa da chave do Resend — ver abaixo)
   Quando um torneio é **encerrado**, os participantes com e-mail recebem um
   aviso com o campeão e link para a classificação.

> **Importante:** os itens 2, 3 e 4 dependem de **envio de e-mail configurado**.
> Hoje o Supabase usa um remetente de teste com limite baixíssimo (poucos
> e-mails por hora, e muitos caem em spam). Por isso os passos abaixo.

---

## Passo 1 — Resend (JÁ FEITO ✅)

A conta do Resend já existe e o domínio **gauchadistribuidora.com.br** já está
**verificado** (envio habilitado, região São Paulo). A chave de API já foi
gerada. Por isso os e-mails saem de `no-reply@gauchadistribuidora.com.br`.

> Opcional (marca): se quiser que os e-mails saiam de `@ligaset.com.br`,
> adicione esse domínio em **Resend → Domains → Add Domain**, configure os
> registros DNS que ele mostrar e, quando ficar *Verified*, troque o
> `EMAIL_FROM` para `LigaSet <no-reply@ligaset.com.br>`.

## Passo 2 — Notificações: variáveis de ambiente no Vercel

No painel do Vercel do projeto ligaset → **Settings → Environment Variables**,
adicione (para Production e Preview):

| Nome | Valor |
|------|-------|
| `RESEND_API_KEY` | a chave `re_...` do Passo 1 |
| `EMAIL_FROM` | `LigaSet <no-reply@gauchadistribuidora.com.br>` |
| `NEXT_PUBLIC_SITE_URL` | `https://ligaset.com.br` |

Depois de salvar, faça um **redeploy** (ou o próximo push já pega).

> Se você **não** configurar `RESEND_API_KEY`, o app continua funcionando
> normalmente — só não envia as notificações (nada quebra).

## Passo 3 — Recuperação de senha e convites: SMTP no Supabase

Estes e-mails saem pelo **Supabase Auth** (não pelo Resend do app). Para eles
chegarem de verdade, configure o SMTP do Resend dentro do Supabase:

1. No Resend, em **SMTP**, pegue os dados:
   - Host: `smtp.resend.com`
   - Porta: `465` (SSL) ou `587`
   - Usuário: `resend`
   - Senha: a **mesma API key** `re_...` (a que você já tem)
2. No Supabase → **Project Settings → Authentication → SMTP Settings**:
   - Ative **Enable Custom SMTP**.
   - Sender email: `no-reply@gauchadistribuidora.com.br`
   - Sender name: `LigaSet`
   - Preencha host/porta/usuário/senha acima.
   - Salve.
3. Ainda no Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `https://ligaset.com.br`
   - **Redirect URLs:** adicione (uma por linha):
     - `https://ligaset.com.br/auth/callback`
     - `https://ligaset.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (para testes locais)

   > Sem isso, o link do e-mail de recuperação/convite pode dar erro de
   > "redirect não permitido".

## Passo 4 — Publicar as mudanças de código

No **GitHub Desktop**, faça **Commit** das mudanças e **Push**. O Vercel
republica sozinho. Arquivos alterados/criados nesta entrega:

- `lib/email.ts` (novo) — envio via Resend
- `lib/notify.ts` (novo) — notificação de torneio encerrado
- `components/ReopenTournamentButton.tsx` (novo)
- `components/InviteBox.tsx` (novo)
- `app/actions/tournaments.ts` — dispara notificação ao encerrar
- `app/actions/groups.ts` — ação `inviteEmails` (convite em massa)
- `app/app/groups/[id]/tournaments/[tid]/page.tsx` — botão reabrir + aviso
- `app/app/groups/[id]/members/page.tsx` — caixa de convite
- `.env.local.example` — novas variáveis documentadas

---

## Como testar depois de configurar

- **Senha:** login → "Esqueci a senha" → chega o e-mail → cria nova senha.
- **Convite:** grupo → Membros → "Convidar por e-mail" → cole um e-mail seu →
  chega o link → entra e define a senha.
- **Notificação:** encerre um torneio com participantes que tenham e-mail →
  eles recebem o resultado.
- **Editar encerrado:** abra um torneio finalizado → "Reabrir para corrigir
  placares" → ajuste → encerrar de novo.
