"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Ranking do pneu: quem perde de zero leva um pneu. Só o administrador do
// grupo lança e corrige — a checagem é aqui no servidor, além do RLS.
async function guard(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) return null;
  return { supabase, user };
}

function refresh(groupId: string) {
  revalidatePath(`/app/groups/${groupId}/pneus`);
}

function parseQty(raw: FormDataEntryValue | null): number | null {
  const n = Math.trunc(Number(String(raw ?? "1")));
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.max(-99, Math.min(99, n));
}

export async function addPneu(groupId: string, formData: FormData) {
  const ctx = await guard(groupId);
  if (!ctx) return { error: "Só o administrador do grupo pode lançar pneus." };

  const member_id = String(formData.get("member_id") || "");
  if (!member_id) return { error: "Escolha o atleta." };

  const qty = parseQty(formData.get("qty"));
  if (qty === null) return { error: "Quantidade inválida." };

  const { error } = await ctx.supabase.from("pneus").insert({
    group_id: groupId,
    member_id,
    qty,
    occurred_on: String(formData.get("occurred_on") || "") || undefined,
    note: String(formData.get("note") || "").trim() || null,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };

  refresh(groupId);
  return { ok: true };
}

export async function updatePneu(
  groupId: string,
  pneuId: string,
  formData: FormData
) {
  const ctx = await guard(groupId);
  if (!ctx) return { error: "Só o administrador do grupo pode corrigir pneus." };

  const qty = parseQty(formData.get("qty"));
  if (qty === null) return { error: "Quantidade inválida." };

  const { error } = await ctx.supabase
    .from("pneus")
    .update({
      qty,
      occurred_on: String(formData.get("occurred_on") || "") || undefined,
      note: String(formData.get("note") || "").trim() || null,
    })
    .eq("id", pneuId)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  refresh(groupId);
  return { ok: true };
}

// Fecha a temporada: congela quem levou mais pneu no período e guarda como
// troféu. O campeão é calculado aqui no servidor, não vem pronto da tela.
export async function closePneuSeason(groupId: string, formData: FormData) {
  const ctx = await guard(groupId);
  if (!ctx) return { error: "Só o administrador do grupo pode fechar a temporada." };

  const label = String(formData.get("label") || "").trim();
  if (!label) return { error: "Dê um nome à temporada. Ex: 2026." };
  const from = String(formData.get("from") || "");

  let q = ctx.supabase.from("pneus").select("member_id, qty").eq("group_id", groupId);
  if (from) q = q.gte("occurred_on", from);
  const { data: rows, error: readErr } = await q;
  if (readErr) return { error: readErr.message };

  const soma = new Map<string, number>();
  for (const r of rows ?? []) {
    soma.set(r.member_id, (soma.get(r.member_id) ?? 0) + r.qty);
  }
  const campeao = [...soma.entries()]
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])[0];

  if (!campeao) return { error: "Nenhum pneu no período — não há campeão." };

  const { error } = await ctx.supabase.from("pneu_seasons").insert({
    group_id: groupId,
    label,
    member_id: campeao[0],
    total: campeao[1],
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };

  refresh(groupId);
  return { ok: true };
}

export async function deletePneuSeason(groupId: string, seasonId: string) {
  const ctx = await guard(groupId);
  if (!ctx) return { error: "Sem permissão." };

  const { error } = await ctx.supabase
    .from("pneu_seasons")
    .delete()
    .eq("id", seasonId)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  refresh(groupId);
  return { ok: true };
}

export async function deletePneu(groupId: string, pneuId: string) {
  const ctx = await guard(groupId);
  if (!ctx) return { error: "Só o administrador do grupo pode apagar pneus." };

  const { error } = await ctx.supabase
    .from("pneus")
    .delete()
    .eq("id", pneuId)
    .eq("group_id", groupId);
  if (error) return { error: error.message };

  refresh(groupId);
  return { ok: true };
}
