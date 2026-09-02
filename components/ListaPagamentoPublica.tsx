"use client";

import { useState } from "react";
import PixQR from "./PixQR";
import { brl } from "@/lib/format";
import type { TipoChave } from "@/lib/pix";

type Pessoa = { nome: string; valor: number; pago: boolean };

// Quem falta pagar toca no próprio nome e o QR abre ali, com o valor dele.
export default function ListaPagamentoPublica({
  gente,
  grupo,
  mes,
  pix,
  pixTipo,
  pixCidade,
}: {
  gente: Pessoa[];
  grupo: string;
  mes: string;
  pix: string | null;
  pixTipo: TipoChave | null;
  pixCidade: string | null;
}) {
  const [abertoPara, setAbertoPara] = useState<string | null>(null);

  const pagos = gente.filter((g) => g.pago);
  const faltam = gente.filter((g) => !g.pago);
  const aReceber = faltam.reduce((s, g) => s + Number(g.valor), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-court-50 p-3">
          <p className="text-2xl font-black text-court-700">{pagos.length}</p>
          <p className="text-xs font-semibold text-slate-500">em dia</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-2xl font-black text-amber-700">{faltam.length}</p>
          <p className="text-xs font-semibold text-slate-500">
            {aReceber > 0 ? `a pagar · ${brl(aReceber)}` : "a pagar"}
          </p>
        </div>
      </div>

      <section>
        <p className="mb-1 text-xs font-bold text-amber-700">
          ⏳ Falta pagar ({faltam.length})
        </p>
        {faltam.length ? (
          <div className="divide-y divide-slate-100">
            {faltam.map((g, i) => {
              const chave = `${g.nome}-${i}`;
              const aberto = abertoPara === chave;
              return (
                <div key={chave} className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                      {g.nome}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-amber-600">
                      {brl(Number(g.valor))}
                    </span>
                    {pix && (
                      <button
                        onClick={() => setAbertoPara(aberto ? null : chave)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          aberto
                            ? "bg-slate-100 text-slate-500"
                            : "bg-court-500 text-white"
                        }`}
                      >
                        {aberto ? "Fechar" : "Pagar"}
                      </button>
                    )}
                  </div>

                  {aberto && pix && (
                    <div className="pt-2">
                      <PixQR
                        chave={pix}
                        tipo={pixTipo}
                        nome={grupo}
                        cidade={pixCidade}
                        valor={Number(g.valor)}
                        descricao={`Mensalidade ${mes} ${g.nome}`}
                        titulo={`Mensalidade de ${g.nome}`}
                      />
                      <p className="mt-2 text-center text-xs text-slate-400">
                        Depois de pagar, avise o administrador para ele dar
                        baixa.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-court-600">Todo mundo em dia! 🎉</p>
        )}
      </section>

      <section>
        <p className="mb-1 text-xs font-bold text-court-700">
          ✅ Em dia ({pagos.length})
        </p>
        {pagos.length ? (
          <p className="text-sm leading-relaxed text-slate-600">
            {pagos.map((g) => g.nome).join(", ")}
          </p>
        ) : (
          <p className="text-sm text-slate-400">Ninguém ainda.</p>
        )}
      </section>

      {!pix && (
        <p className="text-xs text-slate-400">
          O grupo ainda não cadastrou a chave Pix, então não dá para pagar por
          aqui.
        </p>
      )}
    </div>
  );
}
