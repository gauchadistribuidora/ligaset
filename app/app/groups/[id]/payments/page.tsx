import { getGroupContext } from "@/lib/data";
import { Stat, EmptyState } from "@/components/ui";
import { brl, monthLabel } from "@/lib/format";
import GenerateChargesForm from "@/components/GenerateChargesForm";
import AddPaymentForm from "@/components/AddPaymentForm";
import PaymentRow from "@/components/PaymentRow";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseRow from "@/components/ExpenseRow";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isAdmin, settings } = await getGroupContext(id);

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "*, member:group_members(id, name, profile:profiles(full_name, avatar_url))"
    )
    .eq("group_id", id)
    .order("reference_month", { ascending: false });
  const rows = payments ?? [];

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("group_id", id)
    .order("expense_date", { ascending: false });
  const expenseRows = expenses ?? [];

  // jogadores do grupo (para a cobrança avulsa)
  const { data: members } = isAdmin
    ? await supabase
        .from("group_members")
        .select("id, name")
        .eq("group_id", id)
        .eq("status", "active")
        .order("name")
    : { data: [] as any[] };

  const received = rows
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pending = rows.filter((p) => p.status === "pending").length;
  const overdue = rows.filter((p) => p.status === "overdue").length;
  const totalExpenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0);
  const saldo = received - totalExpenses;

  const byMonth: Record<string, any[]> = {};
  for (const p of rows) {
    (byMonth[p.reference_month] ??= []).push(p);
  }
  const months = Object.keys(byMonth).sort().reverse();

  return (
    <div className="space-y-5">
      {isAdmin && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Arrecadado" value={brl(received)} />
            <Stat label="Despesas" value={brl(totalExpenses)} />
            <Stat
              label="Saldo"
              value={
                <span className={saldo < 0 ? "text-rose-500" : "text-court-600"}>
                  {brl(saldo)}
                </span>
              }
            />
          </div>
          <p className="px-1 text-xs text-slate-400">
            {pending} pendente(s) • {overdue} vencida(s).
            {settings && Number(settings.monthly_fee) > 0
              ? ` Mensalidade: ${brl(Number(settings.monthly_fee))} • vence dia ${settings.due_day}.`
              : " Defina o valor da mensalidade nas configurações ⚙️."}
          </p>

          <div className="space-y-2">
            <GenerateChargesForm groupId={id} />
            <AddPaymentForm groupId={id} members={members ?? []} />
            <a
              href={`/app/groups/${id}/financeiro/relatorio`}
              className="btn-ghost block w-full text-center"
            >
              📄 Relatório financeiro (PDF / e-mail)
            </a>
          </div>

          <section>
            <h3 className="mb-2 font-bold text-slate-800">💸 Despesas</h3>
            <ExpenseForm groupId={id} />
            {expenseRows.length > 0 && (
              <div className="card mt-2 divide-y divide-slate-100 !p-0">
                {expenseRows.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    groupId={id}
                    expense={e}
                    canManage={isAdmin}
                  />
                ))}
              </div>
            )}
          </section>

          {months.length > 0 && (
            <h3 className="!mt-6 px-1 font-bold text-slate-800">
              🧾 Mensalidades
            </h3>
          )}
        </>
      )}

      {months.length ? (
        months.map((mo) => (
          <section key={mo}>
            <h3 className="mb-2 font-bold capitalize text-slate-800">
              {monthLabel(mo)}
            </h3>
            <div className="card divide-y divide-slate-100 !p-0">
              {byMonth[mo].map((p) => (
                <PaymentRow
                  key={p.id}
                  groupId={id}
                  payment={p}
                  canManage={isAdmin}
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <EmptyState
          icon="💰"
          title="Sem mensalidades"
          desc={
            isAdmin
              ? "Gere as cobranças do mês ou adicione uma cobrança avulsa para começar."
              : "Você não tem mensalidades registradas neste grupo."
          }
        />
      )}
    </div>
  );
}
