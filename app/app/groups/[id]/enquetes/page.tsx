import { getGroupContext } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";
import Enquete from "@/components/Enquete";
import NovaEnquete from "@/components/NovaEnquete";

export const dynamic = "force-dynamic";

export default async function EnquetesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isAdmin } = await getGroupContext(id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: polls }, { data: atletas }, { data: eu }] = await Promise.all([
    supabase
      .from("polls")
      .select("id, pergunta, aberta, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_members")
      .select("id, name")
      .eq("group_id", id)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("group_members")
      .select("id")
      .eq("group_id", id)
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  const ids = (polls ?? []).map((p) => p.id);
  const { data: votos } = ids.length
    ? await supabase
        .from("poll_votes")
        .select("poll_id, voter_id, choice_id")
        .in("poll_id", ids)
    : { data: [] as any[] };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Enquetes"
        subtitle="Palpite do grupo antes da rodada"
        back={`/app/groups/${id}`}
      />

      {isAdmin && <NovaEnquete groupId={id} />}

      {(polls ?? []).length ? (
        (polls ?? []).map((p: any) => (
          <Enquete
            key={p.id}
            groupId={id}
            poll={p}
            atletas={atletas ?? []}
            votos={(votos ?? []).filter((v: any) => v.poll_id === p.id)}
            meuMemberId={eu?.id ?? null}
            isAdmin={isAdmin}
          />
        ))
      ) : (
        <EmptyState
          icon="🗳️"
          title="Nenhuma enquete ainda"
          desc={
            isAdmin
              ? "Crie uma para o pessoal palpitar quem vai ser o destaque ou levar o pneu."
              : "Quando o administrador criar uma, ela aparece aqui."
          }
        />
      )}
    </div>
  );
}
