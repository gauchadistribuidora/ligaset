import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { REPORTS } from "@/lib/reports";
import { notFound } from "next/navigation";

export default async function ReportsIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isAdmin } = await getGroupContext(id);
  if (!isAdmin) notFound();

  return (
    <div>
      <PageHeader title="Relatórios" back={`/app/groups/${id}`} />
      <p className="mb-3 text-sm text-slate-500">
        Cada relatório abre com opção de <strong>Imprimir/PDF</strong> e{" "}
        <strong>baixar em Excel</strong>.
      </p>
      <div className="grid gap-3">
        {REPORTS.map((r) => (
          <Link
            key={r.key}
            href={`/app/groups/${id}/relatorios/${r.key}`}
            className="card flex items-center gap-3"
          >
            <span className="text-2xl">{r.icon}</span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{r.label}</p>
              <p className="text-xs text-slate-500">{r.desc}</p>
            </div>
            <span className="ml-auto text-slate-300">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
