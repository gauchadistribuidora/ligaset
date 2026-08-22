"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicarTorneio } from "@/app/actions/tournaments";

// Jogo que se repete toda semana: clona a configuração e abre lista limpa.
export default function RepetirJogo({
  groupId,
  tournamentId,
}: {
  groupId: string;
  tournamentId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-xs font-bold text-court-600"
      >
        Repetir este jogo
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        setError(null);
        const data = String(fd.get("data") || "");
        start(async () => {
          const res = await duplicarTorneio(groupId, tournamentId, data || null);
          if (res?.error) setError(res.error);
          else if (res?.id) {
            router.push(`/app/groups/${groupId}/tournaments/${res.id}`);
          }
        });
      }}
      className="card space-y-2"
    >
      <p className="text-sm font-semibold text-slate-700">Repetir este jogo</p>
      <div>
        <label className="label">Data do novo jogo</label>
        <input name="data" type="date" className="input" />
      </div>
      <p className="text-xs text-slate-400">
        Copia formato, local, quadras, vagas e churrasco. A lista de presença
        nasce vazia — as confirmações deste jogo ficam onde estão.
      </p>
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary flex-1 !py-2 text-sm">
          {pending ? "Criando..." : "Criar o novo jogo"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="btn-ghost !py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
