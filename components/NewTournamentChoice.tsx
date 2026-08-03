"use client";

import Link from "next/link";
import { useState } from "react";

// Existem dois tipos de torneio no app e eles moram em lugares diferentes:
// o do grupo (uma liga sua) e o federado (CBT, FGT, FGBT). Em vez de adivinhar,
// pergunta.
export default function NewTournamentChoice({
  label = "＋ Novo torneio",
  showFederated,
  variant = "primary",
}: {
  label?: string;
  showFederated: boolean;
  variant?: "primary" | "link";
}) {
  const [open, setOpen] = useState(false);

  // Sem acesso aos federados não há escolha a fazer — vai direto.
  if (!showFederated) {
    return (
      <Link
        href="/app/groups"
        className={variant === "primary" ? "btn-primary w-full" : "font-semibold text-court-600"}
      >
        {label}
      </Link>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? "btn-primary w-full"
            : "font-semibold text-court-600"
        }
      >
        {label}
      </button>
    );
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          Que tipo de torneio?
        </p>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Fechar
        </button>
      </div>

      <Link
        href="/app/groups"
        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-slate-800">
            👥 Da minha liga
          </span>
          <span className="block text-xs text-slate-500">
            Torneio de um grupo do Ligaset, com sorteio e ranking
          </span>
        </span>
        <span className="shrink-0 text-slate-300">›</span>
      </Link>

      <Link
        href="/app/externos/novo"
        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-slate-800">
            🎾 Federado
          </span>
          <span className="block text-xs text-slate-500">
            CBT, FGT, FGBT — entra no seu histórico pessoal
          </span>
        </span>
        <span className="shrink-0 text-slate-300">›</span>
      </Link>
    </div>
  );
}
