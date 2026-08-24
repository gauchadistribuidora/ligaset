"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { financeSummary, financeReportHtml } from "@/lib/finance";

// Receita lancada na mao: rifa, patrocinio, venda de camiseta. O que entra e
// nao passa pela mensalidade.
export async function addRevenue(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const revenue_date = String(formData.get("revenue_date") || "").trim();
  const bruta = String(formData.get("category") || "").trim();
  const category = bruta && bruta !== "__outra__" ? bruta : null;

  if (!description) return { error: "Descreva a receita." };
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
  if (revenue_date) row.revenue_date = revenue_date;

  const { error } = await supabase.from("revenues").insert(row);
  if (error) return { error: error.message };
  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true };
}

export async function deleteRevenue(groupId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("revenues").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true };
}

export async function addExpense(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const expense_date = String(formData.get("expense_date") || "").trim();
  const bruta = String(formData.get("category") || "").trim();
  const category = bruta && bruta !== "__outra__" ? bruta : null;

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
