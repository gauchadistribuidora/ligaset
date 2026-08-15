import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { EmptyState } from "@/components/ui";
import PneuForm, { PneuRow } from "@/components/PneuForm";

export const dynamic = "force-dynamic";

const PERIODOS: { key: string; label: string }[] = [
  { key: "mes", label: "Mês" },
  { key: "trimestre", label: "Trimestre" },
  { key: "ano", label: "Ano" },
  { key: "tudo", label: "Tudo" },
];

// Início do período de validade do ranking. "Tudo" não corta nada.
function inicioDoPeriodo(p: string): string | null {
  const hoje = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "mes") return iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  if (p === "trimestre")
    return iso(new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1));
  if (p === "tudo") return null;
  return iso(new Date(hoje.getFullYear(), 0, 1)); // ano
}

export default async function PneusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const periodo = PERIODOS.some((x) => x.key === p) ? (p as string) : "ano";

  const { supabase, isAdmin, settings } = await getGroupContext(id);

  if (!settings?.pneu_enabled) {
    return (
      <EmptyState
        icon="🛞"
        title="Ranking do pneu desligado"
        desc={
          isAdmin
            ? "Ligue o ranking do pneu nas configurações do grupo para começar a lançar."
            : "Este grupo não usa o ranking do pneu."
        }
        action={
          isAdmin ? (
            <Link href={`/app/groups/${id}/settings`} className="btn-primary">
              Abrir configurações
            </Link>
          ) : undefined
        }
      />
    );
  }

  const desde = inicioDoPeriodo(periodo);

  let query = supabase
    .from("pneus")
    .select("id, qty, occurred_on, note, member_id, member:group_members(name)")
    .eq("group_id", id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (desde) query = query.gte("occurred_on", desde);

  const { data } = await query;
  const pneus = ((data ?? []) as any[]).map((r) => ({
    ...r,
    member: Array.isArray(r.member) ? r.member[0] ?? null : r.member,
  }));

  // Ranking: soma por atleta, mais pneus primeiro.
  const porAtleta = new Map<string, { nome: string; total: number }>();
  for (const r of pneus) {
    const nome = r.member?.name ?? "Atleta";
    const atual = porAtleta.get(r.member_id) ?? { nome, total: 0 };
    atual.total += r.qty;
    porAtleta.set(r.member_id, atual);
  }
  const ranking = [...porAtleta.values()]
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));

  const totalPneus = ranking.reduce((s, x) => s + x.total, 0);

  const { data: members } = isAdmin
    ? await supabase
        .from("group_members")
        .select("id, name")
        .eq("group_id", id)
        .eq("status", "active")
        .order("name", { ascending: true })
    : { data: [] as any[] };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">
          🛞 Ranking do pneu
        </h1>
        <p className="text-sm text-slate-500">
          Perdeu de zero, levou pneu. {totalPneus} no período.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {PERIODOS.map((x) => (
          <Link
            key={x.key}
            href={`/app/groups/${id}/pneus?p=${x.key}`}
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

      {isAdmin && <PneuForm groupId={id} members={members ?? []} />}

      {ranking.length ? (
        <div className="card !p-0">
          {ranking.map((r, i) => (
            <div
              key={r.nome + i}
              className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0"
            >
              <span className="w-6 shrink-0 text-center text-sm font-black text-slate-400">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 truncate font-semibold text-slate-800">
                {r.nome}
              </p>
              <span className="shrink-0 text-lg" title={`${r.total} pneu(s)`}>
                {"🛞".repeat(Math.min(r.total, 5))}
                {r.total > 5 ? ` ${r.total}` : ""}
              </span>
              <span className="w-8 shrink-0 text-right font-black text-slate-900">
                {r.total}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🛞"
          title="Nenhum pneu no período"
          desc="Ninguém perdeu de zero — ou ainda não foi lançado."
        />
      )}

      {pneus.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-slate-800">Lançamentos</h2>
          <div className="card divide-y divide-slate-50 !p-0">
            {pneus.map((r) => (
              <PneuRow key={r.id} groupId={id} pneu={r} canManage={isAdmin} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
