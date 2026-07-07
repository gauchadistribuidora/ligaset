import { brl, shortDate, monthLabel, PAYMENT_LABEL, MODALITY_LABEL } from "@/lib/format";
import type { ReportColumn, ReportSection } from "@/components/ReportView";

export type ReportDoc = {
  title: string;
  subtitle?: string;
  sections: ReportSection[];
};

const FORMAT_LABEL: Record<string, string> = {
  round_robin: "Todos contra todos",
  rei_praia: "Rei da Praia",
  knockout: "Eliminatória direta",
  groups_ko: "Grupos + mata-mata",
  manual: "Manual",
};
const TOUR_STATUS: Record<string, string> = {
  draft: "Rascunho",
  ongoing: "Em andamento",
  finished: "Finalizado",
};

export const REPORTS: { key: string; label: string; desc: string; icon: string }[] = [
  { key: "mensalidades", label: "Mensalidades", desc: "Todas as cobranças do grupo.", icon: "💳" },
  { key: "atrasadas", label: "Mensalidades em atraso", desc: "Cobranças vencidas e não pagas.", icon: "⏰" },
  { key: "ranking", label: "Ranking geral", desc: "Classificação individual do grupo.", icon: "🏅" },
  { key: "torneios", label: "Torneios", desc: "Lista de todos os torneios.", icon: "🏆" },
  { key: "jogos", label: "Tabela de jogos", desc: "Todos os jogos agendados.", icon: "📋" },
  { key: "resultados", label: "Resultado de jogos", desc: "Placares dos jogos finalizados.", icon: "🎾" },
  { key: "campeoes", label: "Campeões por torneio", desc: "Quem venceu cada torneio.", icon: "👑" },
  { key: "presenca", label: "Presença dos atletas", desc: "Torneios e jogos por atleta.", icon: "📆" },
  { key: "financeiro-mensal", label: "Resumo financeiro mensal", desc: "Arrecadado x pendente por mês.", icon: "📊" },
  { key: "melhores-duplas", label: "Melhores duplas", desc: "Duplas com mais vitórias juntas.", icon: "🤝" },
  { key: "resumo-torneio", label: "Resumo do torneio", desc: "Placar, ranking e destaques de um torneio.", icon: "📄" },
];

const firstName = (n?: string | null) => (n || "?").trim().split(/\s+/)[0];
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysLate = (due: string) =>
  Math.max(0, Math.floor((Date.now() - Date.parse(due + "T00:00:00")) / 86400000));

function effStatus(p: any): string {
  if (p.status === "pending" && p.due_date && p.due_date < todayISO()) return "overdue";
  return p.status;
}
function teamLabel(t: any, nameMap: Record<string, string>): string {
  if (!t) return "—";
  if (t.name) return t.name;
  return `${firstName(nameMap[t.player1_id])} & ${firstName(nameMap[t.player2_id])}`;
}
function placar(result: any): string {
  if (!result) return "—";
  if (Array.isArray(result.set_scores) && result.set_scores.length)
    return result.set_scores.map((s: number[]) => `${s[0]}/${s[1]}`).join("  ");
  return `${result.games_a} x ${result.games_b}`;
}
function faseLabel(m: any): string {
  if (m.group_label) return `Grupo ${m.group_label}`;
  if (m.phase === "ko") return "Mata-mata";
  if (m.phase === "rei") return `Rodada ${m.round ?? ""}`.trim();
  return "—";
}

async function nameMapOf(supabase: any, groupId: string) {
  const { data } = await supabase
    .from("group_members")
    .select("id, name")
    .eq("group_id", groupId);
  const map: Record<string, string> = {};
  for (const m of data ?? []) map[m.id] = m.name || "Jogador";
  return map;
}
async function tournamentsOf(supabase: any, groupId: string) {
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("group_id", groupId)
    .order("date", { ascending: false });
  return data ?? [];
}
async function teamsMapOf(supabase: any, tids: string[]) {
  const map: Record<string, any> = {};
  if (!tids.length) return map;
  const { data } = await supabase
    .from("teams")
    .select("id, name, player1_id, player2_id, tournament_id")
    .in("tournament_id", tids);
  for (const t of data ?? []) map[t.id] = t;
  return map;
}
function norm(m: any) {
  return { ...m, result: Array.isArray(m.result) ? m.result[0] ?? null : m.result };
}

