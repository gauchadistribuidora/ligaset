"use client";

import { useMemo, useState } from "react";
import PaymentRow from "./PaymentRow";
import { brl, monthLabel } from "@/lib/format";

type Filtro = "todos" | "pagos" | "nao_pagos";

// A lista vinha na ordem em que as cobranças foram criadas, o que não ajuda a
// achar ninguém. Aqui vai em ordem alfabética, com filtro por situação.
export default function ListaMensalidades({
  groupId,
  meses,
  porMes,
  canManage,
}: {
  groupId: string;
  meses: string[];
  porMes: Record<string, any[]>;
  canManage: boolean;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const nomeDe = (p: any) =>
    p.member?.name || p.member?.profile?.full_name || "Jogador";

  const visiveis = useMemo(() => {
    const out: Record<string, any[]> = {};
    for (const mo of meses) {
      const linhas = (porMes[mo] ?? [])
        .filter((p) => {
          if (filtro === "pagos") return p.status === "paid";
          if (filtro === "nao_pagos") return p.status !== "paid";
          return true;
        })
        .sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), "pt-BR"));
      if (linhas.length) out[mo] = linhas;
    }
    return out;
  }, [meses, porMes, filtro]);

  const mesesComLinha = meses.filter((mo) => visiveis[mo]?.length);

  // Contagem sobre tudo, não só sobre o que o filtro deixou passar.
  const todas = meses.flatMap((mo) => porMes[mo] ?? []);
  const pagos = todas.filter((p) => p.status === "paid").length;
  const naoPagos = todas.length - pagos;
  const aReceber = todas
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + Number(p.amount), 0);

  const botoes: { chave: Filtro; texto: string }[] = [
    { chave: "todos", texto: `Todos (${todas.length})` },
    { chave: "nao_pagos", texto: `Não pagos (${naoPagos})` },
    { chave: "pagos", texto: `Pagos (${pagos})` },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {botoes.map((b) => (
          <button
            key={b.chave}
            onClick={() => setFiltro(b.chave)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              filtro === b.chave
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {b.texto}
          </button>
        ))}
      </div>

      {filtro === "nao_pagos" && aReceber > 0 && (
        <p className="px-1 text-xs font-semibold text-amber-600">
          {brl(aReceber)} a receber
        </p>
      )}

      {mesesComLinha.length ? (
        mesesComLinha.map((mo) => (
          <section key={mo}>
            <h3 className="mb-2 font-bold capitalize text-slate-800">
              {monthLabel(mo)}
            </h3>
            <div className="card divide-y divide-slate-100 !p-0">
              {visiveis[mo].map((p) => (
                <PaymentRow
                  key={p.id}
                  groupId={groupId}
                  payment={p}
                  canManage={canManage}
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="px-1 py-2 text-sm text-slate-400">
          {filtro === "pagos"
            ? "Nenhuma mensalidade paga ainda."
            : "Ninguém em aberto. 🎉"}
        </p>
      )}
    </div>
  );
}
