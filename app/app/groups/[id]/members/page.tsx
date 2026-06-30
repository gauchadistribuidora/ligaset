import { getGroupContext } from "@/lib/data";
import AddMemberForm from "@/components/AddMemberForm";
import MemberRow from "@/components/MemberRow";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isAdmin } = await getGroupContext(id);

  const { data: members } = await supabase
    .from("group_members")
    .select(
      "id, role, status, name, phone, email, user_id, avatar_url, profile:profiles(id, full_name, email, avatar_url)"
    )
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
            isOwnerRow={m.role === "owner"}
          />
        ))}
      </div>

      <p className="px-1 text-xs text-slate-400">
        {(members ?? []).length} jogador(es). Basta nome e telefone para
        cadastrar. Adicione um e-mail e use “Convidar” quando quiser dar acesso
        ao app.
      </p>
    </div>
  );
}
