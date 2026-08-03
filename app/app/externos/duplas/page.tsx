import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import ExternalPairForm, {
  ExternalPairRow,
} from "@/components/ExternalPairForm";
import ExternalPartnerForm, {
  ExternalPartnerRow,
} from "@/components/ExternalPartnerForm";
import { pairKey, pairMatchCounts, sortPairsByRelevance } from "@/lib/external";

export const dynamic = "force-dynamic";

export default async function ParceirosEDuplasPage() {
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  const [{ data: partners }, { data: rawPairs }, { data: matches }] =
    await Promise.all([
      supabase
        .from("external_partners")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("external_pairs")
        .select("id, player1, player2")
        .eq("user_id", user.id),
      // O RLS já limita aos jogos do próprio jogador.
      supabase.from("external_matches").select("opponent1, opponent2"),
    ]);

  const counts = pairMatchCounts(matches ?? []);
  const pairs = sortPairsByRelevance(rawPairs ?? [], counts);

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
              <ExternalPartnerRow key={p.id} partner={p} />
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
          Em ordem de quantas vezes você já as enfrentou. Toque em Editar para
          corrigir um nome — a correção vale para os relatórios também.
        </p>

        <div className="mb-3">
          <ExternalPairForm />
        </div>

        {pairs.length ? (
          <div className="space-y-2">
            {pairs.map((p) => (
              <ExternalPairRow
                key={p.id}
                pair={p}
                matches={counts.get(pairKey(p.player1, p.player2)) ?? 0}
              />
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
