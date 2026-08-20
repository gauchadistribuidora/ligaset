"use client";

import { useState, useTransition } from "react";
import { setAttendance, toggleConfirmations } from "@/app/actions/attendance";
import { createGuestInvite } from "@/app/actions/guests";

type Member = { id: string; name: string | null };

export default function AttendanceList({
  groupId,
  tournamentId,
  members,
  answers,
  order,
  myMemberId,
  isAdmin,
  open,
  confirmCode,
  capacity,
  guestCode,
}: {
  groupId: string;
  tournamentId: string;
  members: Member[];
  answers: Record<string, "yes" | "no">;
  // Ordem de chegada da confirmação — define quem fica na lista de espera.
  order: Record<string, string>;
  myMemberId: string | null;
  isAdmin: boolean;
  open: boolean;
  confirmCode: string | null;
  capacity: number | null;
  guestCode: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"lista" | "convite" | null>(null);
  const [codigoConvite, setCodigoConvite] = useState(guestCode);

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

  const alfabetica = (a: Member, b: Member) =>
    (a.name ?? "").localeCompare(b.name ?? "", "pt-BR");

  // Quem confirmou sobe para o topo; dentro de cada bloco, ordem alfabética.
  const emOrdem = [...members].sort((a, b) => {
    const peso = (m: Member) =>
      answers[m.id] === "yes" ? 0 : answers[m.id] === "no" ? 2 : 1;
    return peso(a) - peso(b) || alfabetica(a, b);
  });

  // A vaga é de quem confirmou primeiro, então a fila usa a hora da resposta —
  // mesmo que a lista na tela apareça em ordem alfabética.
  const vao = members
    .filter((m) => answers[m.id] === "yes")
    .sort((a, b) => (order[a.id] ?? "").localeCompare(order[b.id] ?? ""));
  const naoVao = emOrdem.filter((m) => answers[m.id] === "no");
  const semResposta = emOrdem.filter((m) => !answers[m.id]);

  // Quem confirmou depois da quadra lotar entra como espera e sobe sozinho se
  // alguém desistir — a ordem é a da confirmação.
  const esperaIds = new Set(capacity ? vao.slice(capacity).map((m) => m.id) : []);
  const dentro = capacity ? vao.slice(0, capacity) : vao;

  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const publicLink = confirmCode ? `${origem}/c/${confirmCode}` : null;
  const conviteLink = codigoConvite ? `${origem}/convite/${codigoConvite}` : null;

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
            {capacity
              ? `${dentro.length} de ${capacity} vagas · restam ${Math.max(
                  0,
                  capacity - dentro.length
                )} · ${esperaIds.size} na espera`
              : `${vao.length} confirmado(s)`}{" "}
            · {naoVao.length} fora · {semResposta.length} sem responder
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

      {publicLink && (
        <div className="rounded-xl bg-ocean-900/5 p-3">
          <p className="text-xs font-semibold text-slate-600">
            🔗 Link para quem não tem o app
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">{publicLink}</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(publicLink);
                setCopied("lista");
                setTimeout(() => setCopied(null), 2500);
              } catch {
                setError("Não consegui copiar. Copie o link na mão.");
              }
            }}
            className="mt-2 text-xs font-bold text-court-600"
          >
            {copied === "lista" ? "Copiado! ✓" : "Copiar link"}
          </button>
        </div>
      )}

      {/* Convite para quem não é do grupo. É um link só, do jogo: quem recebe
          escolhe na tela quem o convidou. */}
      <div className="rounded-xl bg-amber-50 p-3">
        <p className="text-xs font-semibold text-slate-600">
          🙋 Link para convidar um amigo
        </p>
        {conviteLink ? (
          <>
            <p className="mt-1 break-all text-xs text-slate-500">
              {conviteLink}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(conviteLink);
                    setCopied("convite");
                    setTimeout(() => setCopied(null), 2500);
                  } catch {
                    setError("Não consegui copiar. Copie o link na mão.");
                  }
                }}
                className="text-xs font-bold text-court-600"
              >
                {copied === "convite" ? "Copiado! ✓" : "Copiar link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Bora jogar? Confirme sua presença aqui: ${conviteLink}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-court-600"
              >
                WhatsApp
              </a>
            </div>
          </>
        ) : (
          <button
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                const res = await createGuestInvite(groupId, tournamentId);
                if (res?.error) setError(res.error);
                else if (res?.code) setCodigoConvite(res.code);
              });
            }}
            className="mt-2 text-xs font-bold text-court-600"
          >
            {pending ? "Gerando..." : "Gerar link de convite"}
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
        {emOrdem.map((m) => {
          const r = answers[m.id];
          return (
            <div key={m.id} className="flex items-center gap-3 py-2">
              <span className="w-6 shrink-0 text-center">
                {r === "yes" ? "✅" : r === "no" ? "❌" : "⏳"}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${
                    r === "yes"
                      ? "font-semibold text-slate-800"
                      : "text-slate-500"
                  }`}
                >
                  {m.name ?? "Sem nome"}
                </p>
                {esperaIds.has(m.id) && (
                  <p className="text-xs font-semibold text-amber-600">
                    Lista de espera
                  </p>
                )}
              </div>
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
