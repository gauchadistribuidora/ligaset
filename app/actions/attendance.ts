"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { codigoAmigavel } from "@/lib/slug";

async function ctxFor(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("group_members")
    .select("id, role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  return {
    supabase,
    user,
    memberId: membership.id as string,
    isAdmin: ["owner", "admin"].includes(membership.role),
  };
}

// Abre ou fecha a lista de presença do torneio. Só administrador.
export async function toggleConfirmations(
  groupId: string,
  tournamentId: string,
  open: boolean
) {
  const ctx = await ctxFor(groupId);
  if (!ctx?.isAdmin) {
    return { error: "Só o administrador do grupo pode abrir a lista." };
  }

  // Ao abrir, garante o código do link público — é por ele que confirma quem
  // nunca instalou o app.
  const patch: Record<string, unknown> = { confirmations_open: open };
  if (open) {
    const { data: t } = await ctx.supabase
      .from("tournaments")
      .select("confirm_code, name")
      .eq("id", tournamentId)
      .single();
    if (!t?.confirm_code) {
      // Tenta um código curto e legível; se já existir, aumenta o sufixo.
      for (const tam of [4, 5, 8]) {
        const tentativa = codigoAmigavel(t?.name ?? "jogo", tam);
        const { data: ocupado } = await ctx.supabase
          .from("tournaments")
          .select("id")
          .eq("confirm_code", tentativa)
          .maybeSingle();
        if (!ocupado) {
          patch.confirm_code = tentativa;
          break;
        }
      }
    }
  }

  const { error } = await ctx.supabase
    .from("tournaments")
    .update(patch)
    .eq("id", tournamentId)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

// Vagas do jogo. O administrador muda a qualquer momento — inclusive para
// fechar, colocando o número igual ao de confirmados.
export async function setTournamentCapacity(
  groupId: string,
  tournamentId: string,
  capacity: number | null
) {
  const ctx = await ctxFor(groupId);
  if (!ctx?.isAdmin) {
    return { error: "Só o administrador do grupo pode mudar as vagas." };
  }

  const valor =
    capacity === null || Number.isNaN(capacity)
      ? null
      : Math.max(0, Math.trunc(capacity));

  const { error } = await ctx.supabase
    .from("tournaments")
    .update({ capacity: valor })
    .eq("id", tournamentId)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

// Marca ou desmarca alguém no churrasco. Cada um responde por si; o
// administrador responde por qualquer um. É independente do jogo: quem não vai
// jogar também come.
export async function setChurrasco(
  groupId: string,
  tournamentId: string,
  memberId: string,
  sim: boolean
) {
  const ctx = await ctxFor(groupId);
  if (!ctx) return { error: "Sem permissão." };
  if (!ctx.isAdmin && memberId !== ctx.memberId) {
    return { error: "Você só pode responder por você." };
  }

  const { error } = await ctx.supabase.from("attendance").upsert(
    {
      group_id: groupId,
      tournament_id: tournamentId,
      member_id: memberId,
      churrasco: sim,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tournament_id,member_id" }
  );
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

// Divide o gasto da carne entre quem marcou o churrasco. O Pix é de quem
// comprou, não do caixa do grupo — e quem comprou não é cobrado, já pagou.
export async function ratearChurrasco(
  groupId: string,
  tournamentId: string,
  total: number,
  pix: string,
  compradorId: string
) {
  const ctx = await ctxFor(groupId);
  if (!ctx?.isAdmin) {
    return { error: "Só o dono ou um administrador pode ratear o churrasco." };
  }
  if (!(total > 0)) return { error: "Informe quanto foi gasto." };
  if (!pix.trim()) return { error: "Informe o Pix de quem comprou a carne." };
  if (!compradorId) return { error: "Diga quem comprou a carne." };

  const { data: comem } = await ctx.supabase
    .from("attendance")
    .select("member_id")
    .eq("tournament_id", tournamentId)
    .eq("churrasco", true);

  const ids = (comem ?? []).map((a) => a.member_id);
  if (!ids.length) return { error: "Ninguém marcou o churrasco ainda." };

  const { data: torneio } = await ctx.supabase
    .from("tournaments")
    .select("date")
    .eq("id", tournamentId)
    .single();
  const quando = torneio?.date ?? new Date().toISOString().slice(0, 10);

  // Divide por todo mundo que come, inclusive quem comprou: a parte dele já
  // saiu do bolso quando pagou o açougue.
  const porPessoa = Math.round((total / ids.length) * 100) / 100;

  // Refazer o rateio substitui só o que ainda está em aberto — cobrança já
  // paga não é mexida.
  await ctx.supabase
    .from("payments")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("kind", "churrasco")
    .eq("status", "pending");

  const { data: jaPagas } = await ctx.supabase
    .from("payments")
    .select("member_id")
    .eq("tournament_id", tournamentId)
    .eq("kind", "churrasco");
  const pagos = new Set((jaPagas ?? []).map((p) => p.member_id));

  const linhas = ids
    .filter((id) => id !== compradorId && !pagos.has(id))
    .map((id) => ({
      group_id: groupId,
      member_id: id,
      amount: porPessoa,
      reference_month: `${quando.slice(0, 7)}-01`,
      due_date: quando,
      status: "pending" as const,
      tournament_id: tournamentId,
      pix_key: pix.trim(),
      kind: "churrasco",
    }));

  if (linhas.length) {
    const { error } = await ctx.supabase.from("payments").insert(linhas);
    if (error) return { error: error.message };
  }

  await ctx.supabase
    .from("tournaments")
    .update({
      churrasco_total: total,
      churrasco_pix: pix.trim(),
      churrasco_payee: compradorId,
    })
    .eq("id", tournamentId);

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  revalidatePath(`/app/groups/${groupId}/financeiro`);
  return { ok: true, cobrados: linhas.length, porPessoa };
}

// Liga ou desliga o churrasco do jogo. Ligado, aparece a marcação da carne
// ao lado de cada nome na lista pública.
export async function toggleChurrasco(
  groupId: string,
  tournamentId: string,
  tem: boolean
) {
  const ctx = await ctxFor(groupId);
  if (!ctx?.isAdmin) {
    return { error: "Só o administrador do grupo pode mexer no churrasco." };
  }

  const { error } = await ctx.supabase
    .from("tournaments")
    .update({ has_churrasco: tem })
    .eq("id", tournamentId)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}

// Responde "vou" ou "não vou". Cada um responde por si; o administrador pode
// responder por outro (tem gente que avisa por telefone e não abre o app).
export async function setAttendance(
  groupId: string,
  tournamentId: string,
  memberId: string,
  status: "yes" | "no" | null
) {
  const ctx = await ctxFor(groupId);
  if (!ctx) return { error: "Sem permissão." };
  if (!ctx.isAdmin && memberId !== ctx.memberId) {
    return { error: "Você só pode responder por você." };
  }

  if (status === null) {
    // Quem está no churrasco mantém a linha: só a resposta do jogo fica em
    // branco. Apagar a linha levaria a carne junto.
    const { data: linha } = await ctx.supabase
      .from("attendance")
      .select("churrasco")
      .eq("tournament_id", tournamentId)
      .eq("member_id", memberId)
      .maybeSingle();

    const query = linha?.churrasco
      ? ctx.supabase
          .from("attendance")
          .update({ status: null, updated_at: new Date().toISOString() })
      : ctx.supabase.from("attendance").delete();

    const { error } = await query
      .eq("tournament_id", tournamentId)
      .eq("member_id", memberId);
    if (error) return { error: error.message };
  } else {
    const { error } = await ctx.supabase.from("attendance").upsert(
      {
        group_id: groupId,
        tournament_id: tournamentId,
        member_id: memberId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tournament_id,member_id" }
    );
    if (error) return { error: error.message };
  }

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true };
}
