"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const color = String(formData.get("color") || "#10b981");
  if (!name) return;

  const { data, error } = await supabase
    .from("groups")
    .insert({ name, description, color, owner_id: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/app/groups");
  redirect(`/app/groups/${data.id}`);
}

export async function updateGroup(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const color = String(formData.get("color") || "#10b981");
  const { error } = await supabase
    .from("groups")
    .update({ name, description, color })
    .eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/groups/${groupId}`);
}

export async function updateSettings(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const default_game_format = Number(formData.get("default_game_format") || 6);
  const tie_break = formData.get("tie_break") === "on";
  const monthly_fee = Number(formData.get("monthly_fee") || 0);
  const due_day = Number(formData.get("due_day") || 10);
  const pix_key = String(formData.get("pix_key") || "").trim() || null;
  const { error } = await supabase
    .from("group_settings")
    .update({ default_game_format, tie_break, monthly_fee, due_day, pix_key })
    .eq("group_id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/groups/${groupId}`);
}

export async function addMemberByEmail(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Informe um e-mail." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (!profile) {
    return {
      error:
        "Nenhum jogador com esse e-mail ainda. Peça para a pessoa criar a conta no Ligaset primeiro.",
    };
  }

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: profile.id,
    role: "player",
    status: "active",
  });
  if (error) {
    if (error.code === "23505") return { error: "Esse jogador já está no grupo." };
    return { error: error.message };
  }
  revalidatePath(`/app/groups/${groupId}/members`);
  return { ok: true };
}

export async function updateMember(
  groupId: string,
  memberId: string,
  patch: { role?: string; status?: string }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .update(patch)
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/groups/${groupId}/members`);
}

export async function removeMember(groupId: string, memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/groups/${groupId}/members`);
}
