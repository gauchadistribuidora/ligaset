"use client";

import { useState, useTransition } from "react";
import { sendFinanceReport } from "@/app/actions/finance";

export default function SendReportButton({ groupId }: { groupId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string; count?: number } | null>(null);

  function send() {
    setMsg(null);
    start(async () => {
      const res = await sendFinanceReport(groupId);
      setMsg(res as any);
    });
  }

  return (
    <div>
      <button
        onClick={() => {
          if (confirm("Enviar o relatório financeiro por e-mail para os membros do grupo?"))
            send();
        }}
        disabled={pending}
        className="btn-ghost w-full"
      >
        {pending ? "Enviando..." : "📧 Enviar por e-mail ao grupo"}
      </button>
      {msg?.error && <p className="mt-2 text-center text-sm text-rose-500">{msg.error}</p>}
      {msg?.ok && (
        <p className="mt-2 text-center text-sm text-court-600">
          Relatório enviado para {msg.count} membro(s)! ✓
        </p>
      )}
    </div>
  );
}
