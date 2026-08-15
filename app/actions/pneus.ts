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
