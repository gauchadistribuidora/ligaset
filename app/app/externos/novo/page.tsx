import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import ExternalTournamentForm from "@/components/ExternalTournamentForm";

export const dynamic = "force-dynamic";

export default async function NovoExternoPage() {
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  // A lista de parceiros é o que garante que o mesmo parceiro seja sempre o
  // mesmo nome — senão o relatório de melhor/pior dupla se fragmenta.
  const { data } = await supabase
    .from("external_partners")
    .select("name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const partners = (data ?? []).map((r) => r.name);

  return (
    <div>
      <PageHeader
        title="Novo torneio"
        subtitle="Um torneio disputado fora do Ligaset"
        back="/app/externos"
      />
      <ExternalTournamentForm partners={partners} />
    </div>
  );
}
