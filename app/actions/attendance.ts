"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await ctx.supabase
    .from("tournaments")
    .update({ confirmations_open: open })
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
