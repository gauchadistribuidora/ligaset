"use client";

import { useState, useTransition } from "react";
import { updateMatchTeams } from "@/app/actions/tournaments";

export default function EditMatchTeams({
  groupId,
  tournamentId,
  teamAId,
  teamBId,
  members,
  a1,
  a2,
  b1,
  b2,
}: {
  groupId: string;
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  members: any[];
  a1?: string;
  a2?: string;
  b1?: string;
  b2?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pa1, setPa1] = useState(a1 || "");
  const [pa2, setPa2] = useState(a2 || "");
  const [pb1, setPb1] = useState(b1 || "");
  const [pb2, setPb2] = useState(b2 || "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    const ids = [pa1, pa2, pb1, pb2];
    if (ids.some((x) => !x)) {
      setMsg("Selecione os 4 atletas.");
      return;
    }
    if (new Set(ids).size !== 4) {
      setMsg("Os 4 atletas devem ser diferentes.");
      return;
    }
    start(async () => {
      const res = await updateMatchTeams(
        groupId,
        tournamentId,
        teamAId,
        teamBId,
        [pa1, pa2],
        [pb1, pb2]
      );
      if (res?.error) setMsg(res.error);
      else setOpen(false);
    });
  }

  const Sel = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input !py-2 text-sm"
    >
      <option value="">—</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name || m.profile?.full_name || "Jogador"}
        </option>
      ))}
    </select>
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pl-1 text-xs text-slate-400"
      >
        ✎ Editar duplas
      </button>
    );
  }

  return (
    <div className="card space-y-2 !p-3">
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-500">Dupla A</p>
        <div className="grid grid-cols-2 gap-2">
          <Sel value={pa1} onChange={setPa1} />
          <Sel value={pa2} onChange={setPa2} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-slate-500">Dupla B</p>
        <div className="grid grid-cols-2 gap-2">
          <Sel value={pb1} onChange={setPb1} />
          <Sel value={pb2} onChange={setPb2} />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="btn-primary flex-1 !py-2 text-sm"
        >
          {pending ? "Salvando..." : "Salvar duplas"}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost !py-2 text-sm">
          Cancelar
        </button>
      </div>
      {msg && <p className="text-xs text-rose-500">{msg}</p>}
    </div>
  );
}
