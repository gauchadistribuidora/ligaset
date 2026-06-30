"use client";

import { useState, useTransition } from "react";
import { generateMonthlyCharges } from "@/app/actions/payments";

export default function GenerateChargesForm({ groupId }: { groupId: string }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        ＋ Gerar mensalidades do mês
      </button>
    );
  }

  return (
    <form
      action={(fd) => start(() => generateMonthlyCharges(groupId, fd).then(() => setOpen(false)))}
      className="card space-y-3"
    >
      <p className="text-sm font-semibold text-slate-700">
        Gerar cobranças para todos os membros ativos
      </p>
      <input type="month" name="month" defaultValue={defaultMonth} className="input" />
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary flex-1">
          {pending ? "Gerando..." : "Gerar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
          Cancelar
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Usa o valor e o dia de vencimento definidos nas configurações do grupo.
      </p>
    </form>
  );
}
