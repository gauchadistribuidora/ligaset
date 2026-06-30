import { PageHeader } from "@/components/ui";
import { createGroup } from "@/app/actions/groups";
import ColorPicker from "@/components/ColorPicker";

export default function NewGroupPage() {
  return (
    <div>
      <PageHeader title="Novo grupo" back="/app/groups" />
      <form action={createGroup} className="card space-y-4">
        <div>
          <label className="label">Nome do grupo</label>
          <input
            name="name"
            required
            placeholder="Ex: Amigos da Quinta"
            className="input"
          />
        </div>
        <div>
          <label className="label">Descrição (opcional)</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Quem é o grupo, onde joga..."
            className="input resize-none"
          />
        </div>
        <div>
          <label className="label">Cor do grupo</label>
          <ColorPicker name="color" />
        </div>
        <button type="submit" className="btn-primary w-full">
          Criar grupo
        </button>
      </form>
    </div>
  );
}
