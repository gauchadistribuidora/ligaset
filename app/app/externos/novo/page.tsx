import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import ExternalTournamentForm from "@/components/ExternalTournamentForm";
import type { ExternalEvent } from "@/lib/external";

export const dynamic = "force-dynamic";

export default async function NovoExternoPage() {
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  const [{ data: partnerRows }, { data: tournamentRows }] = await Promise.all([
    // A lista de parceiros é o que garante que o mesmo parceiro seja sempre o
    // mesmo nome — senão o relatório de melhor/pior dupla se fragmenta.
    supabase
      .from("external_partners")
      .select("name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    // Torneios que se repetem no ano: a lista sai do que já foi cadastrado,
    // guardando a federação da edição mais recente.
    supabase
      .from("external_tournaments")
      .select("name, federation, tournament_date")
      .eq("user_id", user.id)
      .order("tournament_date", { ascending: false, nullsFirst: false }),
  ]);

  const partners = (partnerRows ?? []).map((r) => r.name);

  const byName = new Map<string, string | null>();
  for (const r of tournamentRows ?? []) {
    if (!byName.has(r.name)) byName.set(r.name, r.federation ?? null);
  }
  const events: ExternalEvent[] = [...byName.entries()]
    .map(([name, federation]) => ({ name, federation }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div>
      <PageHeader
        title="Novo torneio"
        subtitle="Um torneio disputado fora do Ligaset"
        back="/app/externos"
      />
      <ExternalTournamentForm partners={partners} events={events} />
    </div>
  );
}
