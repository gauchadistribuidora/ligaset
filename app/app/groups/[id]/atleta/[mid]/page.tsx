import { notFound } from "next/navigation";
import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import { brl, monthLabel, shortDate } from "@/lib/format";
import { PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

// Tudo do atleta numa tela só: presença, resultados, pneus, parcerias e
// financeiro. Os dados já existiam espalhados por quatro telas.
export default async function AtletaPage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const { id, mid } = await params;
  const { supabase, isAdmin } = await getGroupContext(id);

  const { data: membro } = await supabase
    .from("group_members")
    .select("id, name, role, is_guest, user_id, invited_by")
    .eq("group_id", id)
    .eq("id", mid)
    .maybeSingle();
  if (!membro) notFound();

  // Cada um vê o próprio perfil; o administrador vê o de todos. O financeiro
  // de outra pessoa não é assunto de terceiro.
  const { data: meuVinculo } = await supabase.auth.getUser();
  const { data: euMembro } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", id)
    .eq("user_id", meuVinculo.user?.id ?? "")
    .maybeSingle();

  const souEu = euMembro?.id === mid;
  const podeVerFinanceiro = isAdmin || souEu;

  const [
    { data: tours },
    { data: respostas },
    { data: pneus },
    { data: times },
    { data: cobrancas },
  ] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, name, date, confirmations_open")
      .eq("group_id", id),
    supabase
      .from("attendance")
      .select("tournament_id, status, churrasco")
      .eq("group_id", id)
      .eq("member_id", mid),
    supabase
      .from("pneus")
      .select("qty, occurred_on, note")
      .eq("group_id", id)
      .eq("member_id", mid)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("teams")
      .select("tournament_id, player1_id, player2_id")
      .or(`player1_id.eq.${mid},player2_id.eq.${mid}`),
    podeVerFinanceiro
      ? supabase
          .from("payments")
          .select("amount, status, reference_month, kind, paid_at")
          .eq("group_id", id)
          .eq("member_id", mid)
          .order("reference_month", { ascending: false })
      : { data: [] as any[] },
  ]);

  const idsDoGrupo = new Set((tours ?? []).map((t: any) => t.id));

  // ---- presença ----
  const comLista = (tours ?? []).filter((t: any) => t.confirmations_open).length;
  const foi = (respostas ?? []).filter((a) => a.status === "yes").length;
  const naoFoi = (respostas ?? []).filter((a) => a.status === "no").length;
  const churrascos = (respostas ?? []).filter((a) => a.churrasco).length;

  // ---- parcerias ----
  const parceiros: Record<string, number> = {};
  for (const t of times ?? []) {
    if (!idsDoGrupo.has(t.tournament_id)) continue;
    const outro = t.player1_id === mid ? t.player2_id : t.player1_id;
    if (outro) parceiros[outro] = (parceiros[outro] ?? 0) + 1;
  }
  const idsParceiros = Object.keys(parceiros);
  const { data: nomesParceiros } = idsParceiros.length
    ? await supabase
        .from("group_members")
        .select("id, name")
        .in("id", idsParceiros)
    : { data: [] as any[] };
  const nomeDe: Record<string, string> = {};
  for (const p of nomesParceiros ?? []) nomeDe[p.id] = p.name || "Atleta";
  const duplasFavoritas = Object.entries(parceiros)
    .map(([pid, n]) => ({ nome: nomeDe[pid] ?? "Atleta", vezes: n }))
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, 5);

  // ---- pneus ----
  const totalPneus = (pneus ?? []).reduce((s, p) => s + Number(p.qty), 0);

  // ---- financeiro ----
  const abertas = (cobrancas ?? []).filter(
    (p: any) => p.status === "pending" || p.status === "overdue"
  );
  const emAberto = abertas.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const jaPagou = (cobrancas ?? [])
    .filter((p: any) => p.status === "paid")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={membro.name || "Atleta"}
        subtitle={
          membro.is_guest
            ? "Convidado"
            : membro.role === "owner"
            ? "Dono do grupo"
            : membro.role === "admin"
            ? "Administrador"
            : "Jogador"
        }
        back={`/app/groups/${id}/members`}
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Jogos que foi" value={String(foi)} />
        <Stat
          label="Presença"
          value={comLista ? `${Math.round((100 * foi) / comLista)}%` : "—"}
        />
        <Stat label="Pneus" value={String(totalPneus)} />
      </div>

      <section className="card">
        <p className="mb-2 font-bold text-slate-800">✋ Presença</p>
        <Linha rotulo="Confirmou" valor={`${foi} jogo(s)`} />
        <Linha rotulo="Disse que não ia" valor={`${naoFoi} jogo(s)`} />
        <Linha
          rotulo="Não respondeu"
          valor={`${Math.max(0, comLista - foi - naoFoi)} jogo(s)`}
        />
        <Linha rotulo="Ficou para o churrasco" valor={`${churrascos} vez(es)`} />
      </section>

      {duplasFavoritas.length > 0 && (
        <section className="card">
          <p className="mb-2 font-bold text-slate-800">🤝 Com quem mais joga</p>
          <div className="divide-y divide-slate-50">
            {duplasFavoritas.map((d) => (
              <div
                key={d.nome}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-slate-700">{d.nome}</span>
                <span className="font-semibold text-slate-500">
                  {d.vezes}x
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {totalPneus > 0 && (
        <section className="card">
          <p className="mb-2 font-bold text-slate-800">🛞 Pneus</p>
          <div className="divide-y divide-slate-50">
            {(pneus ?? []).slice(0, 8).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-600">
                  {shortDate(p.occurred_on)}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="font-semibold text-slate-500">
                  {p.qty > 0 ? `+${p.qty}` : p.qty}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {podeVerFinanceiro && (
        <section className="card">
          <p className="mb-2 font-bold text-slate-800">💳 Financeiro</p>
          <Linha
            rotulo="Em aberto"
            valor={emAberto > 0 ? brl(emAberto) : "nada devendo"}
            destaque={emAberto > 0}
          />
          <Linha rotulo="Já pagou" valor={brl(jaPagou)} />
          {abertas.length > 0 && (
            <div className="mt-2 divide-y divide-slate-50">
              {abertas.map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-slate-600">
                    {p.kind === "churrasco"
                      ? "Churrasco"
                      : p.kind === "convidado"
                      ? "Quadra de convidado"
                      : monthLabel(p.reference_month)}
                  </span>
                  <span
                    className={`font-semibold ${
                      p.status === "overdue" ? "text-rose-500" : "text-amber-600"
                    }`}
                  >
                    {brl(Number(p.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            href={`/app/groups/${id}/payments`}
            className="btn-ghost mt-3 block w-full !py-2 text-center text-sm"
          >
            Ver no financeiro
          </Link>
        </section>
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-50 py-2 text-sm first:border-0">
      <span className="text-slate-500">{rotulo}</span>
      <span
        className={
          destaque ? "font-bold text-rose-500" : "font-semibold text-slate-700"
        }
      >
        {valor}
      </span>
    </div>
  );
}
