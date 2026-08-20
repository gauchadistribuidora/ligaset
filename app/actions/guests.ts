"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { codigoAmigavel } from "@/lib/slug";

// Convite de convidado: um link por jogo, que roda no grupo inteiro. Quem
// recebe é que diz quem o convidou — assim um link só serve para todo mundo.
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

  // Já existe link para este jogo? Reaproveita, seja de quem for.
  const { data: existente } = await supabase
    .from("guest_invites")
    .select("code")
    .eq("group_id", groupId)
    .eq("tournament_id", tournamentId)
    .limit(1)
    .maybeSingle();
  if (existente?.code) return { ok: true, code: existente.code };

  const { data: torneio } = await supabase
    .from("tournaments")
    .select("name")
    .eq("id", tournamentId)
    .maybeSingle();

  let code = "";
  for (const tam of [4, 5, 8]) {
    const tentativa = codigoAmigavel(torneio?.name ?? "jogo", tam);
    const { data: ocupado } = await supabase
      .from("guest_invites")
      .select("id")
      .eq("code", tentativa)
      .maybeSingle();
    if (!ocupado) {
      code = tentativa;
      break;
    }
  }
  if (!code) return { error: "Não consegui gerar o link. Tente de novo." };
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
