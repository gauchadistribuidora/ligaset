import Link from "next/link";
import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { EmptyState, PageHeader, Stat } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { PHASE_SHORT, resultShort, resultStyle, type Phase } from "@/lib/external";

export const dynamic = "force-dynamic";

export default async function ExternosPage() {
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  const { data } = await supabase
    .from("external_tournaments")
    .select("*, matches:external_matches(id, won)")
    .eq("user_id", user.id)
    .order("tournament_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const tournaments = (data ?? []) as any[];

  let played = 0;
  let wins = 0;
  let titles = 0;
  for (const t of tournaments) {
    if (t.champion) titles++;
    for (const m of t.matches ?? []) {
      played++;
      if (m.won) wins++;
    }
  }
  const pct = played ? Math.round((wins / played) * 100) : 0;

  const ongoing = tournaments.filter((t) => t.status === "ongoing");
  const planned = tournaments.filter((t) => t.status === "planned");
  const finished = tournaments.filter((t) => t.status === "finished");

  return (
    <div>
      <PageHeader
        title="Torneios de fora"
        subtitle="Torneios que não fazem parte do Ligaset — CBT, FGT, FGBT"
        back="/app"
      />

      <div className="mb-5 grid grid-cols-4 gap-2">
        <Stat label="Torneios" value={tournaments.length} valueClassName="text-xl" />
        <Stat label="Títulos" value={titles} valueClassName="text-xl" />
        <Stat label="Jogos" value={played} valueClassName="text-xl" />
        <Stat label="Vitórias" value={`${pct}%`} valueClassName="text-xl" />
      </div>

      <div className="mb-6 space-y-2">
        <Link href="/app/externos/novo" className="btn-primary w-full">
          ＋ Novo torneio
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/app/externos/relatorios" className="btn-ghost">
            📊 Relatórios
          </Link>
          <Link href="/app/externos/duplas" className="btn-ghost">
            🤝 Parceiros
          </Link>
        </div>
      </div>

      {!tournaments.length && (
        <EmptyState
          icon="🎾"
          title="Nenhum torneio ainda"
          desc="Cadastre um torneio que você jogou fora do Ligaset e vá lançando os jogos. O resultado final o sistema calcula sozinho."
          action={
            <Link href="/app/externos/novo" className="btn-primary">
              Cadastrar o primeiro
            </Link>
          }
        />
      )}

      {ongoing.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-bold text-slate-800">Em andamento</h2>
          <div className="space-y-2">
            {ongoing.map((t) => (
              <TournamentRow key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {planned.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-bold text-slate-800">Vou jogar</h2>
          <div className="space-y-2">
            {planned.map((t) => (
              <TournamentRow key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-slate-800">Encerrados</h2>
          <div className="space-y-2">
            {finished.map((t) => (
              <TournamentRow key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TournamentRow({ t }: { t: any }) {
  const total = (t.matches ?? []).length;
  const won = (t.matches ?? []).filter((m: any) => m.won).length;

  return (
    <Link
      href={`/app/externos/${t.id}`}
      className="card flex items-center justify-between gap-3 !p-4"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {t.champion && "🏆 "}
          {t.name}
        </p>
        <p className="truncate text-xs text-slate-500">
          {shortDate(t.tournament_date)}
          {t.category ? ` • ${t.category}` : ""}
          {t.partner_name ? ` • com ${t.partner_name}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {t.status === "planned"
            ? "Ainda não começou"
            : total
              ? `${won}V ${total - won}D`
              : "Sem jogos lançados"}
          {t.status === "ongoing" &&
            ` • ${PHASE_SHORT[t.current_phase as Phase] ?? ""}`}
        </p>
      </div>
      <span className={`chip shrink-0 ${resultStyle(t)}`}>{resultShort(t)}</span>
    </Link>
  );
}
