"use server";

import { createClient } from "@/lib/supabase/server";
import { isPlatformAdminEmail } from "@/lib/admin";
import { revalidatePath } from "next/cache";

type ProfilePatch = {
  full_name?: string;
  phone?: string;
  state?: string;
  city?: string;
  sport?: string;
};

export async function updateUserProfile(userId: string, patch: ProfilePatch) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPlatformAdminEmail(user?.email)) return { error: "Sem permissão." };

  const update: Record<string, any> = {};
  (["full_name", "phone", "state", "city", "sport"] as const).forEach((k) => {
    if (patch[k] !== undefined) update[k] = patch[k]?.toString().trim() || null;
  });
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/app/admin");
  return { ok: true };
}

