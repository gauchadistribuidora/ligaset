"use client";

import { useTransition } from "react";
import { brl, shortDate } from "@/lib/format";
import { deleteRevenue } from "@/app/actions/finance";

export default function RevenueRow({
  groupId,
  revenue,
  canManage,
}: {
  groupId: string;
  revenue: any;
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-800">
          {revenue.description}
        </p>
        <p className="text-xs text-slate-400">
          {shortDate(revenue.revenue_date)}
          {revenue.category ? ` • ${revenue.category}` : ""}
          {revenue.lancador?.full_name
            ? ` • Lançado por ${revenue.lancador.full_name}`
            : ""}
        </p>
      </div>
      <span className="shrink-0 font-bold text-court-600">
        + {brl(Number(revenue.amount))}
      </span>
      {canManage && (
        <button
          onClick={() => {
            if (confirm("Excluir esta receita?"))
              start(async () => {
                await deleteRevenue(groupId, revenue.id);
              });
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
