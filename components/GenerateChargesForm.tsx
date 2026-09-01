"use client";

import { useState, useTransition } from "react";
import { generateMonthlyCharges } from "@/app/actions/payments";
import { criarLinkCobranca } from "@/app/actions/cobranca";
import { brl, monthLabel } from "@/lib/format";

// Rotina do mês: gera as mensalidades e, na sequência, o link de cobrança para
// mandar no grupo. Os dois passos na mesma tela porque acontecem juntos.
export default function GenerateChargesForm({ groupId }: { groupId: string }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [feito, setFeito] = useState<{
    mes: string;
    criadas: number;
    valor: number;
    code?: string;
  } | null>(null);

  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const link = feito?.code ? `${origem}/cobrar/${feito.code}` : null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        ＋ Gerar mensalidades do mês
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          Mensalidades do mês
        </p>
        <button
          onClick={() => {
            setOpen(false);
            setFeito(null);
            setError(null);
          }}
          className="shrink-0 text-xs font-semibold text-slate-400"
        >
          Fechar
        </button>
      </div>

      {feito ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-court-50 p-3">
            <p className="text-sm font-semibold text-court-700">
              {feito.criadas > 0
                ? `${feito.criadas} mensalidade(s) de ${brl(feito.valor)} criadas`
                : "Todo mundo já tinha a mensalidade deste mês"}
            </p>
            <p className="text-xs text-slate-500">
              {monthLabel(`${feito.mes}-01`)} · convidados não entram na conta
            </p>
          </div>

          {link ? (
            <div className="space-y-2">
              <p className="break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                {link}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 2500);
                    } catch {
                      setError("Não consegui copiar. Copie o link na mão.");
                    }
                  }}
                  className="btn-ghost !py-2 text-sm"
                >
                  {copiado ? "Copiado! ✓" : "Copiar link"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Mensalidade de ${monthLabel(
                      `${feito.mes}-01`
                    )} — ${brl(feito.valor)}\n\nPague por aqui: ${link}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary !py-2 text-center text-sm"
                >
                  Mandar no grupo
                </a>
              </div>
            </div>
          ) : (
            <button
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await criarLinkCobranca(
                    groupId,
                    feito.valor,
                    `Mensalidade de ${monthLabel(`${feito.mes}-01`)}`
                  );
                  if (res?.error) setError(res.error);
                  else if (res?.code) setFeito({ ...feito, code: res.code });
                });
              }}
              className="btn-primary w-full !py-2 text-sm"
            >
              {pending
                ? "Gerando..."
                : "📲 Gerar link de cobrança para o grupo"}
            </button>
          )}
        </div>
      ) : (
        <form
          action={(fd) => {
            const mes = String(fd.get("month") || "");
            if (!mes) {
              setError("Escolha o mês.");
              return;
            }
            setError(null);
            start(async () => {
              const res = await generateMonthlyCharges(groupId, fd);
              if (res?.error) setError(res.error);
              else
                setFeito({
                  mes,
                  criadas: res?.criadas ?? 0,
                  valor: res?.valor ?? 0,
                });
            });
          }}
          className="space-y-3"
        >
          <input
            type="month"
            name="month"
            defaultValue={defaultMonth}
            className="input"
          />
          <button disabled={pending} className="btn-primary w-full">
            {pending ? "Gerando..." : "Gerar mensalidades"}
          </button>
          <p className="text-xs text-slate-400">
            Usa o valor e o dia de vencimento das configurações do grupo. Quem
            já tem a mensalidade do mês não recebe outra, e convidados ficam de
            fora.
          </p>
        </form>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}
