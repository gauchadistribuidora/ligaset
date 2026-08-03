"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireExternalTester } from "@/lib/admin";
import { properName } from "@/lib/format";
import {
  composeCategory,
  gamesFromSets,
  isPhase,
  nextPhase,
  normalizePair,
  phaseOrder,
  wonFromSets,
  type Phase,
} from "@/lib/external";

// Enquanto o módulo está em teste, só quem está na lista de testadores escreve.
// A checagem fica aqui no servidor — esconder o botão na tela não é proteção.
async function guard() {
  const ctx = await requireExternalTester();
  if (!ctx) return null;
  return ctx;
}

// Até 3 sets (o terceiro é o super tie-break); conta só os preenchidos dos
// dois lados.
function setsFromForm(formData: FormData): number[][] {
  const sets: number[][] = [];
  for (let i = 1; i <= 3; i++) {
    const rawA = String(formData.get(`s${i}a`) || "").trim();
    const rawB = String(formData.get(`s${i}b`) || "").trim();
    if (rawA === "" || rawB === "") continue;
    const a = Number(rawA);
    const b = Number(rawB);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) continue;
    sets.push([a, b]);
  }
  return sets;
}

function refresh(tournamentId?: string) {
  revalidatePath("/app/externos");
  revalidatePath("/app/externos/duplas");
  revalidatePath("/app/externos/relatorios");
  if (tournamentId) revalidatePath(`/app/externos/${tournamentId}`);
}

export async function createExternalTournament(formData: FormData) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };
  const { supabase, user } = ctx;

  const name = String(formData.get("name") || "").trim();
  const tournament_date = String(formData.get("tournament_date") || "") || null;
  const category = composeCategory(
    String(formData.get("category_level") || ""),
    String(formData.get("category_gender") || "")
  );
  const partner_name = properName(String(formData.get("partner_name") || "")) || null;

  // A tela manda "__outra__" quando a federação não é uma das conhecidas;
  // nesse caso o nome vem do campo digitado ao lado.
  const fedOption = String(formData.get("federation_option") || "").trim();
  const federation =
    (fedOption === "__outra__"
      ? String(formData.get("federation_other") || "").trim()
      : fedOption) || null;

  if (!name) return { error: "Informe o nome do torneio." };

  // "planned" = torneio que ela ainda vai jogar. Fica na agenda até começar.
  const planned = formData.get("planned") === "on";

  const { data, error } = await supabase
    .from("external_tournaments")
    .insert({
      user_id: user.id,
      name,
      tournament_date,
      category,
      partner_name,
      federation,
      status: planned ? "planned" : "ongoing",
      current_phase: "group",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Parceiro digitado na mão já entra na lista, para o próximo torneio ser só
  // escolher — é a digitação repetida que estraga o relatório de duplas.
  if (partner_name) {
    await supabase
      .from("external_partners")
      .insert({ user_id: user.id, name: partner_name });
  }

  refresh();
  redirect(`/app/externos/${data.id}`);
}

// Agenda: lembrete rápido de um torneio que vem por aí. Só nome e data — o
// resto (federação, categoria, parceiro) se preenche quando ele começar.
export async function quickAddAgenda(formData: FormData) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };
  const { supabase, user } = ctx;

  const name = String(formData.get("name") || "").trim();
  const tournament_date = String(formData.get("tournament_date") || "") || null;
  if (!name) return { error: "Informe o nome do torneio." };

  const { error } = await supabase.from("external_tournaments").insert({
    user_id: user.id,
    name,
    tournament_date,
    status: "planned",
    current_phase: "group",
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  refresh();
  return { ok: true };
}

// Corrigir os dados de um torneio depois de criado — inclusive completar o que
// ficou em branco quando ele entrou só como lembrete na agenda.
export async function updateExternalTournament(
  tournamentId: string,
  formData: FormData
) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Informe o nome do torneio." };

  const fedOption = String(formData.get("federation_option") || "").trim();
  const federation =
    (fedOption === "__outra__"
      ? String(formData.get("federation_other") || "").trim()
      : fedOption) || null;

  const { error } = await ctx.supabase
    .from("external_tournaments")
    .update({
      name,
      tournament_date: String(formData.get("tournament_date") || "") || null,
      category: composeCategory(
        String(formData.get("category_level") || ""),
        String(formData.get("category_gender") || "")
      ),
      partner_name:
        properName(String(formData.get("partner_name") || "")) || null,
      federation,
    })
    .eq("id", tournamentId);
  if (error) return { error: error.message };

  revalidatePath("/app");
  refresh(tournamentId);
  return { ok: true };
}