function teamStandings(matches: any[], teamsMap: Record<string, any>, nameMap: Record<string, string>) {
  const map: Record<string, any> = {};
  for (const m of matches) {
    if (!m.result || m.status !== "finished") continue;
    for (const tid of [m.team_a_id, m.team_b_id])
      if (tid && !map[tid])
        map[tid] = { teamId: tid, label: teamLabel(teamsMap[tid], nameMap), wins: 0, losses: 0, gf: 0, ga: 0 };
    const ga = m.result.games_a, gb = m.result.games_b;
    if (map[m.team_a_id]) { map[m.team_a_id].gf += ga; map[m.team_a_id].ga += gb; }
    if (map[m.team_b_id]) { map[m.team_b_id].gf += gb; map[m.team_b_id].ga += ga; }
    const w = m.result.winner_team_id;
    if (w && map[w]) { map[w].wins++; const l = w === m.team_a_id ? m.team_b_id : m.team_a_id; if (map[l]) map[l].losses++; }
  }
  return Object.values(map)
    .map((s: any) => ({ ...s, diff: s.gf - s.ga }))
    .sort((a: any, b: any) => b.wins - a.wins || b.diff - a.diff);
}
function playerStandings(matches: any[], teamsMap: Record<string, any>, nameMap: Record<string, string>) {
  const map: Record<string, any> = {};
  const ensure = (pid: string) => {
    if (pid && !map[pid]) map[pid] = { id: pid, name: nameMap[pid] || "Jogador", wins: 0, losses: 0, gf: 0, ga: 0 };
  };
  for (const m of matches) {
    if (!m.result || m.status !== "finished") continue;
    const tA = teamsMap[m.team_a_id], tB = teamsMap[m.team_b_id];
    if (!tA || !tB) continue;
    const A = [tA.player1_id, tA.player2_id].filter(Boolean);
    const B = [tB.player1_id, tB.player2_id].filter(Boolean);
    A.forEach(ensure); B.forEach(ensure);
    const ga = m.result.games_a, gb = m.result.games_b;
    const wA = m.result.winner_team_id === m.team_a_id, wB = m.result.winner_team_id === m.team_b_id;
    for (const p of A) { map[p].gf += ga; map[p].ga += gb; if (wA) map[p].wins++; else if (wB) map[p].losses++; }
    for (const p of B) { map[p].gf += gb; map[p].ga += ga; if (wB) map[p].wins++; else if (wA) map[p].losses++; }
  }
  return Object.values(map)
    .map((s: any) => ({ ...s, diff: s.gf - s.ga }))
    .sort((a: any, b: any) => b.wins - a.wins || b.diff - a.diff);
}
function winnerVice(t: any, matches: any[], teamsMap: Record<string, any>, nameMap: Record<string, string>) {
  const ko = matches.filter((m) => m.phase === "ko" && !m.next_match_id && m.result && m.status === "finished");
  if (ko.length) {
    const fin = ko.sort((a, b) => (b.round ?? 0) - (a.round ?? 0))[0];
    const w = fin.result.winner_team_id;
    const l = w === fin.team_a_id ? fin.team_b_id : fin.team_a_id;
    return { champ: teamLabel(teamsMap[w], nameMap), vice: teamLabel(teamsMap[l], nameMap) };
  }
  if (t.format === "rei_praia") {
    const ps = playerStandings(matches, teamsMap, nameMap);
    return { champ: ps[0]?.name || "—", vice: ps[1]?.name || "—" };
  }
  const ts = teamStandings(matches, teamsMap, nameMap);
  return { champ: ts[0]?.label || "—", vice: ts[1]?.label || "—" };
}

