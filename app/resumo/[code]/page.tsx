import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Pessoa = {
  id: string;
  nome: string | null;
  convidado: boolean | null;
  status: "yes" | "no" | null;
  churrasco: boolean;
  dupla: string | null;
};

async function buscar(code: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_tournament_summary", {
    p_code: code,
  });
  return data as any;
}

const porNome = (a: Pessoa, b: Pessoa) =>
  (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");

// Separa a lista nos blocos do resumo. Fica aqui porque a prévia do WhatsApp
// precisa das mesmas contas que a página.
function separar(gente: Pessoa[]) {
  const porId: Record<string, Pessoa> = {};
  for (const p of gente) porId[p.id] = p;

  const vistas = new Set<string>();
  const duplas: [Pessoa, Pessoa][] = [];
  for (const p of gente) {
    if (p.status !== "yes" || !p.dupla) continue;
    const chave = [p.id, p.dupla].sort().join("|");
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    const outro = porId[p.dupla];
    if (outro) duplas.push([p, outro]);
  }
  duplas.sort((x, y) => porNome(x[0], y[0]));

  return {
    duplas,
    semDupla: gente.filter((p) => p.status === "yes" && !p.dupla).sort(porNome),
    churrasco: gente.filter((p) => p.churrasco).sort(porNome),
    faltam: gente.filter((p) => !p.status).sort(porNome),
    fora: gente.filter((p) => p.status === "no").sort(porNome),
  };
}

// A prévia do WhatsApp mostra título e duas linhas. Os números vão aí, que é o
// que o pessoal precisa ver antes de abrir.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const info = await buscar(code);
  if (!info || info.error) return { title: "Resumo do jogo — Ligaset" };

  const s = separar(info.gente ?? []);
  const confirmados = s.duplas.length * 2 + s.semDupla.length;

  const titulo = `${info.jogo}${info.data ? ` — ${shortDate(info.data)}` : ""}`;
  const partes = [
    `✅ ${confirmados} confirmados${info.vagas ? ` de ${info.vagas}` : ""}`,
    `🤝 ${s.duplas.length} duplas`,
    info.tem_churrasco ? `🍖 ${s.churrasco.length} no churrasco` : null,
    `⏳ ${s.faltam.length} sem responder`,
  ].filter(Boolean);

  const descricao = partes.join(" · ");

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      siteName: "Ligaset",
      type: "website",
      images: ["/icon-512.png"],
    },
    twitter: { card: "summary", title: titulo, description: descricao },
  };
}

export default async function ResumoPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const info = await buscar(code);

  if (!info || info.error) {
    return (
      <Moldura titulo="Ops">
        <p className="text-sm text-slate-500">
          {info?.error ?? "Não consegui abrir este resumo."}
        </p>
      </Moldura>
    );
  }

  const s = separar(info.gente ?? []);
  const confirmados = s.duplas.length * 2 + s.semDupla.length;

  return (
    <Moldura
      titulo={info.jogo}
      subtitulo={[
        info.grupo,
        info.data ? shortDate(info.data) : null,
        info.local,
      ]
        .filter(Boolean)
        .join(" • ")}
    >
      <div
        className={`grid gap-2 text-center ${
          info.tem_churrasco ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
        <Numero
          valor={confirmados}
          rotulo={info.vagas ? `de ${info.vagas}` : "confirmados"}
          cor="text-court-700"
          fundo="bg-court-50"
        />
        <Numero
          valor={s.duplas.length}
          rotulo="duplas"
          cor="text-slate-700"
          fundo="bg-slate-50"
        />
        {info.tem_churrasco && (
          <Numero
            valor={s.churrasco.length}
            rotulo="churrasco"
            cor="text-amber-700"
            fundo="bg-amber-50"
          />
        )}
        <Numero
          valor={s.faltam.length}
          rotulo="sem responder"
          cor="text-slate-400"
          fundo="bg-slate-50"
        />
      </div>

      <Bloco titulo={`🤝 Duplas (${s.duplas.length})`}>
        {s.duplas.length ? (
          <ol className="space-y-1">
            {s.duplas.map(([a, b], i) => (
              <li key={i} className="text-sm text-slate-700">
                <span className="mr-2 text-slate-400">{i + 1}.</span>
                {a.nome} e {b.nome}
              </li>
            ))}
          </ol>
        ) : (
          <Vazio>Nenhuma dupla formada ainda.</Vazio>
        )}
      </Bloco>

      <Bloco titulo={`✅ Confirmados sem dupla (${s.semDupla.length})`}>
        <Nomes gente={s.semDupla} vazio="Todo mundo já tem dupla." />
      </Bloco>

      {info.tem_churrasco && (
        <Bloco titulo={`🍖 Ficam para o churrasco (${s.churrasco.length})`}>
          <Nomes gente={s.churrasco} vazio="Ninguém marcou ainda." />
        </Bloco>
      )}

      <Bloco titulo={`⏳ Falta responder (${s.faltam.length})`}>
        <Nomes gente={s.faltam} vazio="Todo mundo já respondeu." />
      </Bloco>

      <Bloco titulo={`❌ Não vão jogar (${s.fora.length})`}>
        <Nomes gente={s.fora} vazio="Ninguém disse que não vai." />
      </Bloco>

      <div className="mt-4 rounded-xl bg-amber-50 p-3">
        <p className="text-sm text-slate-700">
          Favor confirmar presença no jogo e marcar o ícone da carne 🍖 se vai
          ficar para o churrasco.
        </p>
      </div>

      <Link href={`/jogo/${code}`} className="btn-primary mt-4 block w-full text-center">
        Confirmar minha presença
      </Link>
    </Moldura>
  );
}

function Numero({
  valor,
  rotulo,
  cor,
  fundo,
}: {
  valor: number;
  rotulo: string;
  cor: string;
  fundo: string;
}) {
  return (
    <div className={`rounded-xl p-2 ${fundo}`}>
      <p className={`text-xl font-black ${cor}`}>{valor}</p>
      <p className="text-[11px] font-semibold leading-tight text-slate-500">
        {rotulo}
      </p>
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
    <section className="mt-4">
      <p className="mb-1 text-sm font-bold text-slate-800">{titulo}</p>
      {children}
    </section>
  );
}

function Nomes({ gente, vazio }: { gente: Pessoa[]; vazio: string }) {
  if (!gente.length) return <Vazio>{vazio}</Vazio>;
  return (
    <p className="text-sm leading-relaxed text-slate-600">
      {gente
        .map((p) => `${p.nome}${p.convidado ? " (convidado)" : ""}`)
        .join(", ")}
    </p>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

function Moldura({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-court-gradient px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <p className="mb-3 text-center text-sm font-black uppercase tracking-widest text-court-400">
          Ligaset
        </p>
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h1 className="text-center text-xl font-extrabold text-slate-900">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="mb-4 text-center text-sm text-slate-500">
              {subtitulo}
            </p>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}
