"use client";

import { useTransition } from "react";
import { Avatar } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/format";
import { updateMember, removeMember } from "@/app/actions/groups";

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
  const p = member.profile;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar name={p?.full_name} url={p?.avatar_url} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p?.full_name || "Jogador"}</p>
        <p className="truncate text-xs text-slate-400">{p?.email}</p>
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
  );
}
