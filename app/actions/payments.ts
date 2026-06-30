"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Gera/atualiza cobranças do mês para todos os membros ativos do grupo.
export async function generateMonthlyCharges(
  groupId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const month = String(formData.get("month") || ""); // YYYY-MM
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
    .select("user_id")
    .eq("group_id", groupId)
    .eq("status", "active");

  const rows = (members ?? []).map((m) => ({
    group_id: groupId,
    user_id: m.user_id,
    amount,
    reference_month: referenceMonth,
    due_date: dueDate,
    status: "pending" as const,
  }));

  if (rows.length) {
    await supabase
      .from("payments")
      .upsert(rows, { onConflict: "group_id,user_id,reference_month", ignoreDuplicates: true });
  }
  revalidatePath(`/app/groups/${groupId}/payments`);
}

export async function setPaymentStatus(
  groupId: string,
  paymentId: string,
  status: string
) {
  const supabase = await createClient();
  const patch: any = { status };
  if (status === "paid") patch.paid_at = new Date().toISOString();
  if (status === "pending" || status === "overdue") patch.paid_at = null;
  await supabase.from("payments").update(patch).eq("id", paymentId);
  revalidatePath(`/app/groups/${groupId}/payments`);
}
