import { brl, shortDate } from "@/lib/format";

export type FinanceSummary = {
  groupName: string;
  received: number;
  totalExpenses: number;
  saldo: number;
  pendingCount: number;
  overdueCount: number;
  pendingAmount: number;
  expenses: any[];
  // Entradas lancadas na mao (rifa, patrocinio). Somam com as mensalidades.
  totalRevenues: number;
  revenues: any[];
  // De onde veio cada real recebido: mensalidade, convidado, churrasco.
  recebimentos: any[];
  totalMensalidades: number;
};

export async function financeSummary(
  supabase: any,
  groupId: string
): Promise<FinanceSummary> {
  const [
    { data: group },
    { data: payments },
    { data: expenses },
    { data: revenues },
  ] = await Promise.all([
    supabase.from("groups").select("name").eq("id", groupId).single(),
    supabase
      .from("payments")
      .select(
        "amount, status, paid_at, reference_month, kind, member:group_members(name)"
      )
      .eq("group_id", groupId),
    supabase
      .from("expenses")
      .select("description, amount, expense_date, category")
      .eq("group_id", groupId)
      .order("expense_date", { ascending: false }),
    supabase
      .from("revenues")
      .select("description, amount, revenue_date, category")
      .eq("group_id", groupId)
      .order("revenue_date", { ascending: false }),
  ]);

  const pays = payments ?? [];
  const exps = expenses ?? [];
  const received = pays
    .filter((p: any) => p.status === "paid")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const pendingList = pays.filter(
    (p: any) => p.status === "pending" || p.status === "overdue"
  );
  const pendingAmount = pendingList.reduce(
    (s: number, p: any) => s + Number(p.amount),
    0
  );
  const totalExpenses = exps.reduce(
    (s: number, e: any) => s + Number(e.amount),
    0
  );
  // O "arrecadado" somava dois mundos sem dizer qual era qual: cobranca paga e
  // receita lancada a mao. Aqui o primeiro vira lista.
  const umSo = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const recebimentos = pays
    .filter((p: any) => p.status === "paid")
    .map((p: any) => ({ ...p, member: umSo(p.member) }))
    .sort((a: any, b: any) =>
      String(b.paid_at ?? b.reference_month ?? "").localeCompare(
        String(a.paid_at ?? a.reference_month ?? "")
      )
    );

  const revs = revenues ?? [];
  const totalRevenues = revs.reduce(
    (s: number, r: any) => s + Number(r.amount),
    0
  );

  return {
    groupName: group?.name ?? "Grupo",
    received: received + totalRevenues,
    totalExpenses,
    saldo: received + totalRevenues - totalExpenses,
    pendingCount: pays.filter((p: any) => p.status === "pending").length,
    overdueCount: pays.filter((p: any) => p.status === "overdue").length,
    pendingAmount,
    expenses: exps,
    totalRevenues,
    revenues: revs,
    recebimentos,
    totalMensalidades: received,
  };
}

// HTML do relatório para envio por e-mail.
export function financeReportHtml(s: FinanceSummary, generatedAt: string): string {
  const rows = s.expenses
    .map(
      (e: any) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${shortDate(
            e.expense_date
          )}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${
            e.description
          }${e.category ? ` <span style="color:#94a3b8">(${e.category})</span>` : ""}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;color:#e11d48">− ${brl(
            Number(e.amount)
          )}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="background:linear-gradient(135deg,#10b981,#0c1b2a);padding:22px 28px">
        <span style="color:#fff;font-size:20px;font-weight:800">LigaSet</span>
        <div style="color:#e2f5ee;font-size:13px;margin-top:2px">Relatório financeiro — ${s.groupName}</div>
      </td></tr>
      <tr><td style="padding:24px 28px">
        <p style="margin:0 0 16px;color:#64748b;font-size:13px">Gerado em ${generatedAt}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
          <tr>
            <td style="padding:12px;background:#f0fdf4;border-radius:12px;text-align:center">
              <div style="font-size:12px;color:#15803d">Arrecadado</div>
              <div style="font-size:18px;font-weight:800;color:#15803d">${brl(s.received)}</div>
            </td>
            <td style="width:10px"></td>
            <td style="padding:12px;background:#fef2f2;border-radius:12px;text-align:center">
              <div style="font-size:12px;color:#b91c1c">Despesas</div>
              <div style="font-size:18px;font-weight:800;color:#b91c1c">${brl(s.totalExpenses)}</div>
            </td>
            <td style="width:10px"></td>
            <td style="padding:12px;background:${s.saldo < 0 ? "#fef2f2" : "#eff6ff"};border-radius:12px;text-align:center">
              <div style="font-size:12px;color:${s.saldo < 0 ? "#b91c1c" : "#1d4ed8"}">Saldo</div>
              <div style="font-size:18px;font-weight:800;color:${s.saldo < 0 ? "#b91c1c" : "#1d4ed8"}">${brl(s.saldo)}</div>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 12px;color:#475569;font-size:14px">
          Mensalidades pendentes/vencidas: <b>${s.pendingCount + s.overdueCount}</b> (${brl(s.pendingAmount)} a receber).
        </p>
        ${
          s.expenses.length
            ? `<h3 style="margin:18px 0 8px;font-size:15px">Despesas</h3>
               <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse">${rows}</table>`
            : `<p style="color:#94a3b8;font-size:13px">Nenhuma despesa lançada.</p>`
        }
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
        Relatório enviado pela administração do grupo no LigaSet.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
