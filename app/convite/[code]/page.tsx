import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { brl, shortDate } from "@/lib/format";
import ConviteConfirm from "@/components/ConviteConfirm";
import PixQR from "@/components/PixQR";

export const dynamic = "force-dynamic";

// A prévia que aparece no WhatsApp — um link pelado parece golpe.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_invite_info", { p_code: code });
  const info = data as any;

  if (!info || info.error) return { title: "Convite — Ligaset" };

  const titulo = `${info.torneio || info.grupo} — você foi convidado`;
  const descricao = [info.grupo, info.local].filter(Boolean).join(" • ");

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

// Convite de amigo. Aberto: o convidado ainda não tem conta.
export default async function ConvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("public_invite_info", {
    p_code: code,
  });
  const info = data as any;

  if (error || !info || info.error) {
    return (
      <Moldura titulo="Convite não encontrado">
        <p className="text-sm text-slate-500">
          {info?.error ?? "Este link não vale mais. Peça outro para quem te chamou."}
        </p>
      </Moldura>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Moldura titulo={info.torneio || info.grupo}>
      <p className="text-sm text-slate-600">
        Você foi convidado para jogar
        {info.torneio ? ` no ${info.torneio}` : ""} com o grupo{" "}
        <strong>{info.grupo}</strong>. 🎾
      </p>

      <div className="mt-4 divide-y divide-slate-100 rounded-xl bg-slate-50 text-sm">
        {info.data && (
          <Linha rotulo="Quando" valor={shortDate(info.data)} />
        )}
        {info.local && <Linha rotulo="Onde" valor={info.local} />}
        {info.quadras ? (
          <Linha rotulo="Quadras" valor={String(info.quadras)} />
        ) : null}
        {info.valor ? (
          <Linha rotulo="Valor da quadra" valor={brl(Number(info.valor))} />
        ) : null}
        {info.vagas ? (
          <Linha
            rotulo="Vagas"
            valor={`${info.confirmados ?? 0} de ${info.vagas} · restam ${Math.max(
              0,
              Number(info.vagas) - Number(info.confirmados ?? 0)
            )}`}
          />
        ) : (
          <Linha
            rotulo="Confirmados"
            valor={String(info.confirmados ?? 0)}
          />
        )}
        {info.pix && <Linha rotulo="Pix" valor={info.pix} />}
      </div>

      {info.pix && (
        <div className="mt-4">
          <PixQR
            chave={info.pix}
            tipo={info.pix_tipo ?? null}
            nome={info.grupo}
            cidade={info.pix_cidade ?? null}
            valor={info.valor ? Number(info.valor) : null}
            descricao={info.torneio ?? null}
            titulo="Pagar a quadra com Pix"
          />
        </div>
      )}

      <div className="mt-5">
        {user ? (
          <ConviteConfirm code={code} atletas={info.atletas ?? []} />
        ) : (
          <div className="grid gap-2">
            <Link href="/criar-conta" className="btn-primary w-full">
              Criar conta e confirmar
            </Link>
            <Link href="/login" className="btn-ghost w-full">
              Já tenho conta
            </Link>
            <p className="text-center text-xs text-slate-400">
              Depois de entrar, abra este link de novo para confirmar sua
              presença.
            </p>
          </div>
        )}
      </div>
    </Moldura>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <span className="shrink-0 text-slate-500">{rotulo}</span>
      <span className="break-all text-right font-semibold text-slate-800">
        {valor}
      </span>
    </div>
  );
}

function Moldura({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-court-gradient px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <p className="mb-3 text-center text-sm font-black uppercase tracking-widest text-court-400">
          Ligaset
        </p>
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h1 className="mb-3 text-center text-xl font-extrabold text-slate-900">
            {titulo}
          </h1>
          {children}
        </div>
      </div>
    </main>
  );
}
