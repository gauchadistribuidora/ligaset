"use client";

import { useState, useTransition } from "react";
import {
  createTeamManual,
  deleteTeamManual,
  createMatchManual,
} from "@/app/actions/tournaments";

function teamLabel(t: any): string {
  if (t.name) return t.name;
  const a = t.player1?.name?.split(" ")[0] || "?";
  const b = t.player2?.name?.split(" ")[0] || "?";
  return `${a} & ${b}`;
}

export default function ManualBuilder({
  groupId,
  tournamentId,
  members,
  teams,
}: {
  groupId: string;
  tournamentId: string;
  members: any[];
  teams: any[];
}) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [ta, setTa] = useState("");
  const [tb, setTb] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function addTeam() {
    setMsg(null);
    start(async () => {
      const res = await createTeamManual(groupId, tournamentId, p1, p2);
      if (res?.error) setMsg(res.error);
      else {
        setP1("");
        setP2("");
      }
    });
  }

  function removeTeam(teamId: string) {
    if (confirm("Remover esta dupla? Os jogos dela também saem."))
      start(() => deleteTeamManual(groupId, tournamentId, teamId));
  }

  function addMatch() {
    setMsg(null);
    start(async () => {
      const res = await createMatchManual(groupId, tournamentId, ta, tb);
      if (res?.error) setMsg(res.error);
      else {
        setTa("");
        setTb("");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Duplas */}
      <section>
        <h3 className="mb-2 font-bold text-slate-800">👥 Duplas</h3>
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={p1} onChange={(e) => setP1(e.target.value)} className="input">
              <option value="">Jogador 1</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || "Jogador"}
                </option>
              ))}
            </select>
            <select value={p2} onChange={(e) => setP2(e.target.value)} className="input">
              <option value="">Jogador 2</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || "Jogador"}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={addTeam}
            disabled={pending || !p1 || !p2}
            className="btn-primary w-full"
          >
            ＋ Criar dupla
          </button>

          {teams.length > 0 && (
            <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1">
              {teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium">{teamLabel(t)}</span>
                  <button
                    onClick={() => removeTeam(t.id)}
                    disabled={pending}
                    className="text-xs text-rose-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Adicionar jogo */}
      {teams.length >= 2 && (
        <section>
          <h3 className="mb-2 font-bold text-slate-800">🎾 Adicionar jogo</h3>
          <div className="card space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={ta} onChange={(e) => setTa(e.target.value)} className="input">
                <option value="">Dupla A</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {teamLabel(t)}
                  </option>
                ))}
              </select>
              <select value={tb} onChange={(e) => setTb(e.target.value)} className="input">
                <option value="">Dupla B</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {teamLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={addMatch}
              disabled={pending || !ta || !tb}
              className="btn-dark w-full"
            >
              ＋ Criar jogo
            </button>
          </div>
        </section>
      )}

      {msg && <p className="px-1 text-sm text-rose-500">{msg}</p>}
    </div>
  );
}
