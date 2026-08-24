import { getGroupContext } from "@/lib/data";
import { Stat, EmptyState } from "@/components/ui";
import { brl, monthLabel } from "@/lib/format";
import GenerateChargesForm from "@/components/GenerateChargesForm";
import AddPaymentForm from "@/components/AddPaymentForm";
import PaymentRow from "@/components/PaymentRow";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseRow from "@/components/ExpenseRow";
import RevenueForm from "@/components/RevenueForm";
import RevenueRow from "@/components/RevenueRow";
import PixQR from "@/components/PixQR";
import CobrancaPorLink from "@/components/CobrancaPorLink";

export const dynamic = "force-dynamic";

// "2026-08-14" ou "2026-08-14T..." -> "2026-08"
const mesDe = (d: string | null | undefined) => (d ? String(d).slice(0, 7) : "");

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, group, isAdmin, settings } = await getGroupContext(id);

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "*, member:group_members(id, name, profile:profiles(full_name, avatar_url)), lancador:profiles!payments_approved_by_fkey(full_name)"
    )
    .eq("group_id", id)
    .order("reference_month", { ascending: false });
  const umSo = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const rows = ((payments ?? []) as any[]).map((p) => ({
    ...p,
    lancador: umSo(p.lancador),
  }));

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, lancador:profiles!expenses_created_by_fkey(full_name)")
    .eq("group_id", id)
    .order("expense_date", { ascending: false });
  const expenseRows = ((expenses ?? []) as any[]).map((e) => ({
    ...e,
    lancador: umSo(e.lancador),
  }));

  const { data: revenues } = await supabase
    .from("revenues")
    .select("*, lancador:profiles!revenues_created_by_fkey(full_name)")
    .eq("group_id", id)
    .order("revenue_date", { ascending: false });
  const revenueRows = ((revenues ?? []) as any[]).map((r) => ({
    ...r,
    lancador: umSo(r.lancador),
  }));

  // jogadores do grupo (para a cobrança avulsa)
  const { data: members } = isAdmin
    ? await supabase
        .from("group_members")
        .select("id, name")
        .eq("group_id", id)
        .eq("status", "active")
        .order("name")
    : { data: [] as any[] };

  // O que EU devo. A cobranca do churrasco carrega o Pix de quem comprou a
  // carne; o resto vai para a chave do grupo.
  const { data: euMembro } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const minhasAbertas = rows.filter(
    (p) =>
      p.member_id === euMembro?.id &&
      (p.status === "pending" || p.status === "overdue")
  );

  const received = rows
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pending = rows.filter((p) => p.status === "pending").length;
  const overdue = rows.filter((p) => p.status === "overdue").length;
  const totalExpenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0);
  // Receita lançada na mão soma com o que veio das mensalidades.
  const totalRevenues = revenueRows.reduce((s, r) => s + Number(r.amount), 0);
  const saldo = received + totalRevenues - totalExpenses;

  // ---- Resumo do mês corrente ----
  // Entrada conta pela data do pagamento; saída, pela data da despesa. O saldo
  // inicial é tudo que aconteceu antes do mês.
  const mesAtual = new Date().toISOString().slice(0, 7);
  const pagos = rows.filter((p) => p.status === "paid");

  const entradasMes =
    pagos
      .filter((p) => mesDe(p.paid_at ?? p.reference_month) === mesAtual)
      .reduce((s, p) => s + Number(p.amount), 0) +
    revenueRows
      .filter((r) => mesDe(r.revenue_date) === mesAtual)
      .reduce((s, r) => s + Number(r.amount), 0);
  const saidasMes = expenseRows
    .filter((e) => mesDe(e.expense_date) === mesAtual)
    .reduce((s, e) => s + Number(e.amount), 0);
  const entradasAntes =
    pagos
      .filter((p) => mesDe(p.paid_at ?? p.reference_month) < mesAtual)
      .reduce((s, p) => s + Number(p.amount), 0) +
    revenueRows
      .filter((r) => mesDe(r.revenue_date) < mesAtual)
      .reduce((s, r) => s + Number(r.amount), 0);
  const saidasAntes = expenseRows
    .filter((e) => mesDe(e.expense_date) < mesAtual)
    .reduce((s, e) => s + Number(e.amount), 0);
  const saldoInicial = entradasAntes - saidasAntes;
  const saldoFinal = saldoInicial + entradasMes - saidasMes;

  const byMonth: Record<string, any[]> = {};
  for (const p of rows) {
    (byMonth[p.reference_month] ??= []).push(p);
  }
  const months = Object.keys(byMonth).sort().reverse();

  return (
    <div className="space-y-5">
      {/* O que eu devo, com o Pix pronto. Vem antes de tudo: e o que a pessoa
          abriu a tela para resolver. */}
      {minhasAbertas.length > 0 && settings?.pix_key && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            💸 Você tem {minhasAbertas.length} cobrança(s) em aberto
          </p>
          {minhasAbertas.map((p: any) => (
            <PixQR
              key={p.id}
              chave={p.pix_key || settings.pix_key}
              tipo={p.pix_key ? null : settings.pix_key_type ?? null}
              nome={group.name}
              cidade={settings.pix_city ?? null}
              valor={Number(p.amount)}
              descricao={
                p.kind === "churrasco"
                  ? "Churrasco"
                  : p.kind === "convidado"
                  ? "Convidado"
                  : monthLabel(p.reference_month)
              }
              titulo={
                p.kind === "churrasco"
                  ? "🍖 Churrasco — pagar com Pix"
                  : p.kind === "convidado"
                  ? "🙋 Quadra do convidado — pagar com Pix"
                  : `Mensalidade ${monthLabel(p.reference_month)}`
              }
            />
          ))}
          <p className="text-xs text-slate-400">
            Depois de pagar, o administrador confirma o recebimento e a
            cobrança sai daqui.
          </p>
        </div>
      )}

      {isAdmin && <CobrancaPorLink groupId={id} />}

      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Arrecadado"
          value={brl(received + totalRevenues)}
          valueClassName="text-sm leading-tight tabular-nums sm:text-lg"
        />
        <Stat
          label="Despesas"
          value={brl(totalExpenses)}
          valueClassName="text-sm leading-tight tabular-nums sm:text-lg"
        />
        <Stat
          label="Saldo"
          valueClassName="text-sm leading-tight tabular-nums sm:text-lg"
          value={
            <span className={saldo < 0 ? "text-rose-500" : "text-court-600"}>
              {brl(saldo)}
            </span>
          }
        />
      </div>

      {/* Resumo do mês — o que entrou, o que saiu e como o caixa terminou */}
      <section className="card">
        <h3 className="mb-3 font-bold capitalize text-slate-800">
          📊 Resumo de {monthLabel(mesAtual + "-01")}
        </h3>
        <div className="divide-y divide-slate-100 text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Saldo inicial</span>
            <span className="font-semibold tabular-nums text-slate-700">
              {brl(saldoInicial)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Entradas</span>
            <span className="font-semibold tabular-nums text-court-600">
              + {brl(entradasMes)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Saídas</span>
            <span className="font-semibold tabular-nums text-rose-500">
              − {brl(saidasMes)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="font-bold text-slate-800">Saldo final</span>
            <span
              className={`text-lg font-black tabular-nums ${
                saldoFinal < 0 ? "text-rose-500" : "text-court-600"
              }`}
            >
              {brl(saldoFinal)}
            </span>
          </div>
        </div>
      </section>

      {isAdmin && (
        <>
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
              📄 Relatório financeiro
            </a>
          </div>
        </>
      )}

      <section>
        <h3 className="mb-2 font-bold text-slate-800">💰 Receitas</h3>
        {isAdmin && <RevenueForm groupId={id} />}
        {revenueRows.length ? (
          <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-card">
            {revenueRows.map((r) => (
              <RevenueRow
                key={r.id}
                groupId={id}
                revenue={r}
                canManage={isAdmin}
              />
            ))}
          </div>
        ) : (
          <p className="px-1 py-2 text-sm text-slate-400">
            Nenhuma receita lançada à mão. Mensalidades e cobranças entram
            sozinhas.
          </p>
        )}

        <h3 className="!mt-6 mb-2 font-bold text-slate-800">💸 Despesas</h3>
        {isAdmin && <ExpenseForm groupId={id} />}
        {expenseRows.length > 0 ? (
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
        ) : (
          <p className="px-1 text-sm text-slate-400">
            Nenhuma despesa lançada.
          </p>
        )}
      </section>

      {months.length > 0 && (
        <h3 className="!mt-6 px-1 font-bold text-slate-800">🧾 Mensalidades</h3>
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
              : "Ainda não há mensalidades registradas neste grupo."
          }
        />
      )}
    </div>
  );
}
