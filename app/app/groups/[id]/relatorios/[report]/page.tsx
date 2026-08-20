import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ReportView from "@/components/ReportView";
import {
  buildReport,
  inicioDoPeriodo,
  PERIODOS,
  REPORTS,
  REPORTS_COM_PERIODO,
} from "@/lib/reports";
import { shortDate } from "@/lib/format";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

// Relatórios que trabalham em cima de um torneio só.
const POR_TORNEIO = new Set(["resumo-torneio", "jogos", "resultados"]);

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; report: string }>;
  searchParams: Promise<{ t?: string; p?: string }>;
}) {
  const { id, report } = await params;
  const sp = await searchParams;
  const t = typeof sp?.t === "string" ? sp.t : undefined;
  const periodo = PERIODOS.some((x) => x.key === sp?.p) ? sp!.p! : "tudo";

  const { supabase, group, isAdmin } = await getGroupContext(id);
  if (!isAdmin) notFound();

  const meta = REPORTS.find((r) => r.key === report);
  if (!meta) notFound();

  // Escolha do torneio: mostra só data e nome, e o relatório sai só do escolhido.
  if (POR_TORNEIO.has(report) && !t) {
    const { data: tours } = await supabase
      .from("tournaments")
      .select("id, name, date")
      .eq("group_id", id)
      .order("date", { ascending: false });

    return (
      <div>
        <PageHeader
          title={meta.label}
          subtitle="Escolha o torneio"
          back={`/app/groups/${id}/relatorios`}
        />
        <div className="grid gap-2">
          {(tours ?? []).map((tt: any) => (
            <Link
              key={tt.id}
              href={`/app/groups/${id}/relatorios/${report}?t=${tt.id}`}
              className="card flex items-center justify-between gap-3 !p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">
                  {tt.name}
                </p>
                <p className="text-xs text-slate-400">{shortDate(tt.date)}</p>
              </div>
              <span className="shrink-0 text-slate-300">›</span>
            </Link>
          ))}
          {(!tours || tours.length === 0) && (
            <p className="text-sm text-slate-400">Nenhum torneio ainda.</p>
          )}
        </div>
      </div>
    );
  }

  const temPeriodo = REPORTS_COM_PERIODO.has(report);
  const doc = await buildReport(supabase, id, report, {
    tournamentId: t,
    desde: temPeriodo ? inicioDoPeriodo(periodo) : null,
  });
  if (!doc) notFound();

  const voltar = POR_TORNEIO.has(report)
    ? `/app/groups/${id}/relatorios/${report}`
    : `/app/groups/${id}/relatorios`;

  return (
    <div>
      <PageHeader title={doc.title} subtitle={doc.subtitle} back={voltar} />

      {temPeriodo && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PERIODOS.map((x) => (
            <Link
              key={x.key}
              href={`/app/groups/${id}/relatorios/${report}?p=${x.key}`}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                periodo === x.key
                  ? "bg-ocean-900 text-white"
                  : "bg-white text-slate-500 ring-1 ring-slate-200"
              }`}
            >
              {x.label}
            </Link>
          ))}
        </div>
      )}

      <ReportView
        title={doc.title}
        subtitle={doc.subtitle}
        sections={doc.sections}
        groupName={group.name}
      />
    </div>
  );
}
