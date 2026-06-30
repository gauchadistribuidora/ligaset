import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export async function getGroupContext(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", groupId)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!membership) notFound();

  const { data: settings } = await supabase
    .from("group_settings")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();

  const isAdmin = membership.role === "owner" || membership.role === "admin";

  return { supabase, user: user!, group, membership, settings, isAdmin };
}
