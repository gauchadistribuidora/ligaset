import { getGroupContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ColorPicker from "@/components/ColorPicker";
import { updateGroup, updateSettings } from "@/app/actions/groups";
import { notFound } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { group, settings, isAdmin } = await getGroupContext(id);
  if (!isAdmin) notFound();

  const saveGroup = updateGroup.bind(null, id);
  const saveSettings = updateSettings.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" back={`/app/groups/${id}`} />

      <form action={saveGroup} className="card space-y-4">
        <h3 className="font-bold text-slate-800">Identidade do grupo</h3>
        <div>
          <label className="label">Nome</label>
          <input name="name" defaultValue={group.name} required className="input" />
        </div>
        <div>
          <label className="label">Descrição</label>
          <textarea
            name="description"
            defaultValue={group.description ?? ""}
            rows={2}
            className="input resize-none"
          />
        </div>
        <div>
          <label className="label">Cor</label>
          <ColorPicker name="color" defaultValue={group.color} />
        </div>
        <button className="btn-primary w-full">Salvar identidade</button>
      </form>

      <form action={saveSettings} className="card space-y-4">
        <h3 className="font-bold text-slate-800">Regras & financeiro</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Games por set (padrão)</label>
            <select
              name="default_game_format"
              defaultValue={String(settings?.default_game_format ?? 6)}
              className="input"
            >
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="9">9</option>
            </select>
          </div>
          <div>
            <label className="label">Dia de vencimento</label>
            <input
              name="due_day"
              type="number"
              min={1}
              max={28}
              defaultValue={settings?.due_day ?? 10}
              className="input"
            />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <input
            name="tie_break"
            type="checkbox"
            defaultChecked={settings?.tie_break ?? true}
            className="h-5 w-5 rounded"
          />
          Tie-break ativado por padrão
        </label>
        <div>
          <label className="label">Mensalidade (R$)</label>
          <input
            name="monthly_fee"
            type="number"
            step="0.01"
            min={0}
            defaultValue={settings?.monthly_fee ?? 0}
            className="input"
          />
        </div>
        <div>
          <label className="label">Chave Pix do grupo</label>
          <input
            name="pix_key"
            defaultValue={settings?.pix_key ?? ""}
            placeholder="email, telefone ou chave aleatória"
            className="input"
          />
        </div>
        <button className="btn-primary w-full">Salvar regras</button>
      </form>
    </div>
  );
}
