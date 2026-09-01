"use client";

import { useState, useTransition } from "react";
import { addRevenue } from "@/app/actions/finance";
import CategoriaPicker, { CATEGORIAS_RECEITA } from "./CategoriaPicker";

// Entrada de dinheiro que não passa pela mensalidade: rifa, patrocínio, venda
// de camiseta, acerto de quadra em espécie.
export default function RevenueForm({
  groupId,
  extras = [],
}: {
  groupId: string;
  extras?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await addRevenue(groupId, formData);
      setMsg(res);
      if (res?.ok)
        (document.getElementById("revenue-form") as HTMLFormElement)?.reset();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        ＋ Adicionar receita
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Nova receita</p>
      <form id="revenue-form" action={onSubmit} className="space-y-3">
        <div>
          <label className="label">Descrição *</label>
          <input
            name="description"
            required
            placeholder="Ex: Rifa da camiseta, patrocínio do mês"
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$) *</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min={0}
              required
              placeholder="0,00"
              className="input"
            />
          </div>
          <div>
            <label className="label">Data</label>
            <input name="revenue_date" type="date" className="input" />
          </div>
        </div>

        <CategoriaPicker name="category" opcoes={CATEGORIAS_RECEITA} extras={extras} />

        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Salvando..." : "Adicionar receita"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-ghost"
          >
            Fechar
          </button>
        </div>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-court-600">Receita adicionada! ✓</p>}
    </div>
  );
}
