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

// ---------- testadores do módulo "Torneios de fora" ----------
// Lista separada de propósito: liberar o teste do módulo NÃO pode dar de brinde
// o painel de administração da plataforma. Identificamos por id, e não por
// e-mail, porque este repositório é público — id de usuário não expõe ninguém.
// Para incluir mais alguém sem mexer no código, use EXTERNAL_TESTER_IDS
// (ids separados por vírgula) nas variáveis de ambiente da Vercel.
const TESTER_IDS = (
  process.env.EXTERNAL_TESTER_IDS ||
  "9f4b8e76-781d-42c8-977e-176762950c44" // testadora convidada
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function isExternalTester(user?: {
  id?: string;
  email?: string | null;
} | null): boolean {
  if (!user) return false;
  return isPlatformAdminEmail(user.email) || TESTER_IDS.includes(user.id ?? "");
}

// Quem pode usar o módulo de torneios externos: admin da plataforma + convidados.
export async function requireExternalTester() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isExternalTester(user)) return null;
  return { supabase, user };
}