export async function createExternalPartner(formData: FormData) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };
  const { supabase, user } = ctx;

  const name = properName(String(formData.get("name") || ""));
  if (!name) return { error: "Informe o nome do parceiro." };

  const { error } = await supabase
    .from("external_partners")
    .insert({ user_id: user.id, name });

  if (error) {
    if (error.code === "23505") return { error: "Esse parceiro já está na lista." };
    return { error: error.message };
  }
  refresh();
  return { ok: true };
}

export async function deleteExternalPartner(partnerId: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("external_partners")
    .delete()
    .eq("id", partnerId);
  if (error) return { error: error.message };

  refresh();
  return { ok: true };
}

export async function addExternalMatch(tournamentId: string, formData: FormData) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };
  const { supabase, user } = ctx;

  const phase = String(formData.get("phase") || "");
  if (!isPhase(phase)) return { error: "Fase inválida." };

  const opponent1 = properName(String(formData.get("opponent1") || "")) || null;
  const opponent2 = properName(String(formData.get("opponent2") || "")) || null;

  const sets = setsFromForm(formData);
  if (!sets.length) return { error: "Informe o placar de pelo menos um set." };

  const { gamesFor, gamesAgainst } = gamesFromSets(sets);
  const won = wonFromSets(sets);

  const { error } = await supabase.from("external_matches").insert({
    tournament_id: tournamentId,
    phase,
    opponent1,
    opponent2,
    set_scores: sets,
    games_for: gamesFor,
    games_against: gamesAgainst,
    won,
  });
  if (error) return { error: error.message };

  // Dupla nova digitada na mão já entra na agenda, para o próximo lançamento
  // ser só escolher na lista. Se já existir, o índice único barra e seguimos.
  if (opponent1 && opponent2) {
    const [p1, p2] = normalizePair(opponent1, opponent2);
    await supabase
      .from("external_pairs")
      .insert({ user_id: user.id, player1: p1, player2: p2 });
  }

  const { data: t } = await supabase
    .from("external_tournaments")
    .select("current_phase")
    .eq("id", tournamentId)
    .single();

  if (phase === "final") {
    // Ganhou a final = campeão. Perdeu = vice. Nos dois casos o torneio acabou,
    // então nem faz sentido perguntar se avançou.
    await supabase
      .from("external_tournaments")
      .update({
        status: "finished",
        final_phase: "final",
        current_phase: "final",
        champion: won,
      })
      .eq("id", tournamentId);
  } else if (t && phaseOrder(phase) > phaseOrder(t.current_phase)) {
    // Pulou fase na mão (ex.: dos grupos direto para a semi) — acompanha.
    await supabase
      .from("external_tournaments")
      .update({ current_phase: phase })
      .eq("id", tournamentId);
  }

  refresh(tournamentId);
  return { ok: true };
}

export async function updateExternalMatch(
  tournamentId: string,
  matchId: string,
  formData: FormData
) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };
  const { supabase } = ctx;

  const phase = String(formData.get("phase") || "");
  if (!isPhase(phase)) return { error: "Fase inválida." };

  const sets = setsFromForm(formData);
  if (!sets.length) return { error: "Informe o placar de pelo menos um set." };

  const { gamesFor, gamesAgainst } = gamesFromSets(sets);

  const { error } = await supabase
    .from("external_matches")
    .update({
      phase,
      opponent1: properName(String(formData.get("opponent1") || "")) || null,
      opponent2: properName(String(formData.get("opponent2") || "")) || null,
      set_scores: sets,
      games_for: gamesFor,
      games_against: gamesAgainst,
      won: wonFromSets(sets),
    })
    .eq("id", matchId);
  if (error) return { error: error.message };

  refresh(tournamentId);
  return { ok: true };
}

// Observação da jogadora sobre a própria performance no torneio.
export async function saveExternalNotes(tournamentId: string, notes: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("external_tournaments")
    .update({ notes: notes.trim() || null })
    .eq("id", tournamentId);
  if (error) return { error: error.message };

  refresh(tournamentId);
  return { ok: true };
}

// Tira o torneio da agenda e começa a valer para lançar jogos.
export async function startExternalTournament(tournamentId: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("external_tournaments")
    .update({ status: "ongoing" })
    .eq("id", tournamentId)
    .eq("status", "planned");
  if (error) return { error: error.message };

  refresh(tournamentId);
  return { ok: true };
}

