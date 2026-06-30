import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { EmptyState } from "@/components/ui";
import { shortDate } from "@/lib/format";

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-slate-100 text-slate-600" },
  ongoing: { label: "Em andamento", cls: "bg-court-100 text-court-700" },
  finished: { label: "Encerrado", cls: "bg-ocean-900/10 text-ocean-900" },
};

export default async function TournamentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isAdmin } = await getGroupContext(id);

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, date, location, status, category")
    .eq("group_id", id)
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Link
          href={`/app/groups/${id}/tournaments/new`}
          className="btn-primary w-full"
        >
          ＋ Criar torneio
        </Link>
      )}

      {tournaments && tournaments.length ? (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/app/groups/${id}/tournaments/${t.id}`}
              className="card flex items-center justify-between !py-4"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">{t.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {shortDate(t.date)}
                  {t.location ? ` • ${t.location}` : ""}
                  {t.category ? ` • ${t.category}` : ""}
                </p>
              </div>
              <span className={`chip ${STATUS[t.status]?.cls}`}>
                {STATUS[t.status]?.label}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🏆"
          title="Nenhum torneio ainda"
          desc={
            isAdmin
              ? "Crie o primeiro torneio do grupo, sorteie as duplas e comece a jogar."
              : "Os organizadores ainda não criaram torneios."
          }
        />
      )}
    </div>
  );
}
