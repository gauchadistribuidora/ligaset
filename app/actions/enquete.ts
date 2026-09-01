"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function contexto(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: eu } = await supabase
    .from("group_members")
    .select("id, role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!eu) return null;

  return {
    supabase,
    memberId: eu.id as string,
    isAdmin: ["owner", "admin"].includes(eu.role),
  };
}

export async function criarEnquete(
  groupId: string,
  pergunta: string,
  tournamentId: string | null
) {
  const ctx = await contexto(groupId);
  if (!ctx?.isAdmin) {
    return { error: "Só o dono ou um administrador pode criar enquete." };
  }
  const texto = pergunta.trim();
  if (texto.length < 5) return { error: "Escreva a pergunta." };

  const { error } = await ctx.supabase.from("polls").insert({
    group_id: groupId,
    tournament_id: tournamentId,
    pergunta: texto,
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/enquetes`);
  return { ok: true };
}

// Um voto por pessoa: mudar de ideia troca o voto, não soma outro.
export async function votar(
  groupId: string,
  pollId: string,
  choiceId: string
) {
  const ctx = await contexto(groupId);
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase.from("poll_votes").upsert(
    {
      poll_id: pollId,
      voter_id: ctx.memberId,
      choice_id: choiceId,
      voted_at: new Date().toISOString(),
    },
    { onConflict: "poll_id,voter_id" }
  );
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/enquetes`);
  return { ok: true };
}

export async function fecharEnquete(
  groupId: string,
  pollId: string,
  aberta: boolean
) {
  const ctx = await contexto(groupId);
  if (!ctx?.isAdmin) {
    return { error: "Só o dono ou um administrador pode fechar a enquete." };
  }

  const { error } = await ctx.supabase
    .from("polls")
    .update({ aberta })
    .eq("id", pollId)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/enquetes`);
  return { ok: true };
}

export async function excluirEnquete(groupId: string, pollId: string) {
  const ctx = await contexto(groupId);
  if (!ctx?.isAdmin) {
    return { error: "Só o dono ou um administrador pode excluir a enquete." };
  }

  const { error } = await ctx.supabase
    .from("polls")
    .delete()
    .eq("id", pollId)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/enquetes`);
  return { ok: true };
}
