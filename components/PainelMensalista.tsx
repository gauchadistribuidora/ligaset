"use client";

import { useState } from "react";
import { brl, monthLabel } from "@/lib/format";

type Linha = {
  id: string;
  nome: string;
  emAberto: number;
  vencidas: number;
  pendentes: number;
  desdeQuando: string | null;
  ultimoPagamento: string | null;
};

// Quem deve, quanto e desde quando. Os números já existiam na tela; faltava
// dizer de quem eram.
export default function PainelMensalista({
  linhas,
  totalAberto,
}: {
  linhas: Linha[];
  totalAberto: number;
}) {
  const [aberto, setAberto] = useState(false);

  const devendo = linhas.filter((l) => l.emAberto > 0);
  const emDia = linhas.length - devendo.length;

  if (!linhas.length) return null;

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            💳 Situação dos mensalistas
          </p>
          <p className="text-xs text-slate-500">
            {emDia} em dia · {devendo.length} devendo
            {totalAberto > 0 ? ` · ${brl(totalAberto)} em aberto` : ""}
          </p>
        </div>
        <button
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 text-xs font-bold text-court-600"
        >
          {aberto ? "Fechar" : "Ver lista"}
        </button>
      </div>

      {aberto && (
        <>
          {devendo.length ? (
            <div className="divide-y divide-slate-50">
              {devendo.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {l.nome}
                    </p>
                    <p className="text-xs text-slate-400">
                      {l.vencidas > 0
                        ? `${l.vencidas} vencida(s)`
                        : `${l.pendentes} pendente(s)`}
                      {l.desdeQuando
                        ? ` · desde ${monthLabel(l.desdeQuando)}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      l.vencidas > 0 ? "text-rose-500" : "text-amber-600"
                    }`}
                  >
                    {brl(l.emAberto)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-court-600">
              Todo mundo em dia. 🎉
            </p>
          )}

          {devendo.length > 0 && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Pessoal, quem ainda não acertou a mensalidade:\n\n${devendo
                  .map((l) => `• ${l.nome} — ${brl(l.emAberto)}`)
                  .join("\n")}\n\nQualquer dúvida me chamem.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full !py-2 text-sm"
            >
              📣 Cobrar os {devendo.length} que estão devendo
            </a>
          )}

          {emDia > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-slate-400">
                Ver os {emDia} que estão em dia
              </summary>
              <p className="mt-1 leading-relaxed text-slate-500">
                {linhas
                  .filter((l) => l.emAberto === 0)
                  .map((l) => l.nome)
                  .join(", ")}
              </p>
            </details>
          )}
        </>
      )}
    </div>
  );
}
