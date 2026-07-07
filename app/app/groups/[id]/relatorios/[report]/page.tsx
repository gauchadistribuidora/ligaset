import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ReportView from "@/components/ReportView";
import { buildReport, REPORTS } from "@/lib/reports";
import { shortDate } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; report: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id, report } = await params;
  const sp = await searchParams;
  const t = typeof sp?.t === "string" ? sp.t : undefined;

  const { supabase, group, isAdmin } = await getGroupContext(id);
  if (!isAdmin) notFound();

  const meta = REPORTS.find((r) => r.key === report);
  if (!meta) notFound();

  // Resumo do torneio precisa escolher um torneio
  if (report === "resumo-torneio" && !t) {
    const { data: tours } = await supabase
      .from("tournaments")
      .select("id, name, date")
      .eq("group_id", id)
      .order("date", { ascending: false });
    return (
      <div>
        <PageHeader title="Resumo do torneio" back={`/app/groups/${id}/relatorios`} />
        <p className="mb-3 text-sm text-slate-500">Escolha o torneio:</p>
        <div className="grid gap-2">
          {(tours ?? []).map((tt: any) => (
            <Link
              key={tt.id}
              href={`/app/groups/${id}/relatorios/resumo-torneio?t=${tt.id}`}
              className="card flex items-center justify-between"
            >
              <span className="font-semibold text-slate-800">{tt.name}</span>
              <span className="text-xs text-slate-400">{shortDate(tt.date)}</span>
            </Link>
          ))}
          {(!tours || tours.length === 0) && (
            <p className="text-sm text-slate-400">Nenhum torneio ainda.</p>
          )}
        </div>
      </div>
    );
  }

  const doc = await buildReport(supabase, id, report, { tournamentId: t });
  if (!doc) notFound();

  return (
    <div>
      <PageHeader
        title={doc.title}
        subtitle={doc.subtitle}
        back={`/app/groups/${id}/relatorios`}
      />
      <ReportView
        title={doc.title}
        subtitle={doc.subtitle}
        sections={doc.sections}
        groupName={group.name}
      />
    </div>
  );
}
