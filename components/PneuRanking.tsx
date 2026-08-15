"use client";

import { useState } from "react";
import { PneuIcon } from "@/components/ui";

type Lancamento = { id: string; qty: number; occurred_on: string; note: string | null };
type Linha = { memberId: string; nome: string; total: number; lancamentos: Lancamento[] };

// Ranking do pneu. Tocar no pneu abre as datas em que o atleta tomou.
export default function PneuRanking({ linhas }: { linhas: Linha[] }) {
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div className="card !p-0">
      {linhas.map((r, i) => {
        const expandido = aberto === r.memberId;
        return (
          <div key={r.memberId} className="border-b border-slate-50 last:border-0">
            <button
              onClick={() => setAberto(expandido ? null : r.memberId)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className="w-6 shrink-0 text-center text-sm font-black text-slate-400">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 truncate font-semibold text-slate-800">
                {r.nome}
              </p>
              <span className="flex shrink-0 items-center gap-0.5 text-slate-700">
                {Array.from({ length: Math.min(r.total, 5) }).map((_, k) => (
                  <PneuIcon key={k} className="h-5 w-5" />
                ))}
              </span>
              <span className="w-8 shrink-0 text-right font-black text-slate-900">
                {r.total}
              </span>
              <span
                className={`shrink-0 text-slate-300 transition ${
                  expandido ? "rotate-90" : ""
                }`}
              >
                ›
              </span>
            </button>

            {expandido && (
              <div className="bg-slate-50 px-4 py-3">
                {r.lancamentos.length ? (
                  <ul className="space-y-1.5">
                    {r.lancamentos.map((l) => (
                      <li key={l.id} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 shrink-0 font-bold text-slate-400">
                          {l.qty > 0 ? `+${l.qty}` : l.qty}
                        </span>
                        <span className="min-w-0">
                          <span className="font-semibold text-slate-700">
                            {new Date(
                              l.occurred_on + "T00:00:00"
                            ).toLocaleDateString("pt-BR")}
                          </span>
                          {l.note && (
                            <span className="text-slate-500"> — {l.note}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">Sem lançamentos.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
