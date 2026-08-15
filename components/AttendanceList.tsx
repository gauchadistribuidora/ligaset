"use client";

import { useState, useTransition } from "react";
import { setAttendance, toggleConfirmations } from "@/app/actions/attendance";

type Member = { id: string; name: string | null };

export default function AttendanceList({
  groupId,
  tournamentId,
  members,
  answers,
  myMemberId,
  isAdmin,
  open,
}: {
  groupId: string;
  tournamentId: string;
  members: Member[];
  answers: Record<string, "yes" | "no">;
  myMemberId: string | null;
  isAdmin: boolean;
  open: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    if (!isAdmin) return null;
    return (
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          ✋ Lista de confirmação
        </p>
        <p className="text-sm text-slate-500">
          Abra a lista para o pessoal marcar no app se vai ou não jogar. Você vê
          o total confirmado antes de fechar a quadra.
        </p>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await toggleConfirmations(groupId, tournamentId, true);
              if (res?.error) setError(res.error);
            })
          }
          className="btn-primary w-full"
        >
          {pending ? "Abrindo..." : "Abrir confirmação de presença"}
        </button>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    );
  }

  const vao = members.filter((m) => answers[m.id] === "yes");
  const naoVao = members.filter((m) => answers[m.id] === "no");
  const semResposta = members.filter((m) => !answers[m.id]);

  const responder = (memberId: string, status: "yes" | "no" | null) => {
    setError(null);
    start(async () => {
      const res = await setAttendance(groupId, tournamentId, memberId, status);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            ✋ Confirmação de presença
          </p>
          <p className="text-xs text-slate-500">
            {vao.length} confirmado(s) · {naoVao.length} fora ·{" "}
            {semResposta.length} sem responder
          </p>
        </div>
        {isAdmin && (
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await toggleConfirmations(
                  groupId,
                  tournamentId,
                  false
                );
                if (res?.error) setError(res.error);
              })
            }
            className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            Fechar lista
          </button>
        )}
      </div>

      {myMemberId && (
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Você vai jogar?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={pending}
              onClick={() => responder(myMemberId, "yes")}
              className={`btn !py-2 text-sm ${
                answers[myMemberId] === "yes"
                  ? "bg-court-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              ✅ Vou
            </button>
            <button
              disabled={pending}
              onClick={() => responder(myMemberId, "no")}
              className={`btn !py-2 text-sm ${
                answers[myMemberId] === "no"
                  ? "bg-rose-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              ❌ Não vou
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-50">
        {members.map((m) => {
          const r = answers[m.id];
          return (
            <div key={m.id} className="flex items-center gap-3 py-2">
              <span className="w-6 shrink-0 text-center">
                {r === "yes" ? "✅" : r === "no" ? "❌" : "⏳"}
              </span>
              <p
                className={`min-w-0 flex-1 truncate text-sm ${
                  r === "yes"
                    ? "font-semibold text-slate-800"
                    : "text-slate-500"
                }`}
              >
                {m.name ?? "Sem nome"}
              </p>
              {isAdmin && (
                <div className="flex shrink-0 gap-1">
                  <button
                    disabled={pending}
                    onClick={() => responder(m.id, r === "yes" ? null : "yes")}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-court-600 hover:bg-court-50"
                  >
                    Vai
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => responder(m.id, r === "no" ? null : "no")}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    Não
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
