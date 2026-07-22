"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { financeSummary, financeReportHtml } from "@/lib/finance";
import { sendEmail } from "@/lib/email";

export async function addExpense(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const expense_date = String(formData.get("expense_date") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;

  if (!description) return { error: "Descreva a despesa." };
  if (!(amount > 0)) return { error: "Informe um valor maior que zero." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row: any = {
    group_id: groupId,
    description,
    amount,
    category,
    created_by: user?.id ?? null,
  };
  if (expense_date) row.expense_date = expense_date;

  const { error } = await supabase.from("expenses").insert(row);
  if (error) return { error: error.message };
  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true };
}

export async function deleteExpense(groupId: string, expenseId: string) {
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", expenseId);
  revalidatePath(`/app/groups/${groupId}/payments`);
}

// Envia o relatório financeiro por e-mail para os membros do grupo (com e-mail).
export async function sendFinanceReport(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // só admin do grupo
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role))
    return { error: "Sem permissão." };

  const summary = await financeSummary(supabase, groupId);

  const { data: members } = await supabase
    .from("group_members")
    .select("email")
    .eq("group_id", groupId)
    .eq("status", "active");
  const emails = Array.from(
    new Set(
      (members ?? [])
        .map((m: any) => m.email)
        .filter((e: any): e is string => !!e)
    )
  );
  if (emails.length === 0)
    return { error: "Nenhum membro com e-mail cadastrado no grupo." };

  const generatedAt = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const html = financeReportHtml(summary, generatedAt);

  let sent = 0;
  for (let i = 0; i < emails.length; i += 45) {
    const chunk = emails.slice(i, i + 45);
    const res = await sendEmail({
      to: user!.email!,
      bcc: chunk,
      subject: `Relatório financeiro — ${summary.groupName}`,
      html,
    });
    if (res.ok) sent += chunk.length;
    else if (res.skipped)
      return {
        error:
          "Envio de e-mail não configurado (RESEND_API_KEY ausente no Vercel).",
      };
  }
  if (sent === 0) return { error: "Não foi possível enviar o relatório." };
  return { ok: true, count: sent };
}
