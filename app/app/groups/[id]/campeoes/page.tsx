import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/ui";
import { shortDate } from "@/lib/format";
import NovoCampeao from "@/components/NovoCampeao";
import ExcluirCampeao from "@/components/ExcluirCampeao";

export const dynamic = "force-dynamic";

export default async function CampeoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isAdmin, group } = await getGroupContext(id);

  const [{ data: campeoes }, { data: atletas }] = await Promise.all([
    supabase
      .from("champions")
      .select(
        "*, p1:group_members!champions_member1_id_fkey(id, name), p2:group_members!champions_member2_id_fkey(id, name)"
      )
      .eq("group_id", id)
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("group_members")
      .select("id, name")
      .eq("group_id", id)
      .eq("status", "active")
      .order("name"),
  ]);

  const um = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const linhas = ((campeoes ?? []) as any[]).map((c) => ({
    ...c,
    p1: um(c.p1),
    p2: um(c.p2),
  }));

  // Agrupa por ano: mural se lê por temporada, não por lista corrida.
  const porAno: Record<string, any[]> = {};
  for (const c of linhas) {
    const ano = c.event_date ? String(c.event_date).slice(0, 4) : "Sem data";
    (porAno[ano] ??= []).push(c);
  }
  const anos = Object.keys(porAno).sort((a, b) => b.localeCompare(a));

  // Quem mais levantou taça, contando cada pessoa da dupla.
  const titulos: Record<string, { nome: string; id: string | null; n: number }> =
    {};
  for (const c of linhas) {
    for (const lado of [
      { m: c.p1, nome: c.nome1 },
      { m: c.p2, nome: c.nome2 },
    ]) {
      const nome = lado.m?.name ?? lado.nome;
      if (!nome) continue;
      const chave = lado.m?.id ?? `nome:${nome.toLowerCase()}`;
      titulos[chave] ??= { nome, id: lado.m?.id ?? null, n: 0 };
      titulos[chave].n += 1;
    }
  }
  const ranking = Object.values(titulos)
    .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        title="🏆 Mural dos campeões"
        subtitle={`${linhas.length} título(s) · ${group.name}`}
        back={`/app/groups/${id}`}
      />

      {isAdmin && <NovoCampeao groupId={id} atletas={atletas ?? []} />}

      {ranking.length > 1 && (
        <section className="card">
          <p className="mb-2 font-bold text-slate-800">
            👑 Quem mais levantou taça
          </p>
          <div className="divide-y divide-slate-50">
            {ranking.map((r, i) => (
              <div
                key={r.id ?? r.nome}
                className="flex items-center gap-3 py-2 text-sm"
              >
                <span className="w-5 shrink-0 text-center text-slate-400">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-700">
                  {r.id ? (
                    <Link
                      href={`/app/groups/${id}/atleta/${r.id}`}
                      className="hover:text-court-600"
                    >
                      {r.nome}
                    </Link>
                  ) : (
                    r.nome
                  )}
                </span>
                <span className="shrink-0 font-bold text-amber-600">
                  {r.n} 🏆
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {linhas.length ? (
        anos.map((ano) => (
          <section key={ano}>
            <p className="mb-2 px-1 text-sm font-bold text-slate-500">{ano}</p>
            <div className="space-y-3">
              {porAno[ano].map((c) => (
                <article key={c.id} className="card">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">🏆</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">{c.titulo}</p>
                      <p className="text-xs text-slate-400">
                        {c.event_date ? shortDate(c.event_date) : "Sem data"}
                        {c.categoria ? ` • ${c.categoria}` : ""}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-court-700">
                        <Nome grupo={id} membro={c.p1} livre={c.nome1} />
                        {(c.p2 || c.nome2) && (
                          <>
                            {" e "}
                            <Nome grupo={id} membro={c.p2} livre={c.nome2} />
                          </>
                        )}
                      </p>

                      {c.observacao && (
                        <p className="mt-1 text-xs text-slate-500">
                          {c.observacao}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <ExcluirCampeao groupId={id} campeaoId={c.id} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      ) : (
        <EmptyState
          icon="🏆"
          title="Mural vazio"
          desc={
            isAdmin
              ? "Cadastre os campeões antigos — dá para escrever o nome de quem nem é do grupo."
              : "Quando o administrador cadastrar os campeões, eles aparecem aqui."
          }
        />
      )}
    </div>
  );
}

function Nome({
  grupo,
  membro,
  livre,
}: {
  grupo: string;
  membro: { id: string; name: string | null } | null;
  livre: string | null;
}) {
  if (membro) {
    return (
      <Link
        href={`/app/groups/${grupo}/atleta/${membro.id}`}
        className="hover:underline"
      >
        {membro.name ?? "Atleta"}
      </Link>
    );
  }
  return <>{livre ?? "—"}</>;
}
