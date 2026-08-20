import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PublicAttendance from "@/components/PublicAttendance";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

async function buscar(code: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_attendance_list", {
    p_code: code,
  });
  return data as any;
}

// A prévia que aparece no WhatsApp. Sem isso o link chega como um endereço
// pelado e o pessoal desconfia que é golpe.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const payload = await buscar(code);
  const t = payload?.tournament;

  if (!t) {
    return { title: "Lista de presença — Ligaset" };
  }

  const titulo = `${t.name} — confirme sua presença`;
  const descricao = [t.group, t.date ? shortDate(t.date) : null]
    .filter(Boolean)
    .join(" • ");

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

// Lista de presença aberta: confirma sem login, sem instalar o app.
export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const payload = await buscar(code);

  if (!payload || payload.error) {
    return (
      <Moldura titulo="Ops">
        <p className="text-sm text-slate-500">
          {payload?.error ?? "Não consegui abrir esta lista."}
        </p>
      </Moldura>
    );
  }

  const t = payload.tournament;

  return (
    <Moldura titulo={t.name} subtitulo={`${t.group} • ${shortDate(t.date)}`}>
      <PublicAttendance
        code={code}
        membros={payload.members ?? []}
        capacity={payload.capacity ?? null}
      />
    </Moldura>
  );
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
            <p className="mb-4 text-center text-sm text-slate-500">{subtitulo}</p>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}
