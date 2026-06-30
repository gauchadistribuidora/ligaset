import { getGroupContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { createTournament } from "@/app/actions/tournaments";
import { notFound } from "next/navigation";

export default async function NewTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isAdmin, settings } = await getGroupContext(id);
  if (!isAdmin) notFound();

  const create = createTournament.bind(null, id);
  const defFormat = settings?.default_game_format ?? 6;

  return (
    <div>
      <PageHeader title="Novo torneio" back={`/app/groups/${id}/tournaments`} />
      <form action={create} className="card space-y-4">
        <div>
          <label className="label">Nome do torneio</label>
          <input name="name" required placeholder="Ex: Torneio de Sábado" className="input" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data</label>
            <input name="date" type="date" className="input" />
          </div>
          <div>
            <label className="label">Quadras</label>
            <input name="courts" type="number" min={1} defaultValue={1} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Local</label>
          <input name="location" placeholder="Arena / endereço" className="input" />
        </div>

        <div>
          <label className="label">Categoria</label>
          <select name="category" className="input">
            <option value="">Sem categoria</option>
            <option>Iniciante (D)</option>
            <option>Intermediário (C)</option>
            <option>Avançado (B)</option>
            <option>Elite (A)</option>
            <option>Masculino</option>
            <option>Feminino</option>
            <option>Misto</option>
          </select>
        </div>

        <div>
          <label className="label">Games por set</label>
          <select name="game_format" defaultValue={String(defFormat)} className="input">
            <option value="4">Set até 4 games</option>
            <option value="5">Set até 5 games</option>
            <option value="6">Set até 6 games</option>
            <option value="7">Set até 7 games</option>
            <option value="9">Set até 9 games</option>
          </select>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <input name="tie_break" type="checkbox" defaultChecked className="h-5 w-5 rounded" />
          Ativar tie-break no empate
        </label>

        <button type="submit" className="btn-primary w-full">
          Criar torneio
        </button>
      </form>
    </div>
  );
}
