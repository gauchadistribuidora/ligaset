import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Página do link de convite. Quem abre logado entra no grupo na hora.
export default async function EntrarPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: groupId, error } = await supabase.rpc("join_group_by_code", {
      p_code: code,
    });
    if (!error && groupId) redirect(`/app/groups/${groupId}`);

    return (
      <Card
        titulo="Convite inválido"
        texto="Este link não vale mais. Peça um link novo para o administrador do grupo."
        acao={
          <Link href="/app" className="btn-primary">
            Ir para o app
          </Link>
        }
      />
    );
  }

  return (
    <Card
      titulo="Você foi convidado! 🎾"
      texto="Entre na sua conta (ou crie uma) e abra este link de novo para entrar no grupo."
      acao={
        <div className="grid w-full gap-2">
          <Link href="/login" className="btn-primary w-full">
            Entrar na minha conta
          </Link>
          <Link href="/criar-conta" className="btn-ghost w-full">
            Criar conta
          </Link>
        </div>
      }
    />
  );
}

function Card({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto: string;
  acao: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-court-gradient px-6 text-white">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-slate-800 shadow-card">
        <div className="text-4xl">🎾</div>
        <h1 className="mt-3 text-xl font-extrabold">{titulo}</h1>
        <p className="mt-2 text-sm text-slate-500">{texto}</p>
        <div className="mt-5 flex justify-center">{acao}</div>
      </div>
    </main>
  );
}
