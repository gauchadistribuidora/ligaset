"use client";

import { useState, useTransition } from "react";
import {
  createTeamManual,
  deleteTeamManual,
  registrarJogoTreino,
} from "@/app/actions/tournaments";

type Member = { id: string; name: string | null };
type Team = { id: string; player1?: any; player2?: any };

function nomeDupla(t: Team): string {
  const a = t.player1?.name?.split(" ")[0] || "?";
  const b = t.player2?.name?.split(" ")[0];
  return b ? `${a} & ${b}` : a;
}

// Dia de jogos com várias quadras. Não há sorteio: as duplas são cadastradas
// uma vez e cada jogo é registrado depois de acontecer, já com o placar.
export default function TreinoBuilder({
  groupId,
  tournamentId,
  members,
  teams,
}: {
  groupId: string;
  tournamentId: string;
  members: Member[];
  teams: Team[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [abrirDuplas, setAbrirDuplas] = useState(teams.length === 0);

  const emOrdem = [...members].sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")
  );
  const duplas = [...teams].sort((a, b) =>
    nomeDupla(a).localeCompare(nomeDupla(b), "pt-BR")
  );

  return (
    <div className="space-y-3">
      {/* Lançar o jogo que acabou — é o que mais se usa, então vem primeiro */}
      {duplas.length >= 2 && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            🎾 Lançar jogo que terminou
          </p>

          <form
            id="treino-jogo"
            action={(fd) => {
              setMsg(null);
              const ta = String(fd.get("team_a") || "");
              const tb = String(fd.get("team_b") || "");
              const ga = Number(fd.get("games_a"));
              const gb = Number(fd.get("games_b"));
              if (!ta || !tb) {
                setMsg({ error: "Escolha as duas duplas." });
                return;
              }
              if (!Number.isFinite(ga) || !Number.isFinite(gb)) {
                setMsg({ error: "Informe o placar." });
                return;
              }
              start(async () => {
                const res = await registrarJogoTreino(
                  groupId,
                  tournamentId,
                  ta,
                  tb,
                  ga,
                  gb
                );
                if (res?.error) setMsg({ error: res.error });
                else {
                  setMsg({ ok: "Jogo lançado! ✓" });
                  (
                    document.getElementById("treino-jogo") as HTMLFormElement
                  )?.reset();
                }
              });
            }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <select name="team_a" defaultValue="" className="input flex-1">
                <option value="" disabled>
                  Dupla...
                </option>
                {duplas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {nomeDupla(t)}
                  </option>
                ))}
              </select>
              <input
                name="games_a"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="0"
                className="input w-16 text-center"
              />
            </div>

            <div className="flex items-center gap-2">
              <select name="team_b" defaultValue="" className="input flex-1">
                <option value="" disabled>
                  Dupla...
                </option>
                {duplas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {nomeDupla(t)}
                  </option>
                ))}
              </select>
              <input
                name="games_b"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="0"
                className="input w-16 text-center"
              />
            </div>

            <button disabled={pending} className="btn-primary w-full">
              {pending ? "Lançando..." : "Lançar jogo"}
            </button>
          </form>

          {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
          {msg?.ok && <p className="text-sm text-court-600">{msg.ok}</p>}
        </div>
      )}

      {/* Duplas do dia */}
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Duplas do dia ({duplas.length})
            </p>
            {duplas.length < 2 && (
              <p className="text-xs text-slate-500">
                Cadastre ao menos duas para começar a lançar jogos.
              </p>
            )}
          </div>
          <button
            onClick={() => setAbrirDuplas((v) => !v)}
            className="shrink-0 text-xs font-semibold text-court-600"
          >
            {abrirDuplas ? "Fechar" : "Adicionar"}
          </button>
        </div>

        {abrirDuplas && (
          <form
            id="treino-dupla"
            action={(fd) => {
              setMsg(null);
              const p1 = String(fd.get("p1") || "");
              const p2 = String(fd.get("p2") || "");
              start(async () => {
                const res = await createTeamManual(
                  groupId,
                  tournamentId,
                  p1,
                  p2
                );
                if (res?.error) setMsg({ error: res.error });
                else
                  (
                    document.getElementById("treino-dupla") as HTMLFormElement
                  )?.reset();
              });
            }}
            className="space-y-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <select name="p1" defaultValue="" className="input">
                <option value="" disabled>
                  Jogador 1
                </option>
                {emOrdem.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? "Sem nome"}
                  </option>
                ))}
              </select>
              <select name="p2" defaultValue="" className="input">
                <option value="" disabled>
                  Jogador 2
                </option>
                {emOrdem.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? "Sem nome"}
                  </option>
                ))}
              </select>
            </div>
            <button disabled={pending} className="btn-ghost w-full !py-2 text-sm">
              {pending ? "..." : "＋ Adicionar dupla"}
            </button>
          </form>
        )}

        {duplas.length > 0 && (
          <div className="divide-y divide-slate-50">
            {duplas.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                  {nomeDupla(t)}
                </p>
                <button
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Remover esta dupla? Os jogos dela também saem."))
                      start(async () => {
                        await deleteTeamManual(groupId, tournamentId, t.id);
                      });
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
