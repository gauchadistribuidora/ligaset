"use server";

import { createClient } from "@/lib/supabase/server";
import { emailLayout, sendEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ligaset.com.br";

// Aviso do administrador para os membros do grupo. Sai por e-mail, com cópia
// oculta — ninguém vê o endereço de ninguém.
export async function sendGroupNotice(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sem permissão." };

  // Só dono ou admin do grupo avisa o grupo inteiro. A checagem é aqui no
  // servidor — esconder o formulário na tela não seria proteção.
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "Só o administrador do grupo pode enviar avisos." };
  }

  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!subject || !message) {
    return { error: "Preencha o assunto e a mensagem." };
  }

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from("groups").select("name").eq("id", groupId).single(),
    supabase
      .from("group_members")
      .select("email")
      .eq("group_id", groupId)
      .eq("status", "active"),
  ]);

  const emails = Array.from(
    new Set(
      (members ?? [])
        .map((m: any) => m.email)
        .filter((e: any): e is string => !!e)
    )
  );
  if (emails.length === 0) {
    return {
      error:
        "Nenhum membro ativo do grupo tem e-mail cadastrado. Cadastre os e-mails em Membros.",
    };
  }

  const html = emailLayout({
    title: subject,
    intro: message.replace(/\n/g, "<br>"),
    ctaLabel: "Abrir o grupo no Ligaset",
    ctaUrl: `${SITE_URL}/app/groups/${groupId}`,
  });

  // O Resend limita os destinatários por envio; manda em lotes por BCC.
  let sent = 0;
  let anyFail = false;
  for (let i = 0; i < emails.length; i += 45) {
    const chunk = emails.slice(i, i + 45);
    const res = await sendEmail({
      to: user.email!,
      bcc: chunk,
      subject: group?.name ? `[${group.name}] ${subject}` : subject,
      html,
      text: message,
    });
    if (res.ok) sent += chunk.length;
    else {
      anyFail = true;
      if (res.skipped) {
        return {
          error:
            "O envio de e-mail ainda não está configurado (falta a RESEND_API_KEY na Vercel).",
        };
      }
    }
  }

  if (sent === 0) return { error: "Não foi possível enviar o aviso." };
  return { ok: true, count: sent, partial: anyFail };
}
