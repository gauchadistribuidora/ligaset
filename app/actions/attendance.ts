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
    const { error } = await ctx.supabase
      .from("attendance")
      .delete()
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
