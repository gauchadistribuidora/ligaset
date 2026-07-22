import { createClient } from "@/lib/supabase/server";
import { PageHeader, Avatar, Stat } from "@/components/ui";
import { updateProfile } from "@/app/actions/profile";
import { isPlatformAdminEmail } from "@/lib/admin";
import DeleteAccountButton from "@/components/DeleteAccountButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user!.id);
  const groupIds = (memberships ?? []).map((m) => m.group_id);

  let wins = 0,
    losses = 0,
    games = 0;
  if (groupIds.length) {
    const { data: rk } = await supabase
      .from("group_rankings")
      .select("wins, losses, games_played")
      .eq("user_id", user!.id)
      .in("group_id", groupIds);
    for (const r of rk ?? []) {
      wins += r.wins ?? 0;
      losses += r.losses ?? 0;
      games += r.games_played ?? 0;
    }
  }
  const pct = games ? Math.round((100 * wins) / games) : 0;
  const isPlatformAdmin = isPlatformAdminEmail(user?.email);

  return (
    <div className="space-y-6">
      <PageHeader title="Meu perfil" />

      <div className="card flex items-center gap-4">
        <Avatar name={profile?.full_name} url={profile?.avatar_url} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">
            {profile?.full_name || "Jogador"}
          </p>
          <p className="truncate text-sm text-slate-400">{profile?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Jogos" value={games} />
        <Stat label="Vitórias" value={wins} />
        <Stat label="Derrotas" value={losses} />
        <Stat label="Aprov." value={`${pct}%`} />
      </div>

      <form action={updateProfile} className="card space-y-4">
        <h3 className="font-bold text-slate-800">Dados pessoais</h3>
        <div>
          <label className="label">Nome completo</label>
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input
            name="phone"
            defaultValue={profile?.phone ?? ""}
            placeholder="(00) 00000-0000"
            className="input"
          />
        </div>
        <button className="btn-primary w-full">Salvar</button>
      </form>

      {isPlatformAdmin && (
        <a href="/app/admin" className="btn-primary w-full">
          🛠️ Painel de administrador
        </a>
      )}

      <a href="/app/definir-senha" className="btn-ghost w-full">
        🔑 Criar / alterar senha
      </a>

      <form action="/auth/signout" method="post">
        <button className="btn-ghost w-full !text-rose-500">Sair da conta</button>
      </form>

      <div className="flex justify-center gap-4 pt-2 text-xs text-slate-400">
        <a href="/privacidade" className="underline">Privacidade</a>
        <a href="/termos" className="underline">Termos</a>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <DeleteAccountButton />
      </div>
    </div>
  );
}
