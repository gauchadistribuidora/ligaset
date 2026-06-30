"use client";

import { useTransition } from "react";
import { Avatar } from "@/components/ui";
import { brl, PAYMENT_LABEL, PAYMENT_STYLE } from "@/lib/format";
import { setPaymentStatus } from "@/app/actions/payments";

export default function PaymentRow({
  groupId,
  payment,
  canManage,
}: {
  groupId: string;
  payment: any;
  canManage: boolean;
}) {
  const [pending, start] = useTransition();
  const p = payment.profile;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar name={p?.full_name} url={p?.avatar_url} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p?.full_name || "Jogador"}</p>
        <p className="text-xs text-slate-400">{brl(Number(payment.amount))}</p>
      </div>

      {canManage ? (
        <select
          defaultValue={payment.status}
          disabled={pending}
          onChange={(e) =>
            start(() => setPaymentStatus(groupId, payment.id, e.target.value))
          }
          className={`rounded-lg border-0 px-2 py-1.5 text-xs font-semibold ${PAYMENT_STYLE[payment.status]}`}
        >
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="overdue">Vencido</option>
          <option value="exempt">Isento</option>
        </select>
      ) : (
        <span className={`chip ${PAYMENT_STYLE[payment.status]}`}>
          {PAYMENT_LABEL[payment.status]}
        </span>
      )}
    </div>
  );
}