export async function buildReport(
  supabase: any,
  groupId: string,
  key: string,
  opts: { tournamentId?: string } = {}
): Promise<ReportDoc | null> {
  const nameMap = await nameMapOf(supabase, groupId);

  // ---------- Mensalidades ----------
  if (key === "mensalidades" || key === "atrasadas") {
    const { data: pays } = await supabase
      .from("payments")
      .select("member_id, amount, reference_month, due_date, status, paid_at")
      .eq("group_id", groupId)
      .order("reference_month", { ascending: false });
    let list = pays ?? [];
    const columns: ReportColumn[] = [
      { key: "atleta", label: "Atleta" },
      { key: "ref", label: "Referência" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "venc", label: "Vencimento", align: "center" },
      { key: "status", label: "Status", align: "center" },
    ];
    if (key === "atrasadas") {
      list = list.filter((p: any) => effStatus(p) === "overdue");
      columns.push({ key: "dias", label: "Dias em atraso", align: "center" });
      list.sort((a: any, b: any) => daysLate(b.due_date) - daysLate(a.due_date));
    } else {
      columns.push({ key: "pago", label: "Pago em", align: "center" });
    }
    const rows = list.map((p: any) => {
      const eff = effStatus(p);
      const base: any = {
        atleta: nameMap[p.member_id] || "Jogador",
        ref: monthLabel(p.reference_month),
        valor: brl(p.amount),
        venc: shortDate(p.due_date),
        status: PAYMENT_LABEL[eff] || eff,
      };
      if (key === "atrasadas") base.dias = p.due_date ? daysLate(p.due_date) : 0;
      else base.pago = p.paid_at ? shortDate(p.paid_at) : "—";
      return base;
    });
    return {
      title: key === "atrasadas" ? "Mensalidades em atraso" : "Mensalidades",
      subtitle: `${rows.length} registro(s)`,
      sections: [{ columns, rows }],
    };
  }

  // ---------- Resumo financeiro mensal ----------
  if (key === "financeiro-mensal") {
    const { data: pays } = await supabase
      .from("payments")
      .select("amount, reference_month, status")
      .eq("group_id", groupId);
    const byMonth: Record<string, { total: number; paid: number }> = {};
    for (const p of pays ?? []) {
      const k = p.reference_month;
      byMonth[k] ??= { total: 0, paid: 0 };
      byMonth[k].total += Number(p.amount || 0);
      if (p.status === "paid") byMonth[k].paid += Number(p.amount || 0);
    }
    const rows = Object.entries(byMonth)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([m, v]) => ({
        mes: monthLabel(m),
        arrecadado: brl(v.paid),
        pendente: brl(v.total - v.paid),
        adimplencia: (v.total ? Math.round((100 * v.paid) / v.total) : 0) + "%",
      }));
    return {
      title: "Resumo financeiro mensal",
      sections: [
        {
          columns: [
            { key: "mes", label: "Mês" },
            { key: "arrecadado", label: "Arrecadado", align: "right" },
            { key: "pendente", label: "Pendente", align: "right" },
            { key: "adimplencia", label: "Adimplência", align: "center" },
          ],
          rows,
        },
      ],
    };
  }

  // ---------- Ranking geral ----------
  if (key === "ranking") {
    const { data: rk } = await supabase
      .from("group_rankings")
      .select("*")
      .eq("group_id", groupId)
      .order("points", { ascending: false })
      .order("game_diff", { ascending: false });
    const rows = (rk ?? []).map((r: any, i: number) => ({
      pos: i + 1,
      atleta: r.full_name || "Jogador",
      j: r.games_played,
      v: r.wins,
      d: r.losses,
      sg: r.game_diff > 0 ? `+${r.game_diff}` : r.game_diff,
      pct: `${r.win_pct ?? 0}%`,
      pts: r.points,
    }));
    return {
      title: "Ranking geral",
      subtitle: `${rows.length} atleta(s)`,
      sections: [
        {
          columns: [
            { key: "pos", label: "#", align: "center" },
            { key: "atleta", label: "Atleta" },
            { key: "j", label: "J", align: "center" },
            { key: "v", label: "V", align: "center" },
            { key: "d", label: "D", align: "center" },
            { key: "sg", label: "SG", align: "center" },
            { key: "pct", label: "%", align: "center" },
            { key: "pts", label: "Pts", align: "center" },
          ],
          rows,
        },
      ],
    };
  }

  // ---------- Torneios ----------
  if (key === "torneios") {
    const tours = await tournamentsOf(supabase, groupId);
    const rows = tours.map((t: any) => ({
      nome: t.name,
      data: shortDate(t.date),
      formato: FORMAT_LABEL[t.format] || "—",
      categoria: t.category || "—",
      local: t.location || "—",
      status: TOUR_STATUS[t.status] || t.status,
    }));
    return {
      title: "Torneios",
      subtitle: `${rows.length} torneio(s)`,
      sections: [
        {
          columns: [
            { key: "nome", label: "Nome" },
            { key: "data", label: "Data", align: "center" },
            { key: "formato", label: "Formato" },
            { key: "categoria", label: "Categoria" },
            { key: "local", label: "Local" },
            { key: "status", label: "Status", align: "center" },
          ],
          rows,
        },
      ],
    };
  }

  // ---------- Tabela de jogos / Resultados ----------
  if (key === "jogos" || key === "resultados") {
    const tours = await tournamentsOf(supabase, groupId);
    const tmap: Record<string, any> = {};
    for (const t of tours) tmap[t.id] = t;
    const tids = tours.map((t: any) => t.id);
    const teamsMap = await teamsMapOf(supabase, tids);
    let matches: any[] = [];
    if (tids.length) {
      const { data } = await supabase
        .from("matches")
        .select("*, result:match_results(*)")
        .in("tournament_id", tids)
        .order("play_order");
      matches = (data ?? []).map(norm);
    }
    if (key === "jogos") {
      const rows = matches.map((m) => ({
        torneio: tmap[m.tournament_id]?.name || "—",
        fase: faseLabel(m),
        duplaA: teamLabel(teamsMap[m.team_a_id], nameMap),
        duplaB: teamLabel(teamsMap[m.team_b_id], nameMap),
        quadra: m.court ?? "—",
        status: m.status === "finished" ? "Finalizado" : "Agendado",
      }));
      return {
        title: "Tabela de jogos",
        subtitle: `${rows.length} jogo(s)`,
        sections: [
          {
            columns: [
              { key: "torneio", label: "Torneio" },
              { key: "fase", label: "Fase" },
              { key: "duplaA", label: "Dupla A" },
              { key: "duplaB", label: "Dupla B" },
              { key: "quadra", label: "Quadra", align: "center" },
              { key: "status", label: "Status", align: "center" },
            ],
            rows,
          },
        ],
      };
    }
    const done = matches.filter((m) => m.result && m.status === "finished");
    const rows = done.map((m) => {
      const w = m.result.winner_team_id;
      return {
        torneio: tmap[m.tournament_id]?.name || "—",
        duplaA: teamLabel(teamsMap[m.team_a_id], nameMap),
        placar: placar(m.result),
        duplaB: teamLabel(teamsMap[m.team_b_id], nameMap),
        vencedor: w ? teamLabel(teamsMap[w], nameMap) : "—",
      };
    });
    return {
      title: "Resultado de jogos",
      subtitle: `${rows.length} resultado(s)`,
      sections: [
        {
          columns: [
            { key: "torneio", label: "Torneio" },
            { key: "duplaA", label: "Dupla A" },
            { key: "placar", label: "Placar", align: "center" },
            { key: "duplaB", label: "Dupla B" },
            { key: "vencedor", label: "Vencedor" },
          ],
          rows,
        },
      ],
    };
  }

  // ---------- Campeões por torneio ----------
  if (key === "campeoes") {
    const tours = (await tournamentsOf(supabase, groupId)).filter((t: any) => t.status === "finished");
    const tids = tours.map((t: any) => t.id);
    const teamsMap = await teamsMapOf(supabase, tids);
    let matches: any[] = [];
    if (tids.length) {
      const { data } = await supabase
        .from("matches")
        .select("tournament_id, phase, round, next_match_id, team_a_id, team_b_id, status, result:match_results(winner_team_id, games_a, games_b)")
        .in("tournament_id", tids);
      matches = (data ?? []).map(norm);
    }
    const rows = tours.map((t: any) => {
      const ms = matches.filter((m) => m.tournament_id === t.id);
      const { champ, vice } = winnerVice(t, ms, teamsMap, nameMap);
      return { torneio: t.name, data: shortDate(t.date), campeao: champ, vice };
    });
    return {
      title: "Campeões por torneio",
      subtitle: `${rows.length} torneio(s) finalizado(s)`,
      sections: [
        {
          columns: [
            { key: "torneio", label: "Torneio" },
            { key: "data", label: "Data", align: "center" },
            { key: "campeao", label: "Campeão" },
            { key: "vice", label: "Vice" },
          ],
          rows,
        },
      ],
    };
  }

  // ---------- Presença dos atletas ----------
  if (key === "presenca") {
    const tours = await tournamentsOf(supabase, groupId);
    const tids = tours.map((t: any) => t.id);
    const teamsMap = await teamsMapOf(supabase, tids);
    let matches: any[] = [];
    if (tids.length) {
      const { data } = await supabase
        .from("matches")
        .select("tournament_id, team_a_id, team_b_id")
        .in("tournament_id", tids);
      matches = data ?? [];
    }
    const stat: Record<string, { jogos: number; tours: Set<string> }> = {};
    const ensure = (pid: string) => (stat[pid] ??= { jogos: 0, tours: new Set() });
    for (const m of matches) {
      for (const tid of [m.team_a_id, m.team_b_id]) {
        const team = teamsMap[tid];
        if (!team) continue;
        for (const pid of [team.player1_id, team.player2_id]) {
          if (!pid) continue;
          const s = ensure(pid);
          s.jogos++;
          s.tours.add(m.tournament_id);
        }
      }
    }
    const rows = Object.entries(stat)
      .map(([pid, s]) => ({ atleta: nameMap[pid] || "Jogador", torneios: s.tours.size, jogos: s.jogos }))
      .sort((a, b) => b.jogos - a.jogos);
    return {
      title: "Presença dos atletas",
      subtitle: `${rows.length} atleta(s)`,
      sections: [
        {
          columns: [
            { key: "atleta", label: "Atleta" },
            { key: "torneios", label: "Torneios", align: "center" },
            { key: "jogos", label: "Jogos", align: "center" },
          ],
          rows,
        },
      ],
    };
  }

  // ---------- Melhores duplas ----------
  if (key === "melhores-duplas") {
    const tours = await tournamentsOf(supabase, groupId);
    const tids = tours.map((t: any) => t.id);
    const teamsMap = await teamsMapOf(supabase, tids);
    let matches: any[] = [];
    if (tids.length) {
      const { data } = await supabase
        .from("matches")
        .select("team_a_id, team_b_id, status, result:match_results(winner_team_id)")
        .in("tournament_id", tids);
      matches = (data ?? []).map(norm);
    }
    const duplas: Record<string, { label: string; wins: number; jogos: number }> = {};
    const add = (teamId: string, won: boolean) => {
      const t = teamsMap[teamId];
      if (!t || !t.player1_id || !t.player2_id) return;
      const kkey = [t.player1_id, t.player2_id].sort().join("|");
      duplas[kkey] ??= { label: teamLabel(t, nameMap), wins: 0, jogos: 0 };
      duplas[kkey].jogos++;
      if (won) duplas[kkey].wins++;
    };
    for (const m of matches) {
      if (!m.result || m.status !== "finished") continue;
      add(m.team_a_id, m.result.winner_team_id === m.team_a_id);
      add(m.team_b_id, m.result.winner_team_id === m.team_b_id);
    }
    const rows = Object.values(duplas)
      .sort((a, b) => b.wins - a.wins || b.jogos - a.jogos)
      .map((d) => ({
        dupla: d.label,
        vitorias: d.wins,
        jogos: d.jogos,
        aprov: (d.jogos ? Math.round((100 * d.wins) / d.jogos) : 0) + "%",
      }));
    return {
      title: "Melhores duplas",
      subtitle: `${rows.length} dupla(s)`,
      sections: [
        {
          columns: [
            { key: "dupla", label: "Dupla" },
            { key: "vitorias", label: "Vitórias", align: "center" },
            { key: "jogos", label: "Jogos", align: "center" },
            { key: "aprov", label: "Aproveitamento", align: "center" },
          ],
          rows,
        },
      ],
    };
  }

  // ---------- Resumo do torneio ----------
  if (key === "resumo-torneio") {
    if (!opts.tournamentId) return null;
    const { data: t } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", opts.tournamentId)
      .eq("group_id", groupId)
      .single();
    if (!t) return null;
    const teamsMap = await teamsMapOf(supabase, [t.id]);
    const { data: md } = await supabase
      .from("matches")
      .select("*, result:match_results(*)")
      .eq("tournament_id", t.id)
      .order("play_order");
    const matches: any[] = (md ?? []).map(norm);
    const isRei = t.format === "rei_praia";

    const placarRows = matches
      .filter((m) => m.result && m.status === "finished")
      .map((m) => ({
        jogo: faseLabel(m),
        duplaA: teamLabel(teamsMap[m.team_a_id], nameMap),
        placar: placar(m.result),
        duplaB: teamLabel(teamsMap[m.team_b_id], nameMap),
        vencedor: m.result.winner_team_id ? teamLabel(teamsMap[m.result.winner_team_id], nameMap) : "—",
      }));

    const sections: ReportSection[] = [
      {
        title: "Placar dos jogos",
        columns: [
          { key: "jogo", label: "Fase" },
          { key: "duplaA", label: "Dupla A" },
          { key: "placar", label: "Placar", align: "center" },
          { key: "duplaB", label: "Dupla B" },
          { key: "vencedor", label: "Vencedor" },
        ],
        rows: placarRows,
      },
    ];

    if (isRei) {
      const ps = playerStandings(matches, teamsMap, nameMap);
      sections.push({
        title: "Classificação (individual)",
        columns: [
          { key: "pos", label: "#", align: "center" },
          { key: "atleta", label: "Atleta" },
          { key: "v", label: "V", align: "center" },
          { key: "d", label: "D", align: "center" },
          { key: "sg", label: "SG", align: "center" },
        ],
        rows: ps.map((s: any, i: number) => ({
          pos: i + 1, atleta: s.name, v: s.wins, d: s.losses, sg: s.diff > 0 ? `+${s.diff}` : s.diff,
        })),
      });
      sections.push({
        title: "Destaques",
        columns: [
          { key: "destaque", label: "Destaque" },
          { key: "quem", label: "Atleta" },
          { key: "info", label: "Campanha" },
        ],
        rows: ps.length
          ? [
              { destaque: "🏆 Melhor", quem: ps[0].name, info: `${ps[0].wins}V • SG ${ps[0].diff > 0 ? "+" : ""}${ps[0].diff}` },
              { destaque: "🐌 Pior", quem: ps[ps.length - 1].name, info: `${ps[ps.length - 1].wins}V • SG ${ps[ps.length - 1].diff > 0 ? "+" : ""}${ps[ps.length - 1].diff}` },
            ]
          : [],
      });
    } else {
      const ts = teamStandings(matches, teamsMap, nameMap);
      sections.push({
        title: "Classificação",
        columns: [
          { key: "pos", label: "#", align: "center" },
          { key: "dupla", label: "Dupla" },
          { key: "v", label: "V", align: "center" },
          { key: "d", label: "D", align: "center" },
          { key: "sg", label: "SG", align: "center" },
        ],
        rows: ts.map((s: any, i: number) => ({
          pos: i + 1, dupla: s.label, v: s.wins, d: s.losses, sg: s.diff > 0 ? `+${s.diff}` : s.diff,
        })),
      });
      sections.push({
        title: "Destaques",
        columns: [
          { key: "destaque", label: "Destaque" },
          { key: "quem", label: "Dupla" },
          { key: "info", label: "Campanha" },
        ],
        rows: ts.length
          ? [
              { destaque: "🏆 Melhor dupla", quem: ts[0].label, info: `${ts[0].wins}V • SG ${ts[0].diff > 0 ? "+" : ""}${ts[0].diff}` },
              { destaque: "🐌 Pior dupla", quem: ts[ts.length - 1].label, info: `${ts[ts.length - 1].wins}V • SG ${ts[ts.length - 1].diff > 0 ? "+" : ""}${ts[ts.length - 1].diff}` },
            ]
          : [],
      });
    }

    return {
      title: `Resumo — ${t.name}`,
      subtitle: `${FORMAT_LABEL[t.format] || ""} • ${shortDate(t.date)}`,
      sections,
    };
  }

  return null;
}
