import Link from "next/link";
import { notFound } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { EmptyState, PageHeader, Stat } from "@/components/ui";
import { shortDate } from "@/lib/format";
import {
  balance,
  categoryRanking,
  formatSets,
  MIN_MATCHES_OPPONENT,
  MIN_MATCHES_RANKING,
  opponentLabel,
  opponentRanking,
  parseSets,
  partnerRanking,
  phaseOrder,
  PHASE_SHORT,
  resultLabel,
  resultStyle,
  winRate,
  type ExternalMatch,
  type OpponentStats,
  type PartnerStats,
  type Phase,
} from "@/lib/external";

export const dynamic = "force-dynamic";

export default async function RelatoriosExternosPage() {
  const ctx = await requireExternalTester();
  if (!ctx) notFound();
  const { supabase, user } = ctx;

  const { data } = await supabase
    .from("external_tournaments")
    .select("*, matches:external_matches(*)")
    .eq("user_id", user.id)
    .order("tournament_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const tournaments = ((data ?? []) as any[]).map((t) => ({
    ...t,
    matches: (t.matches ?? []).map((m: any) => ({
      ...m,
      set_scores: parseSets(m.set_scores),
    })) as ExternalMatch[],
  }));

  const allMatches = tournaments.flatMap((t) =>
    (t.matches as ExternalMatch[]).map((m) => ({ ...m, tournament: t }))
  );

  if (!allMatches.length) {
    return (
      <div>
        <PageHeader
          title="Relatórios"
          subtitle="Torneios de fora"
          back="/app/externos"
        />
        <EmptyState
          icon="📊"
          title="Ainda não há jogos lançados"
          desc="Assim que você lançar os primeiros jogos, os relatórios aparecem aqui automaticamente."
          action={
            <Link href="/app/externos/novo" className="btn-primary">
              Cadastrar torneio
            </Link>
          }
        />
      </div>
    );
  }

  const wins = allMatches.filter((m) => m.won).length;
  const titles = tournaments.filter((t) => t.champion).length;
  const gamesFor = allMatches.reduce((s, m) => s + (m.games_for ?? 0), 0);
  const gamesAgainst = allMatches.reduce((s, m) => s + (m.games_against ?? 0), 0);

  const { ranked, few } = partnerRanking(
    tournaments
      .filter((t) => t.matches.length)
      .map((t) => ({
        partner: t.partner_name ?? "",
        matches: t.matches,
      }))
  );

  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  const categories = categoryRanking(tournaments);

  const { ranked: opponents, few: fewOpponents } = opponentRanking(
    allMatches as ExternalMatch[]
  );
  const fregues = opponents[0];
  const carrasco = opponents.length > 1 ? opponents[opponents.length - 1] : null;

  const finished = tournaments.filter((t) => t.status === "finished");

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Torneios de fora"
        back="/app/externos"
      />

      <div className="mb-6 grid grid-cols-2 gap-2">
        <Stat
          label="Aproveitamento"
          value={`${Math.round((wins / allMatches.length) * 100)}%`}
          hint={`${wins}V ${allMatches.length - wins}D em ${allMatches.length} jogos`}
        />
        <Stat
          label="Saldo de games"
          value={`${gamesFor - gamesAgainst > 0 ? "+" : ""}${gamesFor - gamesAgainst}`}
          hint={`${gamesFor} a favor / ${gamesAgainst} contra`}
        />
        <Stat label="Torneios" value={tournaments.length} valueClassName="text-xl" />
        <Stat label="Títulos 🏆" value={titles} valueClassName="text-xl" />
      </div>

      {/* 1 e 2 — melhor e pior dupla */}
      <section className="mb-6">
        <h2 className="mb-2 font-bold text-slate-800">Duplas</h2>

        {best ? (
          <div className="mb-3 grid gap-2">
            <HighlightCard
              icon="🥇"
              title="Melhor dupla"
              name={best.partner}
              stats={best}
              tone="bg-court-50 ring-court-100"
            />
            {worst && (
              <HighlightCard
                icon="🥶"
                title="Pior dupla"
                name={worst.partner}
                stats={worst}
                tone="bg-rose-50 ring-rose-100"
              />
            )}
          </div>
        ) : (
          <div className="card mb-3 text-sm text-slate-500">
            Nenhum parceiro atingiu {MIN_MATCHES_RANKING} jogos ainda — abaixo
            disso, um único resultado distorceria o ranking.
          </div>
        )}

        {ranked.length > 0 && (
          <div className="card !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="p-3 text-left font-medium">Parceiro(a)</th>
                  <th className="p-3 text-center font-medium">J</th>
                  <th className="p-3 text-center font-medium">V</th>
                  <th className="p-3 text-center font-medium">%</th>
                  <th className="p-3 text-center font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((p) => (
                  <tr key={p.partner} className="border-b border-slate-50 last:border-0">
                    <td className="p-3 font-semibold text-slate-800">{p.partner}</td>
                    <td className="p-3 text-center text-slate-500">{p.played}</td>
                    <td className="p-3 text-center text-slate-500">{p.wins}</td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {winRate(p)}%
                    </td>
                    <td className="p-3 text-center text-slate-500">
                      {balance(p) > 0 ? "+" : ""}
                      {balance(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {few.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            Fora do ranking por terem menos de {MIN_MATCHES_RANKING} jogos:{" "}
            {few.map((p) => `${p.partner} (${p.played})`).join(", ")}.
          </p>
        )}
      </section>

      {/* 3 — desempenho por categoria */}
      <section className="mb-6">
        <h2 className="mb-2 font-bold text-slate-800">Por categoria</h2>
        {categories.length ? (
          <div className="card !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="p-3 text-left font-medium">Categoria</th>
                  <th className="p-3 text-center font-medium">J</th>
                  <th className="p-3 text-center font-medium">%</th>
                  <th className="p-3 text-center font-medium">Saldo</th>
                  <th className="p-3 text-center font-medium">🏆</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr
                    key={c.category}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="p-3 font-semibold text-slate-800">
                      {c.category}
                    </td>
                    <td className="p-3 text-center text-slate-500">{c.played}</td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {winRate(c)}%
                    </td>
                    <td className="p-3 text-center text-slate-500">
                      {balance(c) > 0 ? "+" : ""}
                      {balance(c)}
                    </td>
                    <td className="p-3 text-center text-slate-500">
                      {c.titles || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-sm text-slate-500">
            Preencha a categoria ao cadastrar o torneio para este relatório
            aparecer.
          </div>
        )}
      </section>

      {/* 4 — freguês e carrasco */}
      <section className="mb-6">
        <h2 className="mb-2 font-bold text-slate-800">Freguês e carrasco</h2>
        {fregues ? (
          <>
            <div className="mb-3 grid gap-2">
              <HighlightCard
                icon="🍬"
                title="Freguês — a dupla que você mais vence"
                name={fregues.opponent}
                stats={fregues}
                tone="bg-court-50 ring-court-100"
              />
              {carrasco && (
                <HighlightCard
                  icon="😤"
                  title="Carrasco — a dupla que mais te vence"
                  name={carrasco.opponent}
                  stats={carrasco}
                  tone="bg-rose-50 ring-rose-100"
                />
              )}
            </div>
            <div className="card !p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="p-3 text-left font-medium">Dupla</th>
                    <th className="p-3 text-center font-medium">J</th>
                    <th className="p-3 text-center font-medium">V</th>
                    <th className="p-3 text-center font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {opponents.map((o) => (
                    <tr
                      key={o.opponent}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="p-3 font-semibold text-slate-800">
                        {o.opponent}
                      </td>
                      <td className="p-3 text-center text-slate-500">
                        {o.played}
                      </td>
                      <td className="p-3 text-center text-slate-500">{o.wins}</td>
                      <td className="p-3 text-center font-bold text-slate-800">
                        {winRate(o)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="card text-sm text-slate-500">
            Este relatório aparece quando você enfrentar a mesma dupla pelo menos{" "}
            {MIN_MATCHES_OPPONENT} vezes.
          </div>
        )}
        {fewOpponents.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            {fewOpponents.length} dupla(s) enfrentada(s) uma única vez ainda não
            entram nesta conta.
          </p>
        )}
      </section>

      {/* 5 — como foi em cada torneio */}
      <section className="mb-6">
        <h2 className="mb-2 font-bold text-slate-800">Como foi em cada torneio</h2>
        {finished.length ? (
          <div className="card space-y-2 !p-4">
            {finished.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {t.champion && "🏆 "}
                    {t.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {shortDate(t.tournament_date)}
                    {t.category ? ` • ${t.category}` : ""}
                  </p>
                </div>
                <span className={`chip shrink-0 ${resultStyle(t)}`}>
                  {resultLabel(t)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-sm text-slate-500">
            Nenhum torneio encerrado ainda. Use o botão “Foi eliminada” ou termine
            a final para o torneio entrar aqui.
          </div>
        )}
      </section>

      {/* 4 — todos os resultados */}
      <section>
        <h2 className="mb-2 font-bold text-slate-800">Todos os resultados</h2>
        <div className="space-y-2">
          {allMatches
            .slice()
            .sort((a, b) => {
              const da = a.tournament.tournament_date ?? "";
              const db = b.tournament.tournament_date ?? "";
              if (da !== db) return db.localeCompare(da);
              return phaseOrder(a.phase) - phaseOrder(b.phase);
            })
            .map((m) => (
              <div key={m.id} className="card flex items-center gap-3 !p-4">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                    m.won
                      ? "bg-court-100 text-court-700"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {m.won ? "V" : "D"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {opponentLabel(m)}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {m.tournament.name} •{" "}
                    {PHASE_SHORT[m.phase as Phase] ?? m.phase}
                    {m.tournament.partner_name
                      ? ` • com ${m.tournament.partner_name}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-500">
                  {formatSets(m.set_scores)}
                </span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

function HighlightCard({
  icon,
  title,
  name,
  stats,
  tone,
}: {
  icon: string;
  title: string;
  name: string;
  stats: PartnerStats | OpponentStats;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            {icon} {title}
          </p>
          <p className="truncate text-lg font-black text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">
            {stats.wins}V {stats.losses}D em {stats.played} jogos • saldo{" "}
            {balance(stats) > 0 ? "+" : ""}
            {balance(stats)}
          </p>
        </div>
        <span className="shrink-0 text-2xl font-black text-slate-800">
          {winRate(stats)}%
        </span>
      </div>
    </div>
  );
}
