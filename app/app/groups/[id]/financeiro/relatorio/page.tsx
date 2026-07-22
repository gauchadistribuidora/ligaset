import { getGroupContext } from "@/lib/data";
import { financeSummary } from "@/lib/finance";
import { brl, shortDate } from "@/lib/format";
import { PageHeader, Stat } from "@/components/ui";
import PrintButton from "@/components/PrintButton";
import SendReportButton from "@/components/SendReportButton";
import { notFound } from "next/navigation";

export default async function FinanceReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isAdmin } = await getGroupContext(id);
  if (!isAdmin) notFound();

  const s = await financeSummary(supabase, id);

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          title="Relatório financeiro"
          subtitle={s.groupName}
          back={`/app/groups/${id}/payments`}
        />
      </div>

      <div className="print-area space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Arrecadado" value={brl(s.received)} />
          <Stat label="Despesas" value={brl(s.totalExpenses)} />
          <Stat
            label="Saldo"
            value={
              <span className={s.saldo < 0 ? "text-rose-500" : "text-court-600"}>
                {brl(s.saldo)}
              </span>
            }
          />
        </div>

        <p className="px-1 text-sm text-slate-500">
          {s.pendingCount + s.overdueCount} mensalidade(s) pendente(s)/vencida(s) —{" "}
          {brl(s.pendingAmount)} a receber.
        </p>

        <section>
          <h3 className="mb-2 font-bold text-slate-800">Despesas</h3>
          {s.expenses.length ? (
            <div className="card !p-0">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-400">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 pl-4 text-left font-medium">Data</th>
                    <th className="text-left font-medium">Descrição</th>
                    <th className="py-2 pr-4 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {s.expenses.map((e: any, i: number) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pl-4 text-slate-500">{shortDate(e.expense_date)}</td>
                      <td className="text-slate-700">
                        {e.description}
                        {e.category ? (
                          <span className="text-slate-400"> ({e.category})</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 text-right font-semibold text-rose-500">
                        − {brl(Number(e.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nenhuma despesa lançada.</p>
          )}
        </section>
      </div>

      <div className="no-print space-y-2">
        <PrintButton />
        <SendReportButton groupId={id} />
      </div>
    </div>
  );
}
