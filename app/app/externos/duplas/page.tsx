import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { EmptyState, PageHeader } from "@/components/ui";
import ExternalPairForm, {
  DeleteExternalPairButton,
} from "@/components/ExternalPairForm";
import { pairLabel } from "@/lib/external";

export const dynamic = "force-dynamic";

export default async function DuplasPage() {
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  const { data } = await supabase
    .from("external_pairs")
    .select("id, player1, player2")
    .eq("user_id", user.id)
    .order("player1", { ascending: true });

  const pairs = data ?? [];

  return (
    <div>
      <PageHeader
        title="Duplas adversárias"
        subtitle="Cadastre uma vez e escolha na hora de lançar o jogo"
        back="/app/externos"
      />

      <div className="mb-5">
        <ExternalPairForm />
      </div>

      {pairs.length ? (
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
        <EmptyState
          icon="🎾"
          title="Nenhuma dupla cadastrada"
          desc="Você também não precisa cadastrar aqui: toda dupla que digitar ao lançar um jogo entra nesta lista sozinha."
        />
      )}
    </div>
  );
}
