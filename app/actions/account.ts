"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteMyAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Você não está autenticado." };

  const admin = createAdminClient();
  if (!admin)
    return {
      error:
        "Exclusão indisponível no momento: a chave de serviço não está configurada no servidor.",
    };

  // Apaga o usuário de auth; o banco remove em cascata perfil, participações etc.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  return { ok: true };
}
