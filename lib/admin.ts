import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = (
  process.env.PLATFORM_ADMIN_EMAILS || "gauchadistribuidora@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isPlatformAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

// Retorna { supabase, user } se o usuário logado for admin da plataforma; senão null.
export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdminEmail(user.email)) return null;
  return { supabase, user };
}
