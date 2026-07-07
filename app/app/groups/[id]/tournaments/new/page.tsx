import { getGroupContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import FormatPicker from "@/components/FormatPicker";
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

        <FormatPicker defaultGameFormat={defFormat} />

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Número de sets</label>
            <select name="sets" defaultValue="1" className="input">
              <option value="1">1 set</option>
              <option value="2">2 sets</option>
              <option value="3">3 sets (melhor de 3)</option>
              <option value="5">5 sets (melhor de 5)</option>
            </select>
          </div>
          <div>
            <label className="label">Games por set</label>
            <select name="game_format" defaultValue={String(defFormat)} className="input">
              <option value="4">até 4 games</option>
              <option value="5">até 5 games</option>
              <option value="6">até 6 games</option>
              <option value="7">até 7 games</option>
              <option value="9">até 9 games</option>
            </select>
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-400">
          Ex: 2 sets de 6 games. O placar permite lançar o resultado de cada set.
        </p>

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
