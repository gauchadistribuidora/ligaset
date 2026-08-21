"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Membro = {
  id: string;
  name: string | null;
  status: "yes" | "no" | null;
  updated_at: string | null;
  partner_id?: string | null;
  partner_name?: string | null;
  is_guest?: boolean | null;
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
  const [lista, setLista] = useState(() =>
    [...membros].sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")
    )
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  // Quem está com o seletor de dupla aberto.
  const [escolhendo, setEscolhendo] = useState<string | null>(null);

  // Recarrega do banco: a dupla mexe em duas pessoas ao mesmo tempo, então
  // atualizar só a linha tocada deixaria a outra desatualizada.
  async function recarregar() {
    const supabase = createClient();
    const { data } = await supabase.rpc("public_attendance_list", {
      p_code: code,
    });
    const payload = data as any;
    if (payload?.members) {
      setLista(
        [...payload.members].sort((a: Membro, b: Membro) =>
          (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")
        )
      );
    }
  }

  // Levar alguém de fora: entra na lista como convidado, já em dupla.
  function convidarDeFora(memberId: string, nome: string) {
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc(
        "public_add_guest_partner",
        { p_code: code, p_member: memberId, p_nome: nome }
      );
      if (err || (data as any)?.error) {
        setError((data as any)?.error ?? "Não consegui salvar. Tente de novo.");
        return;
      }
      setEscolhendo(null);
      await recarregar();
    });
  }

  function definirDupla(memberId: string, partnerId: string | null) {
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc("public_set_partner", {
        p_code: code,
        p_member: memberId,
        p_partner: partnerId,
      });
      if (err || (data as any)?.error) {
        setError((data as any)?.error ?? "Não consegui salvar. Tente de novo.");
        return;
      }
      setEscolhendo(null);
      await recarregar();
    });
  }

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
      if (status === "no") await recarregar();
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

  const lotado = !!capacity && dentro.length >= capacity;

  // Cada dupla aparece nos dois atletas, então conta metade.
  const duplasFormadas = Math.floor(
    lista.filter((m) => m.partner_id).length / 2
  );

  // Quem pode ser escolhido: qualquer um do grupo ainda sem dupla.
  const livres = (paraQuem: string) =>
    lista
      .filter((m) => m.id !== paraQuem && !m.partner_id)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"));

  return (
    <div className="space-y-4">
      {lotado && (
        <div className="rounded-xl bg-amber-50 p-3 text-center ring-1 ring-amber-200">
          <p className="text-sm font-bold text-amber-800">
            Quadra lotada ({capacity} de {capacity})
          </p>
          <p className="text-xs text-amber-700">
            Você ainda pode marcar &quot;Vou&quot; — entra na lista de espera e
            sobe se alguém desistir.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-court-50 p-3">
          <p className="text-2xl font-black text-court-700">{dentro.length}</p>
          <p className="text-xs font-semibold text-slate-500">
            {capacity ? `confirmados de ${capacity}` : "confirmados"}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-2xl font-black text-slate-700">{duplasFormadas}</p>
          <p className="text-xs font-semibold text-slate-500">
            dupla(s) formada(s)
          </p>
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
            <div key={m.id} className="flex flex-wrap items-center gap-2 py-2">
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
                {m.is_guest && (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    convidado
                  </p>
                )}
                {m.partner_name ? (
                  <p className="truncate text-xs font-semibold text-court-600">
                    🤝 com {m.partner_name}
                  </p>
                ) : m.status === "yes" ? (
                  <button
                    disabled={pending}
                    onClick={() =>
                      setEscolhendo((v) => (v === m.id ? null : m.id))
                    }
                    className="text-xs font-semibold text-slate-400 underline"
                  >
                    escolher dupla
                  </button>
                ) : null}
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
              {m.partner_id && (
                <button
                  disabled={pending}
                  onClick={() => definirDupla(m.id, null)}
                  className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-400 ring-1 ring-slate-200"
                  title="Desfazer a dupla"
                >
                  ✕
                </button>
              )}
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
              {escolhendo === m.id && (
                <div className="basis-full pt-2">
                  <select
                    defaultValue=""
                    disabled={pending}
                    onChange={(e) =>
                      e.target.value && definirDupla(m.id, e.target.value)
                    }
                    className="input"
                  >
                    <option value="" disabled>
                      Vou jogar com...
                    </option>
                    {livres(m.id).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name ?? "Sem nome"}
                      </option>
                    ))}
                  </select>
                  {!livres(m.id).length && (
                    <p className="pt-1 text-xs text-slate-400">
                      Todo mundo já tem dupla.
                    </p>
                  )}

                  <p className="pt-2 text-xs text-slate-400">
                    ou vai levar alguém de fora?
                  </p>
                  <form
                    action={(fd) => {
                      const nome = String(fd.get("convidado") || "").trim();
                      if (!nome) {
                        setError("Escreva o nome do convidado.");
                        return;
                      }
                      convidarDeFora(m.id, nome);
                    }}
                    className="flex gap-2 pt-1"
                  >
                    <input
                      name="convidado"
                      placeholder="Nome do convidado"
                      maxLength={60}
                      className="input flex-1"
                    />
                    <button
                      disabled={pending}
                      className="btn-primary shrink-0 !px-3 !py-2 text-xs"
                    >
                      Convidar
                    </button>
                  </form>
                </div>
              )}
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
        Ache o seu nome e toque em Vou ou Não. Depois, se já souber, escolha sua
        dupla. Não precisa de senha.
      </p>
    </div>
  );
}
