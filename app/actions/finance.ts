"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { financeSummary, financeReportHtml } from "@/lib/finance";

// Congela os numeros do mes. O relatorio e sempre do momento atual: lancar uma
// despesa antiga muda o passado, e prestacao de contas nao pode mudar.
export async function fecharMes(
  groupId: string,
  mes: string,
  nota: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Faca login." };

  const { data: eu } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!["owner", "admin"].includes(eu?.role ?? "")) {
    return { error: "So o dono ou um administrador pode fechar o mes." };
  }

  const mesDe = (d: string | null | undefined) =>
    d ? String(d).slice(0, 7) : "";

  const [{ data: pagamentos }, { data: despesas }, { data: receitas }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount, status, paid_at, reference_month")
        .eq("group_id", groupId),
      supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("group_id", groupId),
      supabase
        .from("revenues")
        .select("amount, revenue_date")
        .eq("group_id", groupId),
    ]);

  const pagos = (pagamentos ?? []).filter((p: any) => p.status === "paid");
  const somaEntradas = (ate: "no" | "antes") =>
    pagos
      .filter((p: any) => {
        const m = mesDe(p.paid_at ?? p.reference_month);
        return ate === "no" ? m === mes : m < mes;
      })
      .reduce((s: number, p: any) => s + Number(p.amount), 0) +
    (receitas ?? [])
      .filter((r: any) => {
        const m = mesDe(r.revenue_date);
        return ate === "no" ? m === mes : m < mes;
      })
      .reduce((s: number, r: any) => s + Number(r.amount), 0);

  const somaSaidas = (ate: "no" | "antes") =>
    (despesas ?? [])
      .filter((e: any) => {
        const m = mesDe(e.expense_date);
        return ate === "no" ? m === mes : m < mes;
      })
      .reduce((s: number, e: any) => s + Number(e.amount), 0);

  const saldoInicial = somaEntradas("antes") - somaSaidas("antes");
  const entradas = somaEntradas("no");
  const saidas = somaSaidas("no");

  const { error } = await supabase.from("month_closings").insert({
    group_id: groupId,
    reference_month: `${mes}-01`,
    saldo_inicial: saldoInicial,
    entradas,
    saidas,
    saldo_final: saldoInicial + entradas - saidas,
    nota: nota.trim() || null,
    closed_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true };
}

export async function reabrirMes(groupId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("month_closings")
    .delete()
    .eq("id", id)
    .eq("group_id", groupId);
  if (error) return { error: error.message };
  revalidatePath(`/app/groups/${groupId}/payments`);
  return { ok: true };
}

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
