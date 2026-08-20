"use client";

import { useState, useTransition } from "react";
import { createGuestInvite } from "@/app/actions/guests";

// Qualquer atleta do grupo convida um amigo para o jogo. O amigo abre o link,
// vê o jogo, o horário, a quadra e o Pix, e confirma presença.
export default function GuestInviteBox({
  groupId,
  tournamentId,
  tournamentName,
}: {
  groupId: string;
  tournamentId: string;
  tournamentName: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const link =
    code && typeof window !== "undefined"
      ? `${window.location.origin}/convite/${code}`
      : "";

  if (!code) {
    return (
      <div>
        <button
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const res = await createGuestInvite(groupId, tournamentId);
              if (res?.error) setError(res.error);
              else if (res?.code) setCode(res.code);
            });
          }}
          className="btn-ghost w-full"
        >
          {pending ? "Gerando..." : "🙋 Convidar um amigo"}
        </button>
        {error && (
          <p className="mt-1 text-center text-sm text-rose-500">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">
        🙋 Convite para um amigo
      </p>
      <p className="text-xs text-slate-500">
        Ele vê o jogo, o horário, a quadra e o Pix, confirma a presença e entra
        como convidado — não vira membro do grupo.
      </p>

      <div className="break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {link}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            } catch {
              setError("Não consegui copiar. Copie o link na mão.");
            }
          }}
          className="btn-ghost"
        >
          {copied ? "Copiado! ✓" : "Copiar link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `Bora jogar ${tournamentName}? Confirme sua presença aqui: ${link}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          WhatsApp
        </a>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
