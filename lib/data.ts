import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export async function getGroupContext(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: group }, { data: membership }, { data: settings }] =
    await Promise.all([
      supabase.from("groups").select("*").eq("id", groupId).single(),
      supabase
        .from("group_members")
        .select("role, status")
        .eq("group_id", groupId)
        .eq("user_id", user!.id)
        .maybeSingle(),
      supabase
        .from("group_settings")
        .select("*")
        .eq("group_id", groupId)
        .maybeSingle(),
    ]);

  if (!group) notFound();
  if (!membership) notFound();

  const isAdmin = membership.role === "owner" || membership.role === "admin";

  return { supabase, user: user!, group, membership, settings, isAdmin };
}
