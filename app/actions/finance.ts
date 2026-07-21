"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
