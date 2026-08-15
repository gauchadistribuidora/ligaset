"use client";

import { useState, useTransition } from "react";
import { addPneu, deletePneu, updatePneu } from "@/app/actions/pneus";

type Member = { id: string; name: string | null };

export default function PneuForm({
  groupId,
  members,
}: {
  groupId: string;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        Lançar pneu
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">Lançar pneu</p>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Fechar
        </button>
      </div>

      <form
        id="pneu-form"
        action={(formData) => {
          setMsg(null);
          start(async () => {
            const res = await addPneu(groupId, formData);
            setMsg(res ?? null);
            if (res?.ok)
              (document.getElementById("pneu-form") as HTMLFormElement)?.reset();
          });
        }}
        className="space-y-3"
      >
        <div>
          <label className="label">Atleta</label>
          <select name="member_id" required defaultValue="" className="input">
            <option value="" disabled>
              Escolha...
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? "Sem nome"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quantidade</label>
            <input
              name="qty"
              type="number"
              defaultValue={1}
              inputMode="numeric"
              className="input text-center"
            />
            <p className="mt-1 text-xs text-slate-400">
              Use número negativo para tirar um pneu lançado por engano.
            </p>
          </div>
          <div>
            <label className="label">Data</label>
            <input name="occurred_on" type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label">Observação (opcional)</label>
          <input
            name="note"
            placeholder="Ex: 6-0 contra o Leandro"
            className="input"
          />
        </div>

        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Salvando..." : "Lançar"}
        </button>
      </form>

      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-court-600">Pneu lançado! ✓</p>}
    </div>
  );
}

export function PneuRow({
  groupId,
  pneu,
  canManage,
}: {
  groupId: string;
  pneu: {
    id: string;
    qty: number;
    occurred_on: string;
    note: string | null;
    auto?: boolean;
    member?: { name: string | null } | null;
  };
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <form
        action={(formData) => {
          setError(null);
          start(async () => {
            const res = await updatePneu(groupId, pneu.id, formData);
            if (res?.error) setError(res.error);
            else setEditing(false);
          });
        }}
        className="card space-y-3"
      >
        <p className="text-sm font-semibold text-slate-700">
          {pneu.member?.name ?? "Atleta"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="qty"
            type="number"
            defaultValue={pneu.qty}
            className="input text-center"
            autoFocus
          />
          <input
            name="occurred_on"
            type="date"
            defaultValue={pneu.occurred_on}
            className="input"
          />
        </div>
        <input
          name="note"
          defaultValue={pneu.note ?? ""}
          placeholder="Observação"
          className="input"
        />
        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            className="btn-ghost"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${
          pneu.qty > 0
            ? "bg-slate-100 text-slate-600"
            : "bg-court-100 text-court-700"
        }`}
      >
        {pneu.qty > 0 ? `+${pneu.qty}` : pneu.qty}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {pneu.member?.name ?? "Atleta"}
          {pneu.auto && (
            <span className="ml-2 rounded-full bg-ocean-900/5 px-2 py-0.5 text-[10px] font-bold uppercase text-ocean-900">
              automático
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          {new Date(pneu.occurred_on + "T00:00:00").toLocaleDateString("pt-BR")}
          {pneu.note ? ` • ${pneu.note}` : ""}
        </p>
      </div>
      {canManage && (
        <>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            Editar
          </button>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Apagar este lançamento?"))
                start(async () => {
                  await deletePneu(groupId, pneu.id);
                });
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          >
            Apagar
          </button>
        </>
      )}
    </div>
  );
}
