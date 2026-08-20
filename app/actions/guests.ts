"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Convite de amigo: qualquer membro do grupo pode gerar, não só o admin.
// É esse link que o atleta manda no WhatsApp para o amigo que vai jogar.
export async function createGuestInvite(groupId: string, tournamentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login para convidar." };

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Você precisa ser do grupo para convidar." };

  // Reaproveita o convite que a pessoa já criou para este mesmo jogo.
  const { data: existente } = await supabase
    .from("guest_invites")
    .select("code")
    .eq("group_id", groupId)
    .eq("tournament_id", tournamentId)
    .eq("invited_by", membership.id)
    .maybeSingle();
  if (existente?.code) return { ok: true, code: existente.code };

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const { error } = await supabase.from("guest_invites").insert({
    group_id: groupId,
    tournament_id: tournamentId,
    invited_by: membership.id,
    code,
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/tournaments/${tournamentId}`);
  return { ok: true, code };
}
