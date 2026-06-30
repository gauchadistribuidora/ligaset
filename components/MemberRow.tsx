"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/format";
import { updateMember, removeMember, invitePlayer } from "@/app/actions/groups";

export default function MemberRow({
  groupId,
  member,
  canManage,
  isOwnerRow,
}: {
  groupId: string;
  member: any;
  canManage: boolean;
  isOwnerRow: boolean;
}) {
  const [pending, start] = useTransition();
  const [invited, setInvited] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const displayName = member.name || member.profile?.full_name || "Jogador";
  const linked = !!member.user_id;

  function invite() {
    setMsg(null);
    start(async () => {
      const res = await invitePlayer(groupId, member.id, window.location.origin);
      if (res?.ok) {
        setInvited(true);
      } else {
        setMsg(res?.error || "Erro ao convidar.");
      }
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={displayName} url={member.profile?.avatar_url} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{displayName}</p>
          <p className="truncate text-xs text-slate-400">
            {member.phone || member.email || "sem contato"}
            {linked && " · no app"}
          </p>
        </div>

        {canManage && !isOwnerRow ? (
          <div className="flex items-center gap-1">
            <select
              defaultValue={member.role}
              disabled={pending}
              onChange={(e) =>
                start(() =>
                  updateMember(groupId, member.id, { role: e.target.value })
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="player">Jogador</option>
              <option value="admin">Admin</option>
            </select>
            <button
              disabled={pending}
              onClick={() => {
                if (confirm("Remover este jogador do grupo?"))
                  start(() => removeMember(groupId, member.id));
              }}
              className="rounded-lg px-2 py-1 text-xs text-rose-500"
            >
              ✕
            </button>
          </div>
        ) : (
          <span className="chip bg-slate-100 text-slate-600">
            {ROLE_LABEL[member.role]}
          </span>
        )}
      </div>

      {canManage && !linked && (
        <div className="mt-2 flex items-center gap-2 pl-[52px]">
          {member.email ? (
            invited ? (
              <span className="text-xs text-court-600">Convite enviado ✓</span>
            ) : (
              <button
                onClick={invite}
                disabled={pending}
                className="text-xs font-semibold text-court-600"
              >
                {pending ? "Enviando..." : "✉️ Convidar por e-mail"}
              </button>
            )
          ) : (
            <span className="text-xs text-slate-400">
              Sem e-mail — adicione um e-mail para convidar
            </span>
          )}
          {msg && <span className="text-xs text-rose-500">{msg}</span>}
        </div>
      )}
    </div>
  );
}
