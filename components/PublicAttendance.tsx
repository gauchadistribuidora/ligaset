"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Membro = {
  id: string;
  name: string | null;
  status: "yes" | "no" | null;
  updated_at: string | null;
  partner_id?: string | null;
  partner_name?: string | null;
  is_guest?: boolean | null;
  churrasco?: boolean | null;
};

const porNome = (a: Membro, b: Membro) =>
  (a.name ?? "").localeCompare(b.name ?? "", "pt-BR");

// Confirmação sem login: a pessoa acha o próprio nome na lista e responde.
export default function PublicAttendance({
  code,
  membros,
  capacity,
  churrasco,
}: {
  code: string;
  membros: Membro[];
  capacity: number | null;
  churrasco: boolean;
}) {
  const [lista, setLista] = useState(() => [...membros].sort(porNome));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [escolhendo, setEscolhendo] = useState<string | null>(null);

  // Recarrega do banco: dupla e churrasco mexem em mais de uma pessoa, então
  // atualizar só a linha tocada deixaria o resto desatualizado.
  async function recarregar() {
    const supabase = createClient();
    const { data } = await supabase.rpc("public_attendance_list", {
      p_code: code,
    });
    const payload = data as any;
    if (payload?.members) setLista([...payload.members].sort(porNome));
  }

  // Recarrega sozinha enquanto a página está à vista. Na véspera do jogo várias
  // pessoas mexem ao mesmo tempo; sem isso, duas escolhem a mesma dupla e uma
  // leva erro.
  const recarregarRef = useRef(recarregar);
  recarregarRef.current = recarregar;

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") recarregarRef.current();
    };
    const id = setInterval(tick, 12000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  function chamar(fn: string, args: Record<string, unknown>) {
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc(fn, args);
      if (err || (data as any)?.error) {
        setError((data as any)?.error ?? "Não consegui salvar. Tente de novo.");
        return;
      }
      setEscolhendo(null);
      await recarregar();
    });
  }

  const responder = (memberId: string, status: "yes" | "no") =>
    chamar("public_attendance_set", {
      p_code: code,
      p_member: memberId,
      p_status: status,
    });

  const definirDupla = (memberId: string, partnerId: string | null) =>
    chamar("public_set_partner", {
      p_code: code,
      p_member: memberId,
      p_partner: partnerId,
    });

  const convidarDeFora = (memberId: string, nome: string) =>
    chamar("public_add_guest_partner", {
      p_code: code,
      p_member: memberId,
      p_nome: nome,
    });

  const marcarChurrasco = (memberId: string, sim: boolean) =>
    chamar("public_set_churrasco", {
      p_code: code,
      p_member: memberId,
      p_sim: sim,
    });

  // A vaga é de quem confirmou primeiro, então a espera usa a hora da resposta.
  const confirmados = lista
    .filter((m) => m.status === "yes")
    .sort((a, b) => (a.updated_at ?? "").localeCompare(b.updated_at ?? ""));
  const dentro = capacity ? confirmados.slice(0, capacity) : confirmados;
  const espera = capacity ? confirmados.slice(capacity) : [];
  const lotado = !!capacity && dentro.length >= capacity;

  const naChurrasqueira = lista.filter((m) => m.churrasco).length;
  const duplasFormadas = Math.floor(
    lista.filter((m) => m.partner_id).length / 2
  );

  // Quem pode ser escolhido como dupla: do grupo e ainda sem par.
  const livres = (paraQuem: string) =>
    lista.filter((m) => m.id !== paraQuem && !m.partner_id).sort(porNome);

  const filtro = busca.trim().toLowerCase();
  const visivel = (m: Membro) =>
    !filtro || (m.name ?? "").toLowerCase().includes(filtro);

  // A ordem pedida: quem já resolveu a dupla aparece primeiro.
  const secoes = [
    {
      titulo: "Confirmados com dupla",
      gente: lista
        .filter((m) => m.status === "yes" && m.partner_id)
        .sort(porNome),
      forte: true,
    },
    {
      titulo: "Confirmados sem dupla",
      gente: lista
        .filter((m) => m.status === "yes" && !m.partner_id)
        .sort(porNome),
      forte: true,
    },
    {
      titulo: "Falta confirmar",
      gente: lista.filter((m) => !m.status).sort(porNome),
      forte: false,
    },
    {
      titulo: "Estão fora",
      gente: lista.filter((m) => m.status === "no").sort(porNome),
      forte: false,
    },
  ];

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

      <div
        className={`grid gap-2 text-center ${
          churrasco ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <div className="rounded-xl bg-court-50 p-3">
          <p className="text-2xl font-black text-court-700">{dentro.length}</p>
          <p className="text-xs font-semibold text-slate-500">
            {capacity ? `de ${capacity} vagas` : "confirmados"}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-2xl font-black text-slate-700">{duplasFormadas}</p>
          <p className="text-xs font-semibold text-slate-500">dupla(s)</p>
        </div>
        {churrasco && (
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-2xl font-black text-amber-700">
              {naChurrasqueira}
            </p>
            <p className="text-xs font-semibold text-slate-500">no churrasco</p>
          </div>
        )}
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar seu nome..."
        className="input"
      />

      {secoes.map((s) => {
        const gente = s.gente.filter(visivel);
        if (!gente.length) return null;
        return (
          <section key={s.titulo}>
            <p
              className={`mb-1 text-xs font-bold ${
                s.forte ? "text-court-700" : "text-slate-400"
              }`}
            >
              {s.titulo} ({s.gente.length})
            </p>
            <div className="divide-y divide-slate-100">
              {gente.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-2 py-2"
                >
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
                    {espera.some((x) => x.id === m.id) && (
                      <p className="text-xs font-semibold text-amber-600">
                        Lista de espera
                      </p>
                    )}
                  </div>

                  {m.partner_id && (
                    <button
                      disabled={pending}
                      onClick={() => definirDupla(m.id, null)}
                      title="Desfazer a dupla"
                      className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-400 ring-1 ring-slate-200"
                    >
                      ✕
                    </button>
                  )}

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

                  {/* Churrasco é independente do jogo: quem não joga também come. */}
                  {churrasco && (
                    <button
                      disabled={pending}
                      onClick={() => marcarChurrasco(m.id, !m.churrasco)}
                      title={
                        m.churrasco
                          ? "Sai do churrasco"
                          : "Fica para o churrasco"
                      }
                      className={`rounded-lg px-2 py-1.5 text-sm transition ${
                        m.churrasco
                          ? "bg-amber-100 ring-1 ring-amber-300"
                          : "bg-white opacity-40 ring-1 ring-slate-200"
                      }`}
                    >
                      🍖
                    </button>
                  )}

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
              ))}
            </div>
          </section>
        );
      })}

      {churrasco && (
        <form
          action={(fd) => {
            const nome = String(fd.get("churrasqueiro") || "").trim();
            if (!nome) {
              setError("Escreva o nome de quem vai ao churrasco.");
              return;
            }
            chamar("public_add_churrasco_guest", { p_code: code, p_nome: nome });
          }}
          className="rounded-xl bg-amber-50 p-3"
        >
          <p className="text-xs font-semibold text-slate-600">
            🍖 Alguém que vai só ao churrasco?
          </p>
          <div className="mt-2 flex gap-2">
            <input
              name="churrasqueiro"
              placeholder="Nome"
              maxLength={60}
              className="input flex-1"
            />
            <button
              disabled={pending}
              className="btn-primary shrink-0 !px-3 !py-2 text-xs"
            >
              Adicionar
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <p className="text-center text-xs text-slate-400">
        Ache o seu nome e toque em Vou ou Não. Depois, se já souber, escolha sua
        dupla. Não precisa de senha.
      </p>
    </div>
  );
}
