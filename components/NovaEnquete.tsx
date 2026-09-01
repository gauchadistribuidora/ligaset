"use client";

import { useState, useTransition } from "react";
import { criarEnquete } from "@/app/actions/enquete";

// Perguntas que o grupo faz sempre — poupa digitar e dá a ideia para quem
// nunca criou uma.
const MODELOS = [
  "Quem vai ser o destaque da rodada?",
  "Quem vai ser o rei do pneu nessa rodada?",
  "Quem joga mais na temporada?",
  "Quem mais evoluiu no mês?",
];

export default function NovaEnquete({ groupId }: { groupId: string }) {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="btn-primary w-full"
      >
        ＋ Nova enquete
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Nova enquete</p>

      <div className="flex flex-wrap gap-2">
        {MODELOS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setPergunta(m)}
            className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200"
          >
            {m}
          </button>
        ))}
      </div>

      <div>
        <label className="label">Pergunta</label>
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          maxLength={120}
          placeholder="Quem vai ser o destaque da rodada?"
          className="input"
        />
        <p className="mt-1 text-xs text-slate-400">
          As opções são os atletas do grupo. Cada um vota em um só e pode
          trocar até a enquete fechar.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const res = await criarEnquete(groupId, pergunta, null);
              if (res?.error) setError(res.error);
              else {
                setPergunta("");
                setAberto(false);
              }
            });
          }}
          className="btn-primary flex-1 !py-2 text-sm"
        >
          {pending ? "Criando..." : "Criar enquete"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="btn-ghost !py-2 text-sm"
        >
          Cancelar
        </button>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
