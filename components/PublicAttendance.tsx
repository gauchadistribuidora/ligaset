"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Membro = {
  id: string;
  name: string | null;
  status: "yes" | "no" | null;
  updated_at: string | null;
};

// Confirmação sem login: a pessoa acha o próprio nome na lista e responde.
export default function PublicAttendance({
  code,
  membros,
  capacity,
}: {
  code: string;
  membros: Membro[];
  capacity: number | null;
}) {
  const [lista, setLista] = useState(membros);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  function responder(memberId: string, status: "yes" | "no") {
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc("public_attendance_set", {
        p_code: code,
        p_member: memberId,
        p_status: status,
      });
      if (err || (data as any)?.error) {
        setError((data as any)?.error ?? "Não consegui salvar. Tente de novo.");
        return;
      }
      setLista((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, status, updated_at: new Date().toISOString() }
            : m
        )
      );
    });
  }

  // Ordem de chegada define quem está dentro e quem fica na espera.
  const confirmados = lista
    .filter((m) => m.status === "yes")
    .sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? ""));
  const dentro = capacity ? confirmados.slice(0, capacity) : confirmados;
  const espera = capacity ? confirmados.slice(capacity) : [];

  const filtrados = busca.trim()
    ? lista.filter((m) =>
        (m.name ?? "").toLowerCase().includes(busca.trim().toLowerCase())
      )
    : lista;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-court-50 p-3">
          <p className="text-2xl font-black text-court-700">{dentro.length}</p>
          <p className="text-xs font-semibold text-slate-500">
            {capacity ? `confirmados de ${capacity}` : "confirmados"}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-2xl font-black text-slate-700">{espera.length}</p>
          <p className="text-xs font-semibold text-slate-500">na espera</p>
        </div>
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar seu nome..."
        className="input"
      />

      <div className="divide-y divide-slate-100">
        {filtrados.map((m) => {
          const naEspera = espera.some((x) => x.id === m.id);
          return (
            <div key={m.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${
                    m.status === "yes"
                      ? "font-semibold text-slate-800"
                      : "text-slate-500"
                  }`}
                >
                  {m.name ?? "Sem nome"}
                </p>
                {naEspera && (
                  <p className="text-xs font-semibold text-amber-600">
                    Lista de espera
                  </p>
                )}
              </div>
              <button
                disabled={pending}
                onClick={() => responder(m.id, "yes")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  m.status === "yes"
                    ? "bg-court-500 text-white"
                    : "bg-white text-slate-500 ring-1 ring-slate-200"
                }`}
              >
                Vou
              </button>
              <button
                disabled={pending}
                onClick={() => responder(m.id, "no")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  m.status === "no"
                    ? "bg-rose-500 text-white"
                    : "bg-white text-slate-500 ring-1 ring-slate-200"
                }`}
              >
                Não
              </button>
            </div>
          );
        })}
        {!filtrados.length && (
          <p className="py-4 text-center text-sm text-slate-400">
            Nenhum nome encontrado.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <p className="text-center text-xs text-slate-400">
        Ache o seu nome e toque em Vou ou Não. Não precisa de senha.
      </p>
    </div>
  );
}
