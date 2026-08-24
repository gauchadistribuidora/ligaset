import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PixQR from "@/components/PixQR";
import { brl, primeiraLinha } from "@/lib/format";

export const dynamic = "force-dynamic";

async function buscar(code: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_charge_info", { p_code: code });
  return data as any;
}

// A prévia que aparece no WhatsApp — link de pagamento sem apresentação
// assusta, e com razão.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const info = await buscar(code);
  if (!info || info.error) return { title: "Cobrança — Ligaset" };

  const titulo = info.valor
    ? `${info.grupo} — ${brl(Number(info.valor))}`
    : `${info.grupo} — pagamento`;
  const descricao =
    primeiraLinha(info.descricao) || "Pague com Pix pelo Ligaset";

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

export default async function CobrarPage({
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
          {info?.error ?? "Não consegui abrir esta cobrança."}
        </p>
      </Moldura>
    );
  }

  return (
    <Moldura titulo={info.grupo} subtitulo={info.descricao ?? undefined}>
      <PixQR
        chave={info.pix}
        tipo={info.pix_tipo ?? null}
        nome={info.grupo}
        cidade={info.pix_cidade ?? null}
        valor={info.valor ? Number(info.valor) : null}
        descricao={primeiraLinha(info.descricao) || null}
        titulo="Pagar com Pix"
      />

      <p className="mt-3 text-center text-xs text-slate-400">
        O pagamento vai direto para a chave Pix do grupo. O Ligaset só monta o
        código — não recebe nem intermedeia nada.
      </p>
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
            // whitespace-pre-line: o administrador escreveu em varias linhas e
            // e assim que precisa aparecer.
            <p className="mb-4 whitespace-pre-line text-center text-sm text-slate-600">
              {subtitulo}
            </p>
          )}
          {children}
        </div>
      </div>
    </main>
  );
}
