# LigaSet — Checklist para publicar na App Store e Google Play

## ✅ Já pronto no app (nesta entrega)
- **Política de Privacidade** pública: `https://www.ligaset.com.br/privacidade`
- **Termos de Serviço** públicos: `https://www.ligaset.com.br/termos`
- **Exclusão de conta dentro do app**: Perfil → “Excluir minha conta” (exigência da Apple)
- **Ícone 1024×1024** (enviado no chat — fundo branco opaco, sem transparência)
- Ícones do PWA, favicon e manifest atualizados com o logo novo

## ⚠️ Ação necessária: 1 variável de ambiente
A exclusão de conta usa uma chave secreta do Supabase. No **Vercel → Settings →
Environment Variables**, adicione:
- `SUPABASE_SERVICE_ROLE_KEY` = a chave **secreta** do projeto
  (Supabase → Project Settings → API Keys → *secret* `sb_secret_...`, ou a
  *service_role* legada). Depois, redeploy.
> Sem essa chave, o botão “Excluir minha conta” avisa que está indisponível.
> **Nunca** coloque essa chave no código do cliente nem em variáveis `NEXT_PUBLIC_`.

## Como transformar o PWA em app das lojas
O LigaSet é um PWA. O caminho mais rápido para gerar os pacotes das lojas:

### Opção A — PWABuilder (recomendado, grátis)
1. Acesse https://www.pwabuilder.com e informe `https://www.ligaset.com.br`.
2. Ele analisa o manifest/ícones (já estão prontos) e gera:
   - **Android**: um pacote `.aab` (Trusted Web Activity) pronto para o Google Play.
   - **iOS**: um projeto Xcode (WebView) para enviar à App Store.
3. Baixe cada pacote e siga o passo a passo que o próprio PWABuilder mostra.

### Opção B — Capacitor (mais controle)
Empacota o site num app nativo iOS/Android. Exige Xcode (Mac) e Android Studio.
Melhor se no futuro quiser recursos nativos (push, câmera nativa, etc.).

## Contas de desenvolvedor (você precisa criar)
- **Apple Developer Program** — US$ 99/ano — https://developer.apple.com
- **Google Play Console** — US$ 25 (pagamento único) — https://play.google.com/console

## Ficha da loja (store listing)
- **Nome**: LigaSet
- **Categoria**: Esportes
- **Descrição** (sugestão): “Organize seu grupo esportivo em um só lugar:
  torneios com chaveamento automático, rankings, mensalidades, controle
  financeiro e comunicação por e-mail. Ideal para beach tennis, padel, vôlei e
  futevôlei.”
- **Screenshots**: faltam (posso gerar com você a partir do app no ar, nos
  tamanhos exigidos — iPhone 6.7" e 6.5", e telefone Android).
- **Classificação etária**: Livre / 4+.
- **URL de suporte / e-mail**: gauchadistribuidora@gmail.com

## Formulários de privacidade das lojas
### Google Play — “Segurança dos dados”
Declarar que o app **coleta**: nome, e-mail, telefone, fotos (perfil/logo) e
informações do perfil (estado/cidade/esporte — **digitadas pelo usuário, não
localização por GPS**). **Não** compartilha com terceiros para fins próprios,
**não** exibe anúncios, **não** rastreia. Dados trafegam criptografados e o
usuário pode **solicitar exclusão** (há função no app).
### Apple — “Nutrition labels” (App Privacy)
Mesmas categorias: Contato (nome, e-mail, telefone), Fotos, Identificadores de
conta. **Sem rastreamento** (No Tracking). Uso: funcionamento do app.

## Observações para a revisão da Apple (importante)
- **Mensalidades**: são apenas **registradas** no app e pagas por fora (Pix).
  Não há venda de conteúdo digital, então **não** é exigido o pagamento in-app da
  Apple. Explique isso nas “Notes for Review”.
- Forneça uma **conta de teste** (e-mail + senha) para o revisor entrar.
- Login: apenas e-mail/senha (o Google está desativado hoje). Se um dia ativar
  “Entrar com Google”, a Apple passará a exigir também “Entrar com a Apple”.

## Pendências que posso fazer com você
- Gerar os **screenshots** nos tamanhos das lojas.
- Ajustar textos da ficha, palavras-chave, etc.
- Rever a Política/Termos (recomendo uma leitura de um advogado; os textos atuais
  são um ponto de partida sólido, não aconselhamento jurídico).
