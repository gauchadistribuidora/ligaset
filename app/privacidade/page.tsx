import Link from "next/link";

export const metadata = { title: "Política de Privacidade — LigaSet" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-slate-700">
      <Link href="/login" className="text-sm text-court-600">← Voltar</Link>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-slate-400">Última atualização: julho de 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed">
        <p>
          Esta política explica como o <b>LigaSet</b> (“aplicativo”, “nós”)
          coleta, usa e protege os dados de quem utiliza o serviço. Ao usar o
          LigaSet, você concorda com as práticas descritas aqui.
        </p>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">1. Dados que coletamos</h2>
          <p>
            Coletamos os dados que você fornece ao criar sua conta e usar o app:
            nome, e-mail, celular, estado, cidade, esporte praticado e, se você
            enviar, uma foto de perfil. Também registramos dados gerados no uso:
            grupos dos quais participa, torneios, partidas, resultados,
            classificações e informações de mensalidades/financeiro do grupo.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">2. Como usamos os dados</h2>
          <p>
            Usamos seus dados para operar o aplicativo: autenticar seu acesso,
            exibir seus grupos e estatísticas, organizar torneios e rankings,
            controlar mensalidades e enviar comunicações por e-mail relacionadas
            ao seu grupo (convites, avisos, recuperação de senha e informativos).
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">3. Compartilhamento</h2>
          <p>
            Não vendemos seus dados e não exibimos anúncios. Alguns dados (como
            seu nome, foto e estatísticas) ficam visíveis para os demais membros
            dos grupos dos quais você participa. Utilizamos provedores de
            infraestrutura para operar o serviço — <b>Supabase</b> (banco de
            dados e autenticação) e <b>Resend</b> (envio de e-mails) — que tratam
            os dados apenas para prestar esses serviços a nós.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">4. Seus direitos (LGPD)</h2>
          <p>
            Você pode acessar, corrigir ou excluir seus dados a qualquer momento.
            A edição é feita na tela de perfil. A exclusão da conta e de todos os
            dados associados pode ser feita pelo próprio app, em
            <b> Perfil → Excluir minha conta</b>, ou solicitada pelo e-mail
            abaixo.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">5. Segurança e retenção</h2>
          <p>
            Adotamos medidas técnicas para proteger seus dados e os mantemos
            enquanto sua conta estiver ativa. Ao excluir a conta, os dados
            pessoais associados são removidos.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">6. Crianças</h2>
          <p>
            O LigaSet não é direcionado a menores de 13 anos. Não coletamos
            intencionalmente dados de crianças abaixo dessa idade.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">7. Contato</h2>
          <p>
            Dúvidas ou solicitações sobre privacidade:{" "}
            <a className="text-court-600" href="mailto:gauchadistribuidora@gmail.com">
              gauchadistribuidora@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
