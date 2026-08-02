import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import ExternalPairForm, {
  DeleteExternalPairButton,
} from "@/components/ExternalPairForm";
import ExternalPartnerForm, {
  DeleteExternalPartnerButton,
} from "@/components/ExternalPartnerForm";
import { pairLabel } from "@/lib/external";

export const dynamic = "force-dynamic";

export default async function ParceirosEDuplasPage() {
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  const [{ data: partners }, { data: pairs }] = await Promise.all([
    supabase
      .from("external_partners")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("external_pairs")
      .select("id, player1, player2")
      .eq("user_id", user.id)
      .order("player1", { ascending: true }),
  ]);

  return (
    <div>
      <PageHeader
        title="Parceiros e duplas"
        subtitle="Cadastre uma vez e escolha na hora de lançar"
        back="/app/externos"
      />

      <section className="mb-8">
        <h2 className="mb-2 font-bold text-slate-800">Meus parceiros</h2>
        <p className="mb-3 text-sm text-slate-500">
          É por este nome que o relatório de melhor e pior dupla junta os jogos.
          Escolhendo da lista, o mesmo parceiro nunca vira duas pessoas
          diferentes.
        </p>

        <div className="mb-3">
          <ExternalPartnerForm />
        </div>

        {partners?.length ? (
          <div className="space-y-2">
            {partners.map((p) => (
              <div key={p.id} className="card flex items-center gap-3 !p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-court-50 text-sm">
                  🤝
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                  {p.name}
                </p>
                <DeleteExternalPartnerButton partnerId={p.id} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-sm text-slate-500">
            Nenhum parceiro cadastrado ainda. O nome que você digitar ao criar um
            torneio entra aqui sozinho.
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold text-slate-800">Duplas adversárias</h2>
        <p className="mb-3 text-sm text-slate-500">
          Em torneio se joga sempre contra as mesmas duplas. Cadastre e depois é
          só escolher ao lançar o jogo.
        </p>

        <div className="mb-3">
          <ExternalPairForm />
        </div>

        {pairs?.length ? (
          <div className="space-y-2">
            {pairs.map((p) => (
              <div key={p.id} className="card flex items-center gap-3 !p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ocean-900/5 text-sm">
                  🎾
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                  {pairLabel(p)}
                </p>
                <DeleteExternalPairButton pairId={p.id} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-sm text-slate-500">
            Nenhuma dupla cadastrada. Toda dupla que você digitar ao lançar um
            jogo entra nesta lista sozinha.
          </div>
        )}
      </section>
    </div>
  );
}
