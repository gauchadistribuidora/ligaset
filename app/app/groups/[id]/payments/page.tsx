import { getGroupContext } from "@/lib/data";
import { Stat, EmptyState } from "@/components/ui";
import { brl, monthLabel } from "@/lib/format";
import GenerateChargesForm from "@/components/GenerateChargesForm";
import PaymentRow from "@/components/PaymentRow";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, isAdmin, settings } = await getGroupContext(id);

  const query = supabase
    .from("payments")
    .select("*, profile:profiles(id, full_name, avatar_url)")
    .eq("group_id", id)
    .order("reference_month", { ascending: false });

  // RLS já filtra: admin vê tudo, jogador vê só as suas.
  const { data: payments } = await query;
  const rows = payments ?? [];

  // resumo do mês mais recente
  const received = rows
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pending = rows.filter((p) => p.status === "pending").length;
  const overdue = rows.filter((p) => p.status === "overdue").length;

  // agrupa por mês
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
            <Stat label="Recebido" value={brl(received)} />
            <Stat label="Pendentes" value={pending} />
            <Stat label="Vencidas" value={overdue} />
          </div>
          {settings && (
            <p className="px-1 text-xs text-slate-400">
              Mensalidade do grupo: {brl(Number(settings.monthly_fee))} • vence
              dia {settings.due_day}.{" "}
              {Number(settings.monthly_fee) === 0 &&
                "Defina o valor nas configurações ⚙️."}
            </p>
          )}
          <GenerateChargesForm groupId={id} />
        </>
      )}

      {months.length ? (
        months.map((m) => (
          <section key={m}>
            <h3 className="mb-2 font-bold capitalize text-slate-800">
              {monthLabel(m)}
            </h3>
            <div className="card divide-y divide-slate-100 !p-0">
              {byMonth[m].map((p) => (
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
              ? "Gere as cobranças do mês para começar a controlar os pagamentos."
              : "Você não tem mensalidades registradas neste grupo."
          }
        />
      )}
    </div>
  );
}