// Botão "Avançou para a próxima fase".
export async function advanceExternalPhase(tournamentId: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };
  const { supabase } = ctx;

  const { data: t } = await supabase
    .from("external_tournaments")
    .select("current_phase, status")
    .eq("id", tournamentId)
    .single();
  if (!t) return { error: "Torneio não encontrado." };
  if (t.status === "finished") return { error: "Este torneio já foi encerrado." };

  const next = nextPhase(t.current_phase);
  if (!next) return { error: "A final é a última fase." };

  const { error } = await supabase
    .from("external_tournaments")
    .update({ current_phase: next })
    .eq("id", tournamentId);
  if (error) return { error: error.message };

  refresh(tournamentId);
  return { ok: true };
}

// Botão "Foi eliminada" — encerra o torneio na fase mais avançada que ela jogou.
export async function eliminateExternal(tournamentId: string, notes?: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };
  const { supabase } = ctx;

  const { data: matches } = await supabase
    .from("external_matches")
    .select("phase")
    .eq("tournament_id", tournamentId);

  const { data: t } = await supabase
    .from("external_tournaments")
    .select("current_phase")
    .eq("id", tournamentId)
    .single();

  // A fase real é a última que ela de fato jogou — não a que estava aberta na
  // tela. Assim, clicar "Avançou" por engano e depois "Foi eliminada" não
  // inventa uma fase que ela nunca disputou.
  let reached: Phase = "group";
  let played = false;
  for (const m of matches ?? []) {
    if (!isPhase(m.phase)) continue;
    played = true;
    if (phaseOrder(m.phase) > phaseOrder(reached)) reached = m.phase;
  }
  if (!played) reached = (t?.current_phase as Phase) ?? "group";

  const { error } = await supabase
    .from("external_tournaments")
    .update({
      status: "finished",
      final_phase: reached,
      champion: false,
      ...(notes !== undefined ? { notes: notes.trim() || null } : {}),
    })
    .eq("id", tournamentId);
  if (error) return { error: error.message };

  refresh(tournamentId);
  return { ok: true };
}

export async function reopenExternalTournament(tournamentId: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("external_tournaments")
    .update({ status: "ongoing", final_phase: null, champion: false })
    .eq("id", tournamentId);
  if (error) return { error: error.message };

  refresh(tournamentId);
  return { ok: true };
}

export async function deleteExternalMatch(tournamentId: string, matchId: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("external_matches")
    .delete()
    .eq("id", matchId);
  if (error) return { error: error.message };

  refresh(tournamentId);
  return { ok: true };
}

// ---------- agenda de duplas adversárias ----------

export async function createExternalPair(formData: FormData) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };
  const { supabase, user } = ctx;

  const a = properName(String(formData.get("player1") || ""));
  const b = properName(String(formData.get("player2") || ""));
  if (!a || !b) return { error: "Informe o nome dos dois jogadores." };

  const [p1, p2] = normalizePair(a, b);
  const { error } = await supabase
    .from("external_pairs")
    .insert({ user_id: user.id, player1: p1, player2: p2 });

  if (error) {
    if (error.code === "23505") return { error: "Essa dupla já está cadastrada." };
    return { error: error.message };
  }
  refresh();
  return { ok: true };
}

export async function updateExternalPair(pairId: string, formData: FormData) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const a = properName(String(formData.get("player1") || ""));
  const b = properName(String(formData.get("player2") || ""));
  if (!a || !b) return { error: "Informe o nome dos dois jogadores." };

  const [p1, p2] = normalizePair(a, b);
  const { error } = await ctx.supabase
    .from("external_pairs")
    .update({ player1: p1, player2: p2 })
    .eq("id", pairId);

  if (error) {
    if (error.code === "23505") return { error: "Essa dupla já está cadastrada." };
    return { error: error.message };
  }
  refresh();
  return { ok: true };
}

export async function updateExternalPartner(
  partnerId: string,
  formData: FormData
) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const name = properName(String(formData.get("name") || ""));
  if (!name) return { error: "Informe o nome do parceiro." };

  const { error } = await ctx.supabase
    .from("external_partners")
    .update({ name })
    .eq("id", partnerId);

  if (error) {
    if (error.code === "23505") return { error: "Esse parceiro já está na lista." };
    return { error: error.message };
  }
  refresh();
  return { ok: true };
}

export async function deleteExternalPair(pairId: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("external_pairs")
    .delete()
    .eq("id", pairId);
  if (error) return { error: error.message };

  refresh();
  return { ok: true };
}

export async function deleteExternalTournament(tournamentId: string) {
  const ctx = await guard();
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("external_tournaments")
    .delete()
    .eq("id", tournamentId);
  if (error) return { error: error.message };

  refresh();
  redirect("/app/externos");
}
