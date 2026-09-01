import { notFound } from "next/navigation";
import { getGroupContext } from "@/lib/data";
import { shortDate } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import PdfButton from "@/components/PdfButton";
import ResumoJogoWhatsApp from "@/components/ResumoJogoWhatsApp";

export const dynamic = "force-dynamic";

type Pessoa = { id: string; nome: string; convidado: boolean };

export default async function RelatorioTorneioPage({
  params,
}: {
  params: Promise<{ id: string; tid: string }>;
}) {
  const { id, tid } = await params;
  const { supabase, group } = await getGroupContext(id);

  const { data: t } = await supabase
    .from("tournaments")
    .select("name, date, location, capacity, has_churrasco")
    .eq("id", tid)
    .eq("group_id", id)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: membros }, { data: respostas }] = await Promise.all([
    supabase
      .from("group_members")
      .select("id, name, is_guest")
      .eq("group_id", id)
      .eq("status", "active"),
    supabase
      .from("attendance")
      .select("member_id, status, churrasco, partner_member_id, updated_at")
      .eq("tournament_id", tid),
  ]);

  const nomes: Record<string, Pessoa> = {};
  for (const m of membros ?? []) {
    nomes[m.id] = {
      id: m.id,
      nome: m.name || "Sem nome",
      convidado: !!m.is_guest,
    };
  }

  const resp = new Map<string, any>();
  for (const a of respostas ?? []) resp.set(a.member_id, a);

  const porNome = (a: Pessoa, b: Pessoa) =>
    a.nome.localeCompare(b.nome, "pt-BR");

  // Cada dupla aparece nas duas pessoas; a chave ordenada junta as duas linhas.
  const vistas = new Set<string>();
  const duplas: { a: Pessoa; b: Pessoa }[] = [];
  for (const [memberId, a] of resp) {
    if (a.status !== "yes" || !a.partner_member_id) continue;
    const chave = [memberId, a.partner_member_id].sort().join("|");
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    const p1 = nomes[memberId];
    const p2 = nomes[a.partner_member_id];
    if (p1 && p2) duplas.push({ a: p1, b: p2 });
  }
  duplas.sort((x, y) => x.a.nome.localeCompare(y.a.nome, "pt-BR"));

  const todos = Object.values(nomes);
  const semDupla = todos
    .filter((p) => resp.get(p.id)?.status === "yes" && !resp.get(p.id)?.partner_member_id)
    .sort(porNome);
  const noChurrasco = todos.filter((p) => resp.get(p.id)?.churrasco).sort(porNome);
  const faltaConfirmar = todos.filter((p) => !resp.get(p.id)?.status).sort(porNome);
  const ausentes = todos
    .filter((p) => resp.get(p.id)?.status === "no")
    .sort(porNome);

  const confirmados = duplas.length * 2 + semDupla.length;

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          title="Relatório do jogo"
          subtitle={`${t.name} • ${shortDate(t.date)}`}
          back={`/app/groups/${id}/tournaments/${tid}`}
        />
      </div>

      <div className="print-area space-y-5">
        <div className="card">
          <p className="text-lg font-extrabold text-slate-900">{t.name}</p>
          <p className="text-sm text-slate-500">
            {group.name} • {shortDate(t.date)}
            {t.location ? ` • ${t.location}` : ""}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            <strong>{confirmados}</strong> confirmado(s)
            {t.capacity ? ` de ${t.capacity} vagas` : ""} ·{" "}
            <strong>{duplas.length}</strong> dupla(s)
            {t.has_churrasco ? (
              <>
                {" "}
                · <strong>{noChurrasco.length}</strong> no churrasco
              </>
            ) : null}
          </p>
        </div>

        <Bloco titulo={`🤝 Duplas confirmadas (${duplas.length})`}>
          {duplas.length ? (
            <ol className="space-y-1">
              {duplas.map((d, i) => (
                <li key={i} className="text-sm text-slate-700">
                  <span className="mr-2 text-slate-400">{i + 1}.</span>
                  {d.a.nome}
                  {d.a.convidado ? " (convidado)" : ""} e {d.b.nome}
                  {d.b.convidado ? " (convidado)" : ""}
                </li>
              ))}
            </ol>
          ) : (
            <Vazio>Nenhuma dupla formada ainda.</Vazio>
          )}
        </Bloco>

        <Bloco titulo={`✅ Confirmados sem dupla (${semDupla.length})`}>
          <Lista gente={semDupla} vazio="Todo mundo que confirmou já tem dupla." />
        </Bloco>

        {t.has_churrasco && (
          <Bloco titulo={`🍖 Ficam para o churrasco (${noChurrasco.length})`}>
            <Lista gente={noChurrasco} vazio="Ninguém marcou o churrasco ainda." />
          </Bloco>
        )}

        <Bloco titulo={`⏳ Falta confirmar (${faltaConfirmar.length})`}>
          <Lista gente={faltaConfirmar} vazio="Todo mundo já respondeu." />
        </Bloco>

        <Bloco titulo={`❌ Não vão jogar (${ausentes.length})`}>
          <Lista gente={ausentes} vazio="Ninguém disse que não vai." />
        </Bloco>

        <div className="card bg-amber-50">
          <p className="text-sm font-semibold text-slate-700">Observação</p>
          <p className="mt-1 text-sm text-slate-600">
            Favor confirmar presença no jogo e marcar o ícone da carne 🍖 se vai
            ficar para o churrasco.
          </p>
        </div>
      </div>

      <div className="no-print space-y-2">
        <ResumoJogoWhatsApp
          jogo={{
            nome: t.name,
            data: t.date ? shortDate(t.date) : null,
            local: t.location ?? null,
            temChurrasco: !!t.has_churrasco,
          }}
          duplas={duplas.map((d) => `${d.a.nome} e ${d.b.nome}`)}
          semDupla={semDupla.map((p) => p.nome)}
          churrasco={noChurrasco.map((p) => p.nome)}
          faltaConfirmar={faltaConfirmar.map((p) => p.nome)}
          ausentes={ausentes.map((p) => p.nome)}
        />
        <PdfButton
          dados={{
            titulo: `${t.name} — resumo das confirmações`,
            subtitulo: [group.name, t.date ? shortDate(t.date) : null, t.location]
              .filter(Boolean)
              .join(" • "),
            arquivo: `jogo-${t.name}`,
            secoes: [
              {
                titulo: `Duplas confirmadas (${duplas.length})`,
                colunas: ["#", "Dupla"],
                linhas: duplas.map((d, i) => [
                  i + 1,
                  `${d.a.nome}${d.a.convidado ? " (convidado)" : ""} e ${
                    d.b.nome
                  }${d.b.convidado ? " (convidado)" : ""}`,
                ]),
              },
              {
                titulo: `Confirmados sem dupla (${semDupla.length})`,
                texto: semDupla.length
                  ? [semDupla.map((p) => p.nome).join(", ")]
                  : ["Todo mundo que confirmou já tem dupla."],
              },
              ...(t.has_churrasco
                ? [
                    {
                      titulo: `Ficam para o churrasco (${noChurrasco.length})`,
                      texto: noChurrasco.length
                        ? [noChurrasco.map((p) => p.nome).join(", ")]
                        : ["Ninguém marcou o churrasco ainda."],
                    },
                  ]
                : []),
              {
                titulo: `Falta confirmar (${faltaConfirmar.length})`,
                texto: faltaConfirmar.length
                  ? [faltaConfirmar.map((p) => p.nome).join(", ")]
                  : ["Todo mundo já respondeu."],
              },
              {
                titulo: `Não vão jogar (${ausentes.length})`,
                texto: ausentes.length
                  ? [ausentes.map((p) => p.nome).join(", ")]
                  : ["Ninguém disse que não vai."],
              },
              {
                titulo: "Observação",
                texto: [
                  "Favor confirmar presença no jogo e marcar o ícone da carne se vai ficar para o churrasco.",
                ],
              },
            ],
          }}
        />
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <p className="mb-2 font-bold text-slate-800">{titulo}</p>
      {children}
    </section>
  );
}

function Lista({ gente, vazio }: { gente: Pessoa[]; vazio: string }) {
  if (!gente.length) return <Vazio>{vazio}</Vazio>;
  return (
    <ul className="space-y-1">
      {gente.map((p) => (
        <li key={p.id} className="text-sm text-slate-700">
          {p.nome}
          {p.convidado ? (
            <span className="ml-1 text-xs uppercase tracking-wide text-slate-400">
              convidado
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}
