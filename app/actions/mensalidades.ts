"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { codigoAmigavel } from "@/lib/slug";

// Link do mês. Um por mês: gerar de novo devolve o mesmo, senão cada clique
// criaria um endereço diferente e ninguém saberia qual está circulando.
export async function linkDasMensalidades(groupId: string, mes: string) {
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
    return { error: "Só o dono ou um administrador pode gerar o link." };
  }

  const referenceMonth = `${mes}-01`;

  const { data: existente } = await supabase
    .from("payment_links")
    .select("code")
    .eq("group_id", groupId)
    .eq("reference_month", referenceMonth)
    .maybeSingle();
  if (existente?.code) return { ok: true, code: existente.code };

  const { data: settings } = await supabase
    .from("group_settings")
    .select("pix_key")
    .eq("group_id", groupId)
    .maybeSingle();
  if (!settings?.pix_key) {
    return {
      error: "Cadastre a chave Pix do grupo em Configurações antes de gerar.",
    };
  }

  let code = "";
  for (const tam of [4, 5, 8]) {
    const tentativa = codigoAmigavel(`mensalidade ${mes}`, tam);
    const { data: ocupado } = await supabase
      .from("payment_links")
      .select("id")
      .eq("code", tentativa)
      .maybeSingle();
    if (!ocupado) {
      code = tentativa;
      break;
    }
  }
  if (!code) return { error: "Não consegui gerar o link. Tente de novo." };

  const { error } = await supabase.from("payment_links").insert({
    group_id: groupId,
    reference_month: referenceMonth,
    code,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true, code };
}
