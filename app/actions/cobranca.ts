"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { codigoAmigavel } from "@/lib/slug";

// Link de cobrança: o administrador gera um endereço e manda para quem quiser.
// Quem abre vê o QR do Pix do grupo, com valor sugerido ou em branco.
export async function criarLinkCobranca(
  groupId: string,
  valor: number | null,
  descricao: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Faça login." };

  const { data: eu } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!["owner", "admin"].includes(eu?.role ?? "")) {
    return { error: "Só o dono ou um administrador pode gerar cobrança." };
  }

  const { data: settings } = await supabase
    .from("group_settings")
    .select("pix_key")
    .eq("group_id", groupId)
    .maybeSingle();
  if (!settings?.pix_key) {
    return {
      error: "Cadastre a chave Pix do grupo em Configurações antes de cobrar.",
    };
  }

  const base = descricao?.trim() || "cobranca";
  let code = "";
  for (const tam of [4, 5, 8]) {
    const tentativa = codigoAmigavel(base, tam);
    const { data: ocupado } = await supabase
      .from("charge_links")
      .select("id")
      .eq("code", tentativa)
      .maybeSingle();
    if (!ocupado) {
      code = tentativa;
      break;
    }
  }
  if (!code) return { error: "Não consegui gerar o link. Tente de novo." };

  const { error } = await supabase.from("charge_links").insert({
    group_id: groupId,
    code,
    amount: valor && valor > 0 ? valor : null,
    description: descricao?.trim() || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true, code };
}
