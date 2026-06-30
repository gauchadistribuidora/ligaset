"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Gera cobranças do mês para TODOS os jogadores ativos do grupo (roster).
export async function generateMonthlyCharges(
  groupId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const month = String(formData.get("month") || "");
  if (!month) return;
  const referenceMonth = `${month}-01`;

  const { data: settings } = await supabase
    .from("group_settings")
    .select("monthly_fee, due_day")
    .eq("group_id", groupId)
    .single();

  const amount = Number(settings?.monthly_fee || 0);
  const dueDay = Number(settings?.due_day || 10);
  const dueDate = `${month}-${String(dueDay).padStart(2, "0")}`;

  const { data: members } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "active");

  const rows = (members ?? []).map((m) => ({
    group_id: groupId,
    member_id: m.id,
    amount,
    reference_month: referenceMonth,
    due_date: dueDate,
    status: "pending" as const,
  }));

  if (rows.length) {
    await supabase.from("payments").upsert(rows, {
      onConflict: "group_id,member_id,reference_month",
      ignoreDuplicates: true,
    });
  }
  revalidatePath(`/app/groups/${groupId}/payments`);
}

// Inclui UMA cobrança manual para um jogador.
export async function addPayment(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const memberId = String(formData.get("member_id") || "");
  const amount = Number(formData.get("amount") || 0);
  const month = String(formData.get("month") || "");
  const status = String(formData.get("status") || "pending");
  const dueDate = String(formData.get("due_date") || "") || null;
  if (!memberId || !month) {
    return { error: "Escolha o jogador e o mês." };
  }
  const referenceMonth = `${month}-01`;

  const { error } = await supabase.from("payments").insert({
    group_id: groupId,
    member_id: memberId,
    amount,
    reference_month: referenceMonth,
    due_date: dueDate,
    status,
    paid_at: status === "paid" ? new Date().toISOString() : null,
  });
  if (error) {
    if (error.code === "23505")
      return { error: "Esse jogador já tem cobrança nesse mês." };
    return { error: error.message };
  }
  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true };
}

// Edita valor / status / vencimento de uma cobrança.
export async function updatePayment(
  groupId: string,
  paymentId: string,
  patch: { amount?: number; status?: string; due_date?: string | null }
) {
  const supabase = await createClient();
  const update: any = {};
  if (patch.amount !== undefined) update.amount = patch.amount;
  if (patch.due_date !== undefined) update.due_date = patch.due_date || null;
  if (patch.status !== undefined) {
    update.status = patch.status;
    update.paid_at = patch.status === "paid" ? new Date().toISOString() : null;
  }
  const { error } = await supabase
    .from("payments")
    .update(update)
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true };
}

export async function setPaymentStatus(
  groupId: string,
  paymentId: string,
  status: string
) {
  return updatePayment(groupId, paymentId, { status });
}

export async function deletePayment(groupId: string, paymentId: string) {
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", paymentId);
  revalidatePath(`/app/groups/${groupId}/payments`);
}
