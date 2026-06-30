import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/format";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("role, status, groups(id, name, description, color)")
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Grupos"
        subtitle="Suas turmas e arenas"
        action={
          <Link href="/app/groups/new" className="btn-primary !px-3 !py-2">
            ＋ Novo
          </Link>
        }
      />

      {memberships && memberships.length ? (
        <div className="space-y-3">
          {memberships.map((m: any) => (
            <Link
              key={m.groups.id}
              href={`/app/groups/${m.groups.id}`}
              className="card flex items-center gap-4 !py-4"
            >
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-black text-white"
                style={{ background: m.groups.color || "#0c1b2a" }}
              >
                {m.groups.name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{m.groups.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {m.groups.description || "Sem descrição"}
                </p>
              </div>
              <span className="chip bg-slate-100 text-slate-600">
                {ROLE_LABEL[m.role]}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🏖️"
          title="Você ainda não tem grupos"
          desc="Crie seu primeiro grupo de beach tennis e comece a organizar torneios e ranking."
          action={
            <Link href="/app/groups/new" className="btn-primary">
              Criar meu primeiro grupo
            </Link>
          }
        />
      )}
    </div>
  );
}
