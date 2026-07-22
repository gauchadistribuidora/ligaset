import { createClient } from "@supabase/supabase-js";

// Cliente com chave de serviço (secreta) — só no servidor.
// Aceita a chave nova (sb_secret_...) ou a service_role legada.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
