"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { shuffle, makePairs, roundRobin } from "@/lib/draw";

export async function createTournament(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  const date = String(formData.get("date") || "") || null;
  const location = String(formData.get("location") || "").trim() || null;
  const courts = Number(formData.get("courts") || 1);
  const category = String(formData.get("category") || "").trim() || null;
  const game_format = Number(formData.get("game_format") || 6);
  const tie_break = formData.get("tie_break") === "on";
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
  userId: string,
  add: boolean
) {
  const supabase = await createClient();
  if (add) {
    await supabase
      .from("tournament_players")
      .insert({ tournament_id: tournamentId, user_id: userId })
      .select();
  } else {
    await supabase
      .from("tournament_players")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId);
  }
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}

export async function drawTournament(groupId: string, tournamentId: string) {
  const supabase = await createClient();

  // limpa sorteio anterior
  await supabase.from("matches").delete().eq("tournament_id", tournamentId);
  await supabase.from("teams").delete().eq("tournament_id", tournamentId);

  const { data: players } = await supabase
    .from("tournament_players")
    .select("user_id")
    .eq("tournament_id", tournamentId);

  const ids = shuffle((players ?? []).map((p) => p.user_id));
  if (ids.length < 4) {
    return { error: "Mínimo de 4 jogadores (2 duplas) para sortear." };
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("courts")
    .eq("id", tournamentId)
    .single();
  const courts = tournament?.courts || 1;

  // cria duplas
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

  // gera jogos (round-robin)
  const schedule = roundRobin(ordered.length);
  const matchRows = schedule.map((m) => ({
    tournament_id: tournamentId,
    phase: "group",
    team_a_id: ordered[m.team_a].id,
    team_b_id: ordered[m.team_b].id,
    play_order: m.play_order,
    court: (m.play_order % courts) + 1,
    status: "scheduled" as const,
  }));

  const { error: matchErr } = await supabase.from("matches").insert(matchRows);
  if (matchErr) return { error: matchErr.message };

  await supabase
    .from("tournaments")
    .update({ status: "ongoing" })
    .eq("id", tournamentId);

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function saveResult(
  groupId: string,
  tournamentId: string,
  matchId: string,
  gamesA: number,
  gamesB: number
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
      reported_by: user?.id,
    },
    { onConflict: "match_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}

export async function finishTournament(
  groupId: string,
  tournamentId: string
) {
  const supabase = await createClient();
  await supabase
    .from("tournaments")
    .update({ status: "finished" })
    .eq("id", tournamentId);
  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
}
