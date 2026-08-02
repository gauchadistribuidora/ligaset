import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import ExternalTournamentForm from "@/components/ExternalTournamentForm";

export const dynamic = "force-dynamic";

export default async function NovoExternoPage() {
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  // Sugestões a partir do que já foi cadastrado, para o nome do parceiro sair
  // sempre igual e o relatório de duplas não fragmentar por causa de digitação.
  const { data } = await supabase
    .from("external_tournaments")
    .select("partner_name")
    .eq("user_id", user.id);

  const partners = [
    ...new Set(
      (data ?? []).map((r) => r.partner_name?.trim()).filter(Boolean) as string[]
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

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
