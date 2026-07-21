"use client";

import { useTransition } from "react";
import { brl, shortDate } from "@/lib/format";
import { deleteExpense } from "@/app/actions/finance";

export default function ExpenseRow({
  groupId,
  expense,
  canManage,
}: {
  groupId: string;
  expense: any;
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-800">
          {expense.description}
        </p>
        <p className="text-xs text-slate-400">
          {shortDate(expense.expense_date)}
          {expense.category ? ` • ${expense.category}` : ""}
        </p>
      </div>
      <span className="shrink-0 font-bold text-rose-500">
        − {brl(Number(expense.amount))}
      </span>
      {canManage && (
        <button
          onClick={() => {
            if (confirm("Excluir esta despesa?"))
              start(() => deleteExpense(groupId, expense.id));
          }}
          disabled={pending}
          className="rounded-lg px-2 py-1 text-xs text-rose-500"
          aria-label="Excluir"
        >
          ✕
        </button>
      )}
    </div>
  );
}
