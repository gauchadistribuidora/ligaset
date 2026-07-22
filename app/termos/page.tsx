import Link from "next/link";

export const metadata = { title: "Termos de Serviço — LigaSet" };

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 text-slate-700">
      <Link href="/login" className="text-sm text-court-600">← Voltar</Link>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Termos de Serviço</h1>
      <p className="mt-1 text-sm text-slate-400">Última atualização: julho de 2026</p>

      <div className="mt-6 space-y-5 text-sm leading-relaxed">
        <p>
          Estes termos regem o uso do aplicativo <b>LigaSet</b>. Ao criar uma
          conta ou usar o serviço, você concorda com eles.
        </p>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">1. O serviço</h2>
          <p>
            O LigaSet é uma plataforma para organizar grupos esportivos:
            torneios, rankings, controle de mensalidades e comunicação entre os
            membros. O serviço é fornecido “como está”, e podemos ajustar ou
            adicionar funcionalidades ao longo do tempo.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">2. Sua conta</h2>
          <p>
            Você é responsável por manter a confidencialidade da sua senha e
            pelas atividades realizadas na sua conta. Forneça informações
            verdadeiras no cadastro e mantenha-as atualizadas.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">3. Uso adequado</h2>
          <p>
            Você concorda em não usar o LigaSet para fins ilícitos, ofensivos ou
            que violem direitos de terceiros, e a não tentar comprometer a
            segurança ou o funcionamento do serviço.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">4. Mensalidades e pagamentos</h2>
          <p>
            O LigaSet apenas <b>registra e organiza</b> as mensalidades e o
            financeiro de cada grupo. Os pagamentos são combinados e realizados
            diretamente entre os membros e o administrador do grupo (por exemplo,
            via Pix), <b>fora do aplicativo</b>. O LigaSet não processa pagamentos
            nem é parte dessas transações.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">5. Conteúdo e responsabilidade</h2>
          <p>
            O conteúdo inserido nos grupos é de responsabilidade de quem o cria.
            Na máxima extensão permitida pela lei, o LigaSet não se responsabiliza
            por perdas decorrentes do uso do serviço ou de indisponibilidades.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">6. Encerramento</h2>
          <p>
            Você pode excluir sua conta a qualquer momento em
            <b> Perfil → Excluir minha conta</b>. Podemos suspender contas que
            violem estes termos.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-bold text-slate-900">7. Foro e contato</h2>
          <p>
            Estes termos são regidos pelas leis do Brasil. Contato:{" "}
            <a className="text-court-600" href="mailto:gauchadistribuidora@gmail.com">
              gauchadistribuidora@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
