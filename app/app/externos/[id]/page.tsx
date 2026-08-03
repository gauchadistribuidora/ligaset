import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import ExternalMatchForm from "@/components/ExternalMatchForm";
import ExternalMatchRow from "@/components/ExternalMatchRow";
import ExternalNotes from "@/components/ExternalNotes";
import ExternalOutcome, {
  ReopenExternalButton,
  StartExternalButton,
} from "@/components/ExternalOutcome";
import { DeleteExternalTournamentButton } from "@/components/ExternalDeleteButtons";
import { shortDate } from "@/lib/format";
import {
  nextPhase,
  pairMatchCounts,
  parseSets,
  phaseOrder,
  resultLabel,
  resultStyle,
  sortPairsByRelevance,
  type ExternalMatch,
  type Phase,
} from "@/lib/external";

export const dynamic = "force-dynamic";

// "Henrique Nunes" -> "Henrique". Nome curto cabe melhor no placar do celular.
function firstName(full: string | null | undefined): string {
  return full?.trim().split(/\s+/)[0] ?? "";
}

export default async function ExternalTournamentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  const { data: t } = await supabase
    .from("external_tournaments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!t) notFound();

  const [
    { data: rawMatches },
    { data: rawPairs },
    { data: profile },
    { data: allMatches },
  ] = await Promise.all([
    supabase
      .from("external_matches")
      .select("*")
      .eq("tournament_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("external_pairs")
      .select("id, player1, player2")
      .eq("user_id", user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    // Todos os jogos do jogador (o RLS limita), só para saber quais duplas ele
    // mais enfrenta e subir essas no seletor.
    supabase.from("external_matches").select("opponent1, opponent2"),
  ]);

  const pairs = sortPairsByRelevance(
    rawPairs ?? [],
    pairMatchCounts(allMatches ?? [])
  );

  const matches = (rawMatches ?? []).map((m: any) => ({
    ...m,
    set_scores: parseSets(m.set_scores),
  })) as ExternalMatch[];

  // Ordena por fase (grupos primeiro) mantendo a ordem de lançamento dentro dela.
  const ordered = [...matches].sort(
    (a, b) => phaseOrder(a.phase) - phaseOrder(b.phase)
  );

  const wins = matches.filter((m) => m.won).length;
  const currentPhase = t.current_phase as Phase;
  const playedCurrentPhase = matches.some((m) => m.phase === currentPhase);
  const next = nextPhase(currentPhase);

  const myPair = [firstName(profile?.full_name) || "Eu", firstName(t.partner_name)]
    .filter(Boolean)
    .join(" / ");

  const subtitleParts = [
    t.federation,
    shortDate(t.tournament_date),
    t.category,
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title={t.name}
        subtitle={subtitleParts.join(" • ")}
        back="/app/externos"
      />

      <div className="mb-5 flex items-center justify-between gap-3">
        <span className={`chip ${resultStyle(t)}`}>
          {t.champion && "🏆 "}
          {resultLabel(t)}
        </span>
        <span className="text-sm text-slate-500">
          {matches.length ? `${wins}V ${matches.length - wins}D` : "Sem jogos"}
        </span>
      </div>

      {ordered.length > 0 && (
        <section className="mb-5 space-y-2">
          {ordered.map((m) => (
            <ExternalMatchRow
              key={m.id}
              tournamentId={t.id}
              match={m}
              myPair={myPair}
            />
          ))}
        </section>
      )}

      {t.status === "planned" && (
        <div className="space-y-3">
          <div className="card text-sm text-slate-600">
            Este torneio está na sua agenda e ainda não começou. Quando chegar o
            dia, comece por aqui para liberar o lançamento dos jogos.
          </div>
          <StartExternalButton tournamentId={t.id} />
        </div>
      )}

      {t.status === "ongoing" && (
        <div className="space-y-3">
          <ExternalMatchForm
            tournamentId={t.id}
            defaultPhase={currentPhase}
            pairs={pairs}
          />
          {playedCurrentPhase && (
            <ExternalOutcome tournamentId={t.id} canAdvance={!!next} />
          )}
        </div>
      )}

      {t.status === "finished" && (
        <div className="space-y-3">
          <div className="card text-sm text-slate-600">
            Torneio encerrado como <strong>{resultLabel(t)}</strong>. Precisa
            corrigir alguma coisa? Reabra, ajuste os jogos e encerre de novo.
          </div>
          <ExternalNotes tournamentId={t.id} notes={t.notes} />
          <ReopenExternalButton tournamentId={t.id} />
        </div>
      )}

      <div className="mt-8">
        <DeleteExternalTournamentButton tournamentId={t.id} />
      </div>
    </div>
  );
}
