"use client";

import { useState, useTransition } from "react";
import { votar, fecharEnquete, excluirEnquete } from "@/app/actions/enquete";

type Voto = { choice_id: string; voter_id: string };
type Atleta = { id: string; name: string | null };

export default function Enquete({
  groupId,
  poll,
  atletas,
  votos,
  meuMemberId,
  isAdmin,
}: {
  groupId: string;
  poll: { id: string; pergunta: string; aberta: boolean };
  atletas: Atleta[];
  votos: Voto[];
  meuMemberId: string | null;
  isAdmin: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const meuVoto = votos.find((v) => v.voter_id === meuMemberId)?.choice_id;

  const contagem: Record<string, number> = {};
  for (const v of votos) contagem[v.choice_id] = (contagem[v.choice_id] ?? 0) + 1;

  const ranking = atletas
    .map((a) => ({ ...a, votos: contagem[a.id] ?? 0 }))
    .sort(
      (a, b) =>
        b.votos - a.votos ||
        (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")
    );

  const total = votos.length;
  const lider = ranking[0]?.votos ?? 0;

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {poll.pergunta}
          </p>
          <p className="text-xs text-slate-400">
            {total} voto(s){poll.aberta ? "" : " · encerrada"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 gap-3">
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await fecharEnquete(
                    groupId,
                    poll.id,
                    !poll.aberta
                  );
                  if (res?.error) setError(res.error);
                })
              }
              className="text-xs font-semibold text-court-600"
            >
              {poll.aberta ? "Encerrar" : "Reabrir"}
            </button>
            <button
              disabled={pending}
              onClick={() => {
                if (!confirm("Excluir esta enquete e os votos?")) return;
                start(async () => {
                  const res = await excluirEnquete(groupId, poll.id);
                  if (res?.error) setError(res.error);
                });
              }}
              className="text-xs font-semibold text-slate-400"
            >
              Excluir
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {ranking.map((a) => {
          const escolhido = meuVoto === a.id;
          const pct = total ? Math.round((100 * a.votos) / total) : 0;
          return (
            <button
              key={a.id}
              disabled={pending || !poll.aberta || !meuMemberId}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await votar(groupId, poll.id, a.id);
                  if (res?.error) setError(res.error);
                });
              }}
              className={`relative block w-full overflow-hidden rounded-lg px-3 py-2 text-left ring-1 transition ${
                escolhido
                  ? "ring-court-400"
                  : "ring-slate-200 hover:ring-slate-300"
              } ${!poll.aberta ? "cursor-default" : ""}`}
            >
              {/* Barra proporcional atrás do nome: o resultado se lê de relance. */}
              <span
                className={`absolute inset-y-0 left-0 ${
                  a.votos === lider && lider > 0
                    ? "bg-court-100"
                    : "bg-slate-100"
                }`}
                style={{ width: `${pct}%` }}
                aria-hidden
              />
              <span className="relative flex items-center justify-between gap-2">
                <span
                  className={`truncate text-sm ${
                    escolhido
                      ? "font-bold text-court-700"
                      : "font-medium text-slate-700"
                  }`}
                >
                  {escolhido ? "✓ " : ""}
                  {a.name ?? "Atleta"}
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-500">
                  {a.votos}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {!meuMemberId && (
        <p className="text-xs text-slate-400">
          Só quem é do grupo pode votar.
        </p>
      )}
      {poll.aberta && meuMemberId && (
        <p className="text-xs text-slate-400">
          {meuVoto
            ? "Pode trocar o voto até a enquete fechar."
            : "Toque no nome para votar."}
        </p>
      )}
      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
