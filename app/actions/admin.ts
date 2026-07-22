"use server";

import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/admin";
import { sendEmail, emailLayout } from "@/lib/email";
import { revalidatePath } from "next/cache";

type ProfilePatch = {
  full_name?: string;
  phone?: string;
  state?: string;
  city?: string;
  sport?: string;
};

export async function updateUserProfile(userId: string, patch: ProfilePatch) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPlatformAdminEmail(user?.email)) return { error: "Sem permissão." };

  const update: Record<string, any> = {};
  (["full_name", "phone", "state", "city", "sport"] as const).forEach((k) => {
    if (patch[k] !== undefined) update[k] = patch[k]?.toString().trim() || null;
  });
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/app/admin");
  return { ok: true };
}

export async function sendBroadcast(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPlatformAdminEmail(user?.email)) return { error: "Sem permissão." };

  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!subject || !message)
    return { error: "Preencha o assunto e a mensagem." };

  const { data: profiles } = await supabase.from("profiles").select("email");
  const emails = Array.from(
    new Set(
      (profiles ?? [])
        .map((p: any) => p.email)
        .filter((e: any): e is string => !!e)
    )
  );
  if (emails.length === 0) return { error: "Nenhum e-mail cadastrado." };

  const html = emailLayout({
    title: subject,
    intro: message.replace(/\n/g, "<br>"),
  });

  // Resend limita ~50 destinatários por envio; manda em lotes por BCC.
  let sent = 0;
  let anyFail = false;
  for (let i = 0; i < emails.length; i += 45) {
    const chunk = emails.slice(i, i + 45);
    const res = await sendEmail({
      to: user!.email!,
      bcc: chunk,
      subject,
      html,
      text: message,
    });
    if (res.ok) sent += chunk.length;
    else {
      anyFail = true;
      if (res.skipped)
        return {
          error:
            "Envio de e-mail não está configurado (RESEND_API_KEY ausente no Vercel).",
        };
    }
  }
  if (sent === 0) return { error: "Não foi possível enviar o informativo." };
  return { ok: true, count: sent, partial: anyFail };
}
