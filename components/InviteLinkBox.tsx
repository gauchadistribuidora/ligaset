"use client";

import { useState, useTransition } from "react";
import { ensureInviteCode } from "@/app/actions/groups";

export default function InviteLinkBox({
  groupId,
  initialCode,
}: {
  groupId: string;
  initialCode: string | null;
}) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const link = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/entrar/${code}`
    : "";

  function gerar(rotate: boolean) {
    setError(null);
    setCopied(false);
    start(async () => {
      const res = await ensureInviteCode(groupId, rotate);
      if (res?.error) setError(res.error);
      else if (res?.code) setCode(res.code);
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não consegui copiar. Selecione o link e copie na mão.");
    }
  }

  if (!code) {
    return (
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          🔗 Link de convite
        </p>
        <p className="text-sm text-slate-500">
          Gere um link e mande no WhatsApp do grupo. Quem abrir entra como
          jogador, sem você precisar cadastrar um por um.
        </p>
        <button
          disabled={pending}
          onClick={() => gerar(false)}
          className="btn-primary w-full"
        >
          {pending ? "Gerando..." : "Gerar link de convite"}
        </button>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">🔗 Link de convite</p>

      <div className="break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        {link}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={copiar} className="btn-primary">
          {copied ? "Copiado! ✓" : "Copiar link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `Bora jogar? Entre no nosso grupo no Ligaset: ${link}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
        >
          Enviar no WhatsApp
        </a>
      </div>

      <button
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              "Gerar um link novo? O link antigo para de funcionar para quem ainda não entrou."
            )
          )
            gerar(true);
        }}
        className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600"
      >
        {pending ? "..." : "Trocar o link"}
      </button>

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
