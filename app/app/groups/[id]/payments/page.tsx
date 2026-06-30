import { getGroupContext } from "@/lib/data";
import { Stat, EmptyState } from "@/components/ui";
import { brl, monthLabel } from "@/lib/format";
import GenerateChargesForm from "@/components/GenerateChargesForm";
import AddPaymentForm from "@/components/AddPaymentForm";
import PaymentRow from "@/components/PaymentRow";

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
          <div className="space-y-2">
            <GenerateChargesForm groupId={id} />
            <AddPaymentForm groupId={id} members={members ?? []} />
          </div>
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
