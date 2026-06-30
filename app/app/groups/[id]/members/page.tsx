import { getGroupContext } from "@/lib/data";
import AddMemberForm from "@/components/AddMemberForm";
import MemberRow from "@/components/MemberRow";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, group, isAdmin } = await getGroupContext(id);

  const { data: members } = await supabase
    .from("group_members")
    .select("id, role, status, profile:profiles(id, full_name, email, avatar_url)")
    .eq("group_id", id)
    .order("role", { ascending: true });

  return (
    <div className="space-y-4">
      {isAdmin && <AddMemberForm groupId={id} />}

      <div className="card divide-y divide-slate-100 !p-0">
        {(members ?? []).map((m: any) => (
          <MemberRow
            key={m.id}
            groupId={id}
            member={m}
            canManage={isAdmin}
            isOwnerRow={m.profile?.id === group.owner_id}
          />
        ))}
      </div>

      <p className="px-1 text-xs text-slate-400">
        {(members ?? []).length} membro(s). Para adicionar alguém, a pessoa
        precisa ter uma conta no Ligaset com o e-mail informado.
      </p>
    </div>
  );
}
