"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function souAdmin(supabase: any, groupId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: eu } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  return ["owner", "admin"].includes(eu?.role ?? "") ? user : null;
}

// O campeão pode ser membro do grupo (vira link para o perfil) ou um nome
// escrito à mão, de quem jogou antes do app existir.
export async function adicionarCampeao(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await souAdmin(supabase, groupId);
  if (!user) {
    return { error: "Só o dono ou um administrador pode mexer no mural." };
  }

  const texto = (chave: string) =>
    String(formData.get(chave) || "").trim() || null;
  const membro = (chave: string) => {
    const v = String(formData.get(chave) || "").trim();
    return v && v !== "__livre__" ? v : null;
  };

  const titulo = texto("titulo");
  if (!titulo) return { error: "Diga qual foi o torneio." };

  const member1_id = membro("member1_id");
  const nome1 = member1_id ? null : texto("nome1");
  if (!member1_id && !nome1) {
    return { error: "Diga quem foi o campeão." };
  }

  const member2_id = membro("member2_id");
  const nome2 = member2_id ? null : texto("nome2");

  const { error } = await supabase.from("champions").insert({
    group_id: groupId,
    titulo,
    event_date: texto("event_date"),
    categoria: texto("categoria"),
    member1_id,
    nome1,
    member2_id,
    nome2,
    observacao: texto("observacao"),
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/campeoes`);
  return { ok: true };
}

export async function excluirCampeao(groupId: string, id: string) {
  const supabase = await createClient();
  const user = await souAdmin(supabase, groupId);
  if (!user) {
    return { error: "Só o dono ou um administrador pode mexer no mural." };
  }

  const { error } = await supabase
    .from("champions")
    .delete()
    .eq("id", id)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/campeoes`);
  return { ok: true };
}
