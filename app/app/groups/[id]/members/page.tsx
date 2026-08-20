import { getGroupContext } from "@/lib/data";
import AddMemberForm from "@/components/AddMemberForm";
import GroupNoticeForm from "@/components/GroupNoticeForm";
import InviteBox from "@/components/InviteBox";
import InviteLinkBox from "@/components/InviteLinkBox";
import MemberRow from "@/components/MemberRow";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isAdmin, group } = await getGroupContext(id);

  const { data: members } = await supabase
    .from("group_members")
    .select(
      "id, role, status, name, phone, email, user_id, avatar_url, is_guest, profile:profiles(id, full_name, email, avatar_url)"
    )
    .eq("group_id", id)
    .order("name", { ascending: true });

  // Quantas vezes cada um já confirmou presença (conta as vindas do convidado).
  const { data: presencas } = await supabase
    .from("attendance")
    .select("member_id")
    .eq("group_id", id)
    .eq("status", "yes");
  const visitas: Record<string, number> = {};
  for (const a of presencas ?? []) {
    visitas[a.member_id] = (visitas[a.member_id] ?? 0) + 1;
  }

  // Ordem alfabética de verdade: localeCompare respeita acento.
  const ordenados = [...(members ?? [])].sort((a: any, b: any) =>
    (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")
  );

  return (
    <div className="space-y-4">
      {isAdmin && <GroupNoticeForm groupId={id} />}
      {isAdmin && (
        <InviteLinkBox groupId={id} initialCode={group.invite_code ?? null} />
      )}
      {isAdmin && <AddMemberForm groupId={id} />}
      {isAdmin && <InviteBox groupId={id} />}

      <div className="card divide-y divide-slate-100 !p-0">
        {ordenados.map((m: any) => (
          <MemberRow
            key={m.id}
            groupId={id}
            member={m}
            canManage={isAdmin}
            isOwnerRow={m.role === "owner"}
            visitas={visitas[m.id] ?? 0}
          />
        ))}
      </div>

      <p className="px-1 text-xs text-slate-400">
        {ordenados.length} jogador(es). Basta nome e telefone para
        cadastrar. Adicione um e-mail e use “Convidar” quando quiser dar acesso
        ao app.
      </p>
    </div>
  );
}
