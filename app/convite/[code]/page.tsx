import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { brl, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

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

  // Já logado: entra como convidado e confirma a presença na hora.
  if (user) {
    const { data: res } = await supabase.rpc("join_as_guest", { p_code: code });
    const r = res as any;
    if (r?.ok && r.group_id) redirect(`/app/groups/${r.group_id}`);
  }

  return (
    <Moldura titulo={info.torneio || info.grupo}>
      <p className="text-sm text-slate-600">
        <strong>{info.convidou || "Um atleta"}</strong> convidou você para jogar
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
        {info.pix && <Linha rotulo="Pix" valor={info.pix} />}
      </div>

      {info.pix && (
        <p className="mt-3 text-xs text-slate-500">
          Confirme a presença e faça o Pix
          {info.valor ? ` de ${brl(Number(info.valor))}` : ""} para a chave
          acima.
        </p>
      )}

      <div className="mt-5 grid gap-2">
        <Link href="/criar-conta" className="btn-primary w-full">
          Criar conta e confirmar
        </Link>
        <Link href="/login" className="btn-ghost w-full">
          Já tenho conta
        </Link>
        <p className="text-center text-xs text-slate-400">
          Depois de entrar, abra este link de novo para confirmar sua presença.
        </p>
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
