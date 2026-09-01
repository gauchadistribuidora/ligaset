"use client";

import { useState, useTransition } from "react";
import { fecharMes, reabrirMes } from "@/app/actions/finance";
import { brl, monthLabel } from "@/lib/format";

type Fechamento = {
  id: string;
  reference_month: string;
  saldo_inicial: number;
  entradas: number;
  saidas: number;
  saldo_final: number;
  nota: string | null;
};

// O relatório é sempre do momento atual: lançar uma despesa antiga muda o
// passado. O fechamento congela os números do mês e vira prestação de contas.
export default function FechamentoDoMes({
  groupId,
  mesAtual,
  previa,
  fechamentos,
}: {
  groupId: string;
  mesAtual: string;
  previa: {
    saldoInicial: number;
    entradas: number;
    saidas: number;
    saldoFinal: number;
  };
  fechamentos: Fechamento[];
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const jaFechado = fechamentos.some(
    (f) => f.reference_month.slice(0, 7) === mesAtual
  );

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            🔒 Fechamento do mês
          </p>
          <p className="text-xs text-slate-500">
            {fechamentos.length
              ? `${fechamentos.length} mês(es) fechado(s)`
              : "Nenhum mês fechado ainda"}
          </p>
        </div>
        <button
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 text-xs font-bold text-court-600"
        >
          {aberto ? "Fechar" : "Ver"}
        </button>
      </div>

      {aberto && (
        <>
          {!jaFechado && (
            <form
              action={(fd) => {
                setError(null);
                const nota = String(fd.get("nota") || "");
                start(async () => {
                  const res = await fecharMes(groupId, mesAtual, nota);
                  if (res?.error) setError(res.error);
                });
              }}
              className="space-y-2 rounded-xl bg-slate-50 p-3"
            >
              <p className="text-xs font-semibold text-slate-600">
                Fechar {monthLabel(`${mesAtual}-01`)}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Numero rotulo="Saldo inicial" valor={previa.saldoInicial} />
                <Numero rotulo="Entradas" valor={previa.entradas} />
                <Numero rotulo="Saídas" valor={previa.saidas} />
                <Numero rotulo="Saldo final" valor={previa.saldoFinal} forte />
              </div>
              <textarea
                name="nota"
                rows={2}
                maxLength={300}
                placeholder="Observação (opcional)"
                className="input resize-y text-sm"
              />
              <button
                disabled={pending}
                className="btn-primary w-full !py-2 text-sm"
              >
                {pending ? "Fechando..." : "Fechar o mês"}
              </button>
              <p className="text-xs text-slate-400">
                Congela estes números. Lançamento novo com data deste mês passa
                a divergir do fechado — reabra se precisar corrigir.
              </p>
            </form>
          )}

          {fechamentos.map((f) => (
            <div key={f.id} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {monthLabel(f.reference_month)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Entradas {brl(Number(f.entradas))} · Saídas{" "}
                    {brl(Number(f.saidas))}
                  </p>
                  {f.nota && (
                    <p className="mt-1 text-xs text-slate-500">{f.nota}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-black ${
                      Number(f.saldo_final) < 0
                        ? "text-rose-500"
                        : "text-court-600"
                    }`}
                  >
                    {brl(Number(f.saldo_final))}
                  </p>
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("Reabrir este mês?")) return;
                      setError(null);
                      start(async () => {
                        const res = await reabrirMes(groupId, f.id);
                        if (res?.error) setError(res.error);
                      });
                    }}
                    className="text-xs font-semibold text-slate-400"
                  >
                    Reabrir
                  </button>
                </div>
              </div>
            </div>
          ))}

          {error && <p className="text-sm text-rose-500">{error}</p>}
        </>
      )}
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  forte,
}: {
  rotulo: string;
  valor: number;
  forte?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white p-2">
      <p className="text-[11px] text-slate-400">{rotulo}</p>
      <p
        className={`tabular-nums ${
          forte ? "font-black text-court-700" : "font-semibold text-slate-700"
        }`}
      >
        {brl(valor)}
      </p>
    </div>
  );
}
