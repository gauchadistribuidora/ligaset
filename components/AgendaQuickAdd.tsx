"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { quickAddAgenda } from "@/app/actions/external";

// Lembrete rápido no mural: nome e data, nada mais. O resto do torneio se
// preenche no dia em que ele começa.
export default function AgendaQuickAdd({
  showFederated,
}: {
  showFederated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  // Sem acesso aos federados não há o que anotar aqui — o torneio é do grupo.
  if (!showFederated) {
    return (
      <Link href="/app/groups" className="btn-ghost w-full">
        ＋ Criar torneio de uma liga
      </Link>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        ＋ Anotar um torneio
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          Anotar um torneio
        </p>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Fechar
        </button>
      </div>

      <form
        id="agenda-quick-form"
        action={(formData) => {
          setMsg(null);
          start(async () => {
            const res = await quickAddAgenda(formData);
            setMsg(res ?? null);
            if (res?.ok) {
              (
                document.getElementById("agenda-quick-form") as HTMLFormElement
              )?.reset();
            }
          });
        }}
        className="space-y-3"
      >
        <input
          name="name"
          required
          placeholder="Nome do torneio"
          className="input"
        />
        <input name="tournament_date" type="date" className="input" />
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Salvando..." : "Anotar na agenda"}
        </button>
      </form>

      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && (
        <p className="text-sm text-court-600">
          Anotado! Aparece aqui no mural até você começar o torneio. ✓
        </p>
      )}

      <p className="text-xs text-slate-400">
        Federação, categoria e parceiro você preenche quando o torneio começar —
        aqui é só o lembrete.
      </p>
    </div>
  );
}
