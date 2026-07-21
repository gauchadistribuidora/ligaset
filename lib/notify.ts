// Notificações por e-mail do app. Todas as funções são "best effort":
// nunca lançam erro e não bloqueiam a ação principal se o e-mail falhar.
import { sendEmail, emailLayout, emailEnabled } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ligaset.com.br";

function teamName(t: any): string {
  if (!t) return "—";
  if (t.name) return t.name;
  const a = t.player1?.name?.split(" ")[0] || "?";
  const b = t.player2?.name?.split(" ")[0] || "?";
  return `${a} & ${b}`;
}

// Campeão do torneio (melhor esforço; retorna null se não der pra determinar).
async function championOf(
  supabase: any,
  tournamentId: string
): Promise<string | null> {
  try {
    const [{ data: teams }, { data: matches }] = await Promise.all([
      supabase
        .from("teams")
        .select(
          "id, name, player1:group_members!teams_player1_member_fkey(name), player2:group_members!teams_player2_member_fkey(name)"
        )
        .eq("tournament_id", tournamentId),
      supabase
        .from("matches")
        .select(
          "team_a_id, team_b_id, phase, round, status, result:match_results(games_a, games_b, winner_team_id)"
        )
        .eq("tournament_id", tournamentId),
    ]);
    const byId: Record<string, any> = {};
    for (const t of teams ?? []) byId[t.id] = t;
    const norm = (matches ?? []).map((m: any) => ({
      ...m,
      result: Array.isArray(m.result) ? m.result[0] ?? null : m.result,
    }));

    // Mata-mata: campeão é o vencedor da final (maior round).
    const ko = norm.filter(
      (m: any) =>
        m.phase === "ko" && m.status === "finished" && m.result?.winner_team_id
    );
    if (ko.length) {
      const maxRound = Math.max(...ko.map((m: any) => m.round ?? 0));
      const final = ko.find((m: any) => (m.round ?? 0) === maxRound);
      if (final?.result?.winner_team_id)
        return teamName(byId[final.result.winner_team_id]);
    }

    // Demais formatos: quem tem mais vitórias.
    const wins: Record<string, number> = {};
    for (const m of norm) {
      const w = m.result?.winner_team_id;
      if (m.status === "finished" && w) wins[w] = (wins[w] || 0) + 1;
    }
    const top = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];
    return top ? teamName(byId[top[0]]) : null;
  } catch {
    return null;
  }
}

// Avisa os participantes (com e-mail) que o torneio foi encerrado.
export async function notifyTournamentFinished(
  supabase: any,
  groupId: string,
  tournamentId: string
): Promise<void> {
  if (!emailEnabled()) return;
  try {
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("name")
      .eq("id", tournamentId)
      .single();
    if (!tournament) return;

    const { data: tp } = await supabase
      .from("tournament_players")
      .select("member_id")
      .eq("tournament_id", tournamentId);
    const memberIds = (tp ?? [])
      .map((x: any) => x.member_id)
      .filter(Boolean);
    if (memberIds.length === 0) return;

    const { data: mem } = await supabase
      .from("group_members")
      .select("email")
      .in("id", memberIds);
    const emails: string[] = Array.from(
      new Set<string>(
        (mem ?? [])
          .map((m: any) => m.email)
          .filter((e: any): e is string => !!e)
      )
    );
    if (emails.length === 0) return;

    const champion = await championOf(supabase, tournamentId);
    const url = `${SITE_URL}/app/groups/${groupId}/tournaments/${tournamentId}`;
    const bodyHtml = champion
      ? `<p style="margin:18px 0 0;font-size:16px">🏆 Campeão: <b>${champion}</b></p>`
      : "";
    const html = emailLayout({
      title: `Torneio encerrado: ${tournament.name}`,
      intro:
        "O torneio foi finalizado e o resultado já está disponível no app.",
      bodyHtml,
      ctaLabel: "Ver classificação",
      ctaUrl: url,
    });
    const text = `Torneio "${tournament.name}" encerrado.${
      champion ? ` Campeão: ${champion}.` : ""
    } Veja em ${url}`;
    await sendEmail({
      to: emails,
      subject: `🎾 ${tournament.name} — resultado final`,
      html,
      text,
    });
  } catch (e: any) {
    console.error("[notify] tournamentFinished", e?.message);
  }
}
