import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const FEATURES = [
  { icon: "👥", title: "Grupos & comunidade", desc: "Crie grupos, convide jogadores e defina permissões." },
  { icon: "🏆", title: "Torneios & chaves", desc: "Sorteio de duplas, jogos por quadra e formatos de game." },
  { icon: "📊", title: "Ranking & estatísticas", desc: "Pontos, vitórias, aproveitamento e saldo de games." },
  { icon: "💰", title: "Mensalidades", desc: "Controle de pagamentos, comprovantes e inadimplência." },
];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return (
    <main className="min-h-dvh bg-court-gradient text-white">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-14">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-court-500 text-lg font-black">LS</span>
          <span className="text-xl font-extrabold tracking-tight">Ligaset</span>
        </div>

        <div className="mt-16 flex-1">
          <h1 className="text-4xl font-black leading-tight">
            O sistema operacional do seu{" "}
            <span className="text-court-400">beach tennis</span>.
          </h1>
          <p className="mt-4 text-base text-white/70">
            Grupos, torneios, rankings e mensalidades em um só app. Organize a
            sua arena ou a sua turma de quinta como um profissional.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                <div className="text-2xl">{f.icon}</div>
                <div className="mt-2 text-sm font-bold">{f.title}</div>
                <div className="mt-1 text-xs text-white/60">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <Link href="/login" className="btn-primary w-full">
            Entrar / Criar conta
          </Link>
          <p className="text-center text-xs text-white/50">
            Beach tennis • Ranking • Comunidade
          </p>
        </div>
      </div>
    </main>
  );
}
