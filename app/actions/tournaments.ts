"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { shuffle, makePairs, roundRobin } from "@/lib/draw";
import { buildSingleElim } from "@/lib/bracket";
import { reiRotationRounds } from "@/lib/rei";

export async function createTournament(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  const date = String(formData.get("date") || "") || null;
  const location = String(formData.get("location") || "").trim() || null;
  const courts = Number(formData.get("courts") || 1);
  const category = String(formData.get("category") || "").trim() || null;
  const game_format = Number(formData.get("game_format") || 6);
  const tie_break = formData.get("tie_break") === "on";
  const format = String(formData.get("format") || "round_robin");
  const sets = Number(formData.get("sets") || 1);
  const groups_count = Number(formData.get("groups_count") || 2);
  const advance_count = Number(formData.get("advance_count") || 2);
  if (!name) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      group_id: groupId,
      name,
      date,
      location,
      courts,
      category,
      game_format,
      tie_break,
      format,
      sets,
      groups_count,
      advance_count,
      created_by: user?.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/app/groups/${groupId}/tournaments`);
  redirect(`/app/groups/${groupId}/tournaments/${data.id}`);
}

export async function togglePlayer(
  groupId: string,
  tournamentId: string,
  memberId: string,
  add: boolean
) {
  const supabase = await createClient();
  if (add) {
    await supabase
      .from("tournament_players")
      .insert({ tournament_id: tournamentId, member_id: memberId })
      .select();
  } else {
    await supabase
      .from("tournament_players")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("member_id", memberId);
  }
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}

export async function drawTournament(groupId: string, tournamentId: string) {
  const supabase = await createClient();

  await supabase.from("matches").delete().eq("tournament_id", tournamentId);
  await supabase.from("teams").delete().eq("tournament_id", tournamentId);

  const { data: players } = await supabase
    .from("tournament_players")
    .select("member_id")
    .eq("tournament_id", tournamentId);

  const ids = shuffle((players ?? []).map((p) => p.member_id));
  if (ids.length < 4) {
    return { error: "Mínimo de 4 jogadores (2 duplas) para sortear." };
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("courts, format, groups_count")
    .eq("id", tournamentId)
    .single();
  const courts = tournament?.courts || 1;
  const format = tournament?.format || "round_robin";

  // Rei da Praia: individual, sem duplas fixas — gera o rodízio direto
  if (format === "rei_praia") {
    const res = await insertRei(supabase, tournamentId, ids, courts);
    if (res.error) return res;
    await supabase
      .from("tournaments")
      .update({ status: "ongoing" })
      .eq("id", tournamentId);
    revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
    return { ok: true };
  }

  const pairs = makePairs(ids).filter((p) => p[1] !== null);
  const teamRows = pairs.map((p, i) => ({
    tournament_id: tournamentId,
    player1_id: p[0],
    player2_id: p[1],
    seed: i + 1,
  }));

  const { data: insertedTeams, error: teamErr } = await supabase
    .from("teams")
    .insert(teamRows)
    .select("id, seed");
  if (teamErr) return { error: teamErr.message };

  const ordered = (insertedTeams ?? []).sort(
    (a, b) => (a.seed ?? 0) - (b.seed ?? 0)
  );

  let res: { ok?: boolean; error?: string };
  if (format === "knockout") {
    res = await insertKnockout(
      supabase,
      tournamentId,
      ordered.map((t) => t.id),
      courts
    );
  } else if (format === "groups_ko") {
    res = await insertGroupStage(
      supabase,
      tournamentId,
      ordered.map((t) => t.id),
      courts,
      tournament?.groups_count || 2
    );
  } else {
    res = await insertRoundRobin(supabase, tournamentId, ordered.map((t) => t.id), courts);
  }
  if (res.error) return res;

  await supabase
    .from("tournaments")
    .update({ status: "ongoing" })
    .eq("id", tournamentId);

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

// ---------- geradores de jogos ----------

async function insertRoundRobin(
  supabase: any,
  tournamentId: string,
  teamIds: string[],
  courts: number,
  groupLabel: string | null = null,
  startOrder = 0
) {
  const schedule = roundRobin(teamIds.length);
  const rows = schedule.map((m) => ({
    tournament_id: tournamentId,
    phase: "group",
    group_label: groupLabel,
    team_a_id: teamIds[m.team_a],
    team_b_id: teamIds[m.team_b],
    play_order: startOrder + m.play_order,
    court: ((startOrder + m.play_order) % courts) + 1,
    status: "scheduled" as const,
  }));
  if (rows.length) {
    const { error } = await supabase.from("matches").insert(rows);
    if (error) return { error: error.message };
  }
  return { ok: true, count: rows.length };
}

async function insertGroupStage(
  supabase: any,
  tournamentId: string,
  teamIds: string[],
  courts: number,
  groupsCount: number
) {
  const G = Math.max(1, Math.min(groupsCount, Math.floor(teamIds.length / 2)));
  const buckets: string[][] = Array.from({ length: G }, () => []);
  teamIds.forEach((id, i) => buckets[i % G].push(id));
  const labels = "ABCDEFGH";
  let order = 0;
  for (let gi = 0; gi < G; gi++) {
    const res = await insertRoundRobin(
      supabase,
      tournamentId,
      buckets[gi],
      courts,
      labels[gi],
      order
    );
    if (res.error) return res;
    order += res.count ?? 0;
  }
  return { ok: true };
}

async function insertRei(
  supabase: any,
  tournamentId: string,
  memberIds: string[],
  courts: number
) {
  const rounds = reiRotationRounds(memberIds);
  if (!rounds.length)
    return { error: "Mínimo de 4 atletas para o Rei da Praia." };

  let order = 0;
  for (const m of rounds) {
    const { data: tA, error: eA } = await supabase
      .from("teams")
      .insert({
        tournament_id: tournamentId,
        player1_id: m.teamA[0],
        player2_id: m.teamA[1],
        seed: order * 2 + 1,
      })
      .select("id")
      .single();
    if (eA) return { error: eA.message };

    const { data: tB, error: eB } = await supabase
      .from("teams")
      .insert({
        tournament_id: tournamentId,
        player1_id: m.teamB[0],
        player2_id: m.teamB[1],
        seed: order * 2 + 2,
      })
      .select("id")
      .single();
    if (eB) return { error: eB.message };

    const { error: eM } = await supabase.from("matches").insert({
      tournament_id: tournamentId,
      phase: "rei",
      round: m.round,
      team_a_id: tA.id,
      team_b_id: tB.id,
      play_order: order,
      court: (order % courts) + 1,
      status: "scheduled",
    });
    if (eM) return { error: eM.message };
    order++;
  }
  return { ok: true };
}

async function insertKnockout(
  supabase: any,
  tournamentId: string,
  teamIdsSeeded: string[],
  courts: number
) {
  const games = buildSingleElim(teamIdsSeeded);
  if (!games.length) return { error: "Duplas insuficientes para o mata-mata." };

  const tempToId: Record<string, string> = {};
  let order = 0;
  for (const g of games) {
    const { data, error } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        phase: "ko",
        round: g.round,
        slot: g.slot,
        team_a_id: g.aTeam,
        team_b_id: g.bTeam,
        play_order: order,
        court: (order % courts) + 1,
        status: "scheduled",
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    tempToId[g.temp] = data.id;
    order++;
  }
  for (const g of games) {
    if (g.nextTemp) {
      await supabase
        .from("matches")
        .update({
          next_match_id: tempToId[g.nextTemp],
          next_slot: g.nextSlot,
        })
        .eq("id", tempToId[g.temp]);
    }
  }
  return { ok: true };
}

export async function saveResult(
  groupId: string,
  tournamentId: string,
  matchId: string,
  gamesA: number,
  gamesB: number,
  setScores: number[][] | null = null,
  winnerTeamId: string | null = null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("match_results").upsert(
    {
      match_id: matchId,
      games_a: gamesA,
      games_b: gamesB,
      set_scores: setScores,
      winner_team_id: winnerTeamId,
      reported_by: user?.id,
    },
    { onConflict: "match_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}

export async function finishTournament(groupId: string, tournamentId: string) {
  const supabase = await createClient();
  await supabase
    .from("tournaments")
    .update({ status: "finished" })
    .eq("id", tournamentId);
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}

export async function updateMatchTeams(
  groupId: string,
  tournamentId: string,
  teamAId: string,
  teamBId: string,
  teamA: [string, string],
  teamB: [string, string]
) {
  const supabase = await createClient();
  const all = [...teamA, ...teamB];
  if (all.some((x) => !x) || new Set(all).size !== 4) {
    return { error: "Escolha 4 atletas diferentes." };
  }
  const { error: e1 } = await supabase
    .from("teams")
    .update({ player1_id: teamA[0], player2_id: teamA[1] })
    .eq("id", teamAId);
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase
    .from("teams")
    .update({ player1_id: teamB[0], player2_id: teamB[1] })
    .eq("id", teamBId);
  if (e2) return { error: e2.message };
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

// ---------- Modo manual: admin cria duplas e jogos na mão ----------

export async function createTeamManual(
  groupId: string,
  tournamentId: string,
  player1Id: string,
  player2Id: string
) {
  const supabase = await createClient();
  if (!player1Id || !player2Id || player1Id === player2Id) {
    return { error: "Escolha dois jogadores diferentes." };
  }
  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId);
  const seed = (existing?.length ?? 0) + 1;

  const { error } = await supabase.from("teams").insert({
    tournament_id: tournamentId,
    player1_id: player1Id,
    player2_id: player2Id,
    seed,
  });
  if (error) return { error: error.message };

  await supabase
    .from("tournaments")
    .update({ status: "ongoing" })
    .eq("id", tournamentId)
    .eq("status", "draft");

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function deleteTeamManual(
  groupId: string,
  tournamentId: string,
  teamId: string
) {
  const supabase = await createClient();
  await supabase.from("teams").delete().eq("id", teamId);
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}

export async function createMatchManual(
  groupId: string,
  tournamentId: string,
  teamAId: string,
  teamBId: string
) {
  const supabase = await createClient();
  if (!teamAId || !teamBId || teamAId === teamBId) {
    return { error: "Escolha duas duplas diferentes." };
  }
  const { data: existing } = await supabase
    .from("matches")
    .select("play_order")
    .eq("tournament_id", tournamentId);
  const playOrder = existing?.length ?? 0;

  const { error } = await supabase.from("matches").insert({
    tournament_id: tournamentId,
    phase: "manual",
    team_a_id: teamAId,
    team_b_id: teamBId,
    play_order: playOrder,
    status: "scheduled",
  });
  if (error) return { error: error.message };
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function deleteMatchManual(
  groupId: string,
  tournamentId: string,
  matchId: string
) {
  const supabase = await createClient();
  await supabase.from("matches").delete().eq("id", matchId);
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}

export async function deleteTournament(groupId: string, tournamentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/groups/${groupId}/tournaments`);
  redirect(`/app/groups/${groupId}/tournaments`);
}

