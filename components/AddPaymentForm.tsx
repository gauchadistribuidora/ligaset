"use client";

import { useState, useTransition } from "react";
import { addPayment } from "@/app/actions/payments";

export default function AddPaymentForm({
  groupId,
  members,
}: {
  groupId: string;
  members: any[];
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  const now = new Date();
  const defMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function onSubmit(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await addPayment(groupId, formData);
      setMsg(res);
      if (res?.ok)
        (document.getElementById("pay-form") as HTMLFormElement)?.reset();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        ＋ Cobrança avulsa (manual)
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-semibold text-slate-700">Nova cobrança manual</p>
      <form id="pay-form" action={onSubmit} className="space-y-3">
        <div>
          <label className="label">Jogador</label>
          <select name="member_id" required className="input">
            <option value="">Selecione...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || "Jogador"}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Valor (R$)</label>
            <input name="amount" type="number" step="0.01" min={0} defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label">Mês</label>
            <input name="month" type="month" defaultValue={defMonth} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Vencimento</label>
            <input name="due_date" type="date" className="input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue="pending" className="input">
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Vencido</option>
              <option value="exempt">Isento</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary flex-1">
            {pending ? "Salvando..." : "Adicionar"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
            Fechar
          </button>
        </div>
      </form>
      {msg?.error && <p className="text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && <p className="text-sm text-court-600">Cobrança adicionada! ✓</p>}
    </div>
  );
}
