import { getGroupContext } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import ColorPicker from "@/components/ColorPicker";
import ImageUpload from "@/components/ImageUpload";
import SaveForm from "@/components/SaveForm";
import { updateGroup, updateSettings, setGroupLogo } from "@/app/actions/groups";
import { MODALITY_OPTIONS } from "@/lib/format";
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

      <SaveForm action={saveGroup} label="Salvar identidade">
        <h3 className="font-bold text-slate-800">Identidade do grupo</h3>
        <div>
          <label className="label">Logo do grupo</label>
          <ImageUpload
            bucket="logos"
            path={id}
            currentUrl={group.logo_url}
            name={group.name}
            shape="square"
            size={72}
            label="Enviar logo"
            onSave={setGroupLogo.bind(null, id)}
          />
        </div>
        <div>
          <label className="label">Nome</label>
          <input name="name" defaultValue={group.name} required className="input" />
        </div>
        <div>
          <label className="label">Modalidade</label>
          <select name="modality" defaultValue={group.modality || "beach"} className="input">
            {MODALITY_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
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
      </SaveForm>

      <SaveForm action={saveSettings} label="Salvar regras">
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
          <label className="label">Vagas da quadra (opcional)</label>
          <input
            name="capacity"
            type="number"
            min={0}
            defaultValue={settings?.capacity ?? ""}
            placeholder="Ex: 12"
            className="input"
          />
          <p className="mt-1 text-xs text-slate-400">
            Quantos jogadores cabem. Quem confirmar depois de lotar entra na
            lista de espera e sobe sozinho se alguém desistir. Em branco, não há
            limite.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
          <input
            name="players_can_score"
            type="checkbox"
            defaultChecked={settings?.players_can_score ?? false}
            className="mt-0.5 h-5 w-5 shrink-0 rounded accent-court-500"
          />
          <span className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">
              Jogadores lançam o placar
            </strong>
            <br />
            Quem está no torneio pode atualizar o placar dos jogos. Fica
            registrado embaixo do placar quem foi que lançou.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
          <input
            name="pneu_enabled"
            type="checkbox"
            defaultChecked={settings?.pneu_enabled ?? false}
            className="mt-0.5 h-5 w-5 shrink-0 rounded accent-court-500"
          />
          <span className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">
              Ranking do pneu
            </strong>
            <br />
            Quem perde de zero leva um pneu. Cria uma aba com o ranking, que o
            administrador lança e corrige na mão.
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
          <input
            name="confirmations_enabled"
            type="checkbox"
            defaultChecked={settings?.confirmations_enabled ?? false}
            className="mt-0.5 h-5 w-5 shrink-0 rounded accent-court-500"
          />
          <span className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-800">
              ✋ Lista de confirmação
            </strong>
            <br />
            Permite abrir a confirmação de presença nos torneios, para o pessoal
            marcar no app se vai ou não.
          </span>
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
      </SaveForm>
    </div>
  );
}
