import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { brl, monthLabel } from "@/lib/format";
import ListaPagamentoPublica from "@/components/ListaPagamentoPublica";

export const dynamic = "force-dynamic";

async function buscar(code: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_payments_month", {
    p_code: code,
  });
  return data as any;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const info = await buscar(code);
  if (!info || info.error) return { title: "Mensalidades — Ligaset" };

  const gente = (info.gente ?? []) as any[];
  const pagos = gente.filter((g) => g.pago).length;
  const faltam = gente.length - pagos;
  const aReceber = gente
    .filter((g) => !g.pago)
    .reduce((s, g) => s + Number(g.valor), 0);

  const titulo = `Mensalidades — ${monthLabel(info.mes)}`;
  const descricao = `✅ ${pagos} em dia · ⏳ ${faltam} a pagar (${brl(
    aReceber
  )})`;

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

export default async function MensalidadesPage({
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
          {info?.error ?? "Não consegui abrir esta página."}
        </p>
      </Moldura>
    );
  }

  const venc = info.vencimento
    ? (() => {
        const [a, m, d] = String(info.vencimento).slice(0, 10).split("-");
        return `${d}/${m}/${a}`;
      })()
    : null;

  return (
    <Moldura
      titulo={`Mensalidades — ${monthLabel(info.mes)}`}
      subtitulo={[info.grupo, venc ? `Vencimento: ${venc}` : null]
        .filter(Boolean)
        .join(" • ")}
    >
      <ListaPagamentoPublica
        gente={info.gente ?? []}
        grupo={info.grupo}
        mes={monthLabel(info.mes)}
        pix={info.pix}
        pixTipo={info.pix_tipo ?? null}
        pixCidade={info.pix_cidade ?? null}
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
