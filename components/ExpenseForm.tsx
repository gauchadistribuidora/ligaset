"use client";

import { useState, useTransition } from "react";
import { addExpense } from "@/app/actions/finance";

export default function ExpenseForm({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await addExpense(groupId, formData);
      setMsg(res);
      if (res?.ok)
        (document.getElementById("expense-form") as HTMLFormElement)?.reset();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        ＋ Adicionar despesa
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Nova despesa</p>
      <form id="expense-form" action={onSubmit} className="space-y-3">
        <div>
          <label className="label">Descrição *</label>
          <input
            name="description"
            required
            placeholder="Ex: Aluguel da quadra, bolas, luz"
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
            <input name="expense_date" type="date" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Categoria (opcional)</label>
          <input
            name="category"
            placeholder="Ex: Quadra, Material, Premiação"
            className="input"
          />
        </div>
        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Salvando..." : "Adicionar despesa"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
            Fechar
          </button>
        </div>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-court-600">Despesa adicionada! ✓</p>}
    </div>
  );
}
