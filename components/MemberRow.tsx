"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import ImageUpload from "@/components/ImageUpload";
import { ROLE_LABEL } from "@/lib/format";
import {
  updateMember,
  removeMember,
  invitePlayer,
  updatePlayer,
  setPlayerAvatar,
} from "@/app/actions/groups";

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
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState(member.name || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [email, setEmail] = useState(member.email || "");

  const displayName = member.name || member.profile?.full_name || "Jogador";
  const linked = !!member.user_id;

  function invite() {
    setMsg(null);
    start(async () => {
      const res = await invitePlayer(groupId, member.id, window.location.origin);
      if (res?.ok) setInvited(true);
      else setMsg(res?.error || "Erro ao convidar.");
    });
  }

  function saveEdit() {
    setMsg(null);
    start(async () => {
      const res = await updatePlayer(groupId, member.id, { name, phone, email });
      if (res?.ok) setEditing(false);
      else setMsg(res?.error || "Erro ao salvar.");
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar
          name={displayName}
          url={member.avatar_url || member.profile?.avatar_url}
          size={40}
        />
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
                start(async () => {
                  await updateMember(groupId, member.id, { role: e.target.value });
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="player">Jogador</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg px-2 py-1 text-xs text-slate-500"
              aria-label="Editar"
            >
              ✎
            </button>
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

      {canManage && editing && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <ImageUpload
            bucket="avatars"
            path={`${groupId}/${member.id}`}
            currentUrl={member.avatar_url || member.profile?.avatar_url}
            name={displayName}
            size={56}
            label="Foto do jogador"
            onSave={setPlayerAvatar.bind(null, groupId, member.id)}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            className="input !py-2"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefone"
            className="input !py-2"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="E-mail (para convidar)"
            className="input !py-2"
          />
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={pending} className="btn-primary flex-1 !py-2 text-sm">
              {pending ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost !py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {canManage && !editing && !linked && (
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
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-slate-400"
            >
              Sem e-mail — toque para adicionar e convidar
            </button>
          )}
        </div>
      )}

      {msg && <p className="mt-2 px-1 text-xs text-rose-500">{msg}</p>}
    </div>
  );
}
