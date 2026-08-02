import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { PageHeader } from "@/components/ui";
import ExternalMatchForm from "@/components/ExternalMatchForm";
import ExternalOutcome, { ReopenExternalButton } from "@/components/ExternalOutcome";
import {
  DeleteExternalMatchButton,
  DeleteExternalTournamentButton,
} from "@/components/ExternalDeleteButtons";
import { shortDate } from "@/lib/format";
import {
  formatSets,
  nextPhase,
  opponentLabel,
  parseSets,
  phaseOrder,
  PHASE_LABEL,
  PHASE_TO,
  resultLabel,
  resultStyle,
  type Phase,
} from "@/lib/external";

export const dynamic = "force-dynamic";

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

  const [{ data: rawMatches }, { data: pairs }] = await Promise.all([
    supabase
      .from("external_matches")
      .select("*")
      .eq("tournament_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("external_pairs")
      .select("id, player1, player2")
      .eq("user_id", user.id)
      .order("player1", { ascending: true }),
  ]);

  const matches = (rawMatches ?? []).map((m: any) => ({
    ...m,
    set_scores: parseSets(m.set_scores),
  }));

  // Ordena por fase (grupos primeiro) mantendo a ordem de lançamento dentro dela.
  const ordered = [...matches].sort(
    (a, b) => phaseOrder(a.phase) - phaseOrder(b.phase)
  );

  const wins = matches.filter((m) => m.won).length;
  const currentPhase = t.current_phase as Phase;
  const playedCurrentPhase = matches.some((m) => m.phase === currentPhase);
  const next = nextPhase(currentPhase);

  const subtitleParts = [
    shortDate(t.tournament_date),
    t.category,
    t.partner_name ? `com ${t.partner_name}` : null,
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
            <div key={m.id} className="card flex items-center gap-3 !p-4">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${
                  m.won
                    ? "bg-court-100 text-court-700"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                {m.won ? "V" : "D"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400">
                  {PHASE_LABEL[m.phase as Phase] ?? m.phase}
                </p>
                <p className="truncate text-sm font-semibold text-slate-800">
                  {opponentLabel(m)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatSets(m.set_scores)}
                </p>
              </div>
              <DeleteExternalMatchButton tournamentId={t.id} matchId={m.id} />
            </div>
          ))}
        </section>
      )}

      {t.status !== "finished" && (
        <div className="space-y-3">
          <ExternalMatchForm
            tournamentId={t.id}
            defaultPhase={currentPhase}
            pairs={pairs ?? []}
          />
          {playedCurrentPhase && (
            <ExternalOutcome
              tournamentId={t.id}
              nextPhaseLabel={next ? PHASE_TO[next] : null}
            />
          )}
        </div>
      )}

      {t.status === "finished" && (
        <div className="space-y-3">
          <div className="card text-sm text-slate-600">
            Torneio encerrado como <strong>{resultLabel(t)}</strong>. Precisa
            corrigir alguma coisa? Reabra, ajuste os jogos e encerre de novo.
          </div>
          <ReopenExternalButton tournamentId={t.id} />
        </div>
      )}

      <div className="mt-8">
        <DeleteExternalTournamentButton tournamentId={t.id} />
      </div>
    </div>
  );
}