export async function reopenTournament(groupId: string, tournamentId: string) {
  const supabase = await createClient();
  await supabase
    .from("tournaments")
    .update({ status: "ongoing" })
    .eq("id", tournamentId);
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}

// ---------- Grupos + mata-mata: gerar a fase final a partir dos grupos ----------

export async function generateGroupsKnockout(
  groupId: string,
  tournamentId: string
) {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("courts, advance_count")
    .eq("id", tournamentId)
    .single();
  const courts = tournament?.courts || 1;
  const advance = Math.max(1, tournament?.advance_count || 2);

  const { data: matches } = await supabase
    .from("matches")
    .select("team_a_id, team_b_id, group_label, status, result:match_results(games_a, games_b, winner_team_id)")
    .eq("tournament_id", tournamentId)
    .eq("phase", "group");

  const norm = (matches ?? []).map((m: any) => ({
    ...m,
    result: Array.isArray(m.result) ? m.result[0] ?? null : m.result,
  }));

  if (norm.some((m: any) => m.status !== "finished" || !m.result)) {
    return { error: "Conclua todos os jogos da fase de grupos antes de gerar o mata-mata." };
  }

  // standings por grupo
  type S = { teamId: string; wins: number; gf: number; ga: number };
  const groups: Record<string, Record<string, S>> = {};
  const touch = (g: string, id: string) => {
    groups[g] ??= {};
    groups[g][id] ??= { teamId: id, wins: 0, gf: 0, ga: 0 };
    return groups[g][id];
  };
  for (const m of norm) {
    const g = m.group_label || "A";
    if (!m.team_a_id || !m.team_b_id || !m.result) continue;
    const A = touch(g, m.team_a_id);
    const B = touch(g, m.team_b_id);
    A.gf += m.result.games_a;
    A.ga += m.result.games_b;
    B.gf += m.result.games_b;
    B.ga += m.result.games_a;
    if (m.result.winner_team_id === m.team_a_id) A.wins++;
    else if (m.result.winner_team_id === m.team_b_id) B.wins++;
  }

  const rankOf = (g: string): string[] =>
    Object.values(groups[g])
      .sort((a, b) => b.wins - a.wins || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf)
      .map((s) => s.teamId);

  const labels = Object.keys(groups).sort();
  if (labels.length === 0) return { error: "Nenhum grupo encontrado." };

  // cruzamento: 1º de cada grupo, depois 2º (em ordem invertida) etc.
  const ranks: string[][] = labels.map(rankOf);
  const seeded: string[] = [];
  for (let r = 0; r < advance; r++) {
    const labelOrder = r % 2 === 0 ? labels.map((_, i) => i) : labels.map((_, i) => i).reverse();
    for (const li of labelOrder) {
      const id = ranks[li][r];
      if (id) seeded.push(id);
    }
  }

  if (seeded.length < 2) {
    return { error: "Classificados insuficientes para o mata-mata." };
  }

  // limpa um mata-mata anterior, se houver
  await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("phase", "ko");

  const res = await insertKnockout(supabase, tournamentId, seeded, courts);
  if (res.error) return res;

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}
