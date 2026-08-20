import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { EmptyState, PneuIcon } from "@/components/ui";
import PneuForm, { PneuRow } from "@/components/PneuForm";
import PneuRanking from "@/components/PneuRanking";
import PneuSeason, { SeasonRow } from "@/components/PneuSeason";
import PneuEditors from "@/components/PneuEditors";

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
        icon={<PneuIcon className="mx-auto h-10 w-10 text-slate-300" />}
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

  const { data: podeLancar } = await supabase.rpc("can_manage_pneu", {
    gid: id,
  });
  const canManage = !!podeLancar;

  const desde = inicioDoPeriodo(periodo);

  let query = supabase
    .from("pneus")
    .select(
      "id, qty, occurred_on, note, auto, member_id, member:group_members(name)"
    )
    .eq("group_id", id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (desde) query = query.gte("occurred_on", desde);

  const { data } = await query;
  const pneus = ((data ?? []) as any[]).map((r) => ({
    ...r,
    member: Array.isArray(r.member) ? r.member[0] ?? null : r.member,
  }));

  // Ranking: soma por atleta, mais pneus primeiro. Guarda os lançamentos de
  // cada um para abrir as datas ao tocar no pneu.
  const porAtleta = new Map<
    string,
    { memberId: string; nome: string; total: number; lancamentos: any[] }
  >();
  for (const r of pneus) {
    const atual = porAtleta.get(r.member_id) ?? {
      memberId: r.member_id,
      nome: r.member?.name ?? "Atleta",
      total: 0,
      lancamentos: [] as any[],
    };
    atual.total += r.qty;
    atual.lancamentos.push({
      id: r.id,
      qty: r.qty,
      occurred_on: r.occurred_on,
      note: r.note,
    });
    porAtleta.set(r.member_id, atual);
  }
  const ranking = [...porAtleta.values()]
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));

  const totalPneus = ranking.reduce((s, x) => s + x.total, 0);

  const { data: seasonRows } = await supabase
    .from("pneu_seasons")
    .select("id, label, total, closed_on, member:group_members(name)")
    .eq("group_id", id)
    .order("closed_on", { ascending: false });
  const seasons = ((seasonRows ?? []) as any[]).map((s) => ({
    ...s,
    member: Array.isArray(s.member) ? s.member[0] ?? null : s.member,
  }));

  const { data: members } = canManage
    ? await supabase
        .from("group_members")
        .select("id, name, can_manage_pneu")
        .eq("group_id", id)
        .eq("status", "active")
        .order("name", { ascending: true })
    : { data: [] as any[] };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">
          <PneuIcon className="inline h-6 w-6 align-[-3px]" /> Ranking do pneu
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

      {canManage && <PneuForm groupId={id} members={members ?? []} />}
      {isAdmin && <PneuEditors groupId={id} members={members ?? []} />}

      {ranking.length ? (
        <PneuRanking linhas={ranking} />
      ) : (
        <EmptyState
          icon={<PneuIcon className="mx-auto h-10 w-10 text-slate-300" />}
          title="Nenhum pneu no período"
          desc="Ninguém perdeu de zero — ou ainda não foi lançado."
        />
      )}

      {(seasons.length > 0 || canManage) && (
        <section>
          <h2 className="mb-2 font-bold text-slate-800">
            🏆 Campeões da temporada
          </h2>
          {seasons.length > 0 && (
            <div className="card mb-2 divide-y divide-slate-50 !p-0">
              {seasons.map((s) => (
                <SeasonRow
                  key={s.id}
                  groupId={id}
                  season={s}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
          {canManage && <PneuSeason groupId={id} />}
        </section>
      )}

      {pneus.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-slate-800">Lançamentos</h2>
          <div className="card divide-y divide-slate-50 !p-0">
            {pneus.map((r) => (
              <PneuRow key={r.id} groupId={id} pneu={r} canManage={canManage} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
