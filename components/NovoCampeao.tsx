"use client";

import { useState, useTransition } from "react";
import { adicionarCampeao } from "@/app/actions/campeoes";

type Atleta = { id: string; name: string | null };

export default function NovoCampeao({
  groupId,
  atletas,
}: {
  groupId: string;
  atletas: Atleta[];
}) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [livre1, setLivre1] = useState(false);
  const [livre2, setLivre2] = useState(false);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="btn-primary w-full">
        ＋ Cadastrar campeão
      </button>
    );
  }

  return (
    <form
      id="form-campeao"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await adicionarCampeao(groupId, fd);
          if (res?.error) setError(res.error);
          else {
            (document.getElementById("form-campeao") as HTMLFormElement)?.reset();
            setLivre1(false);
            setLivre2(false);
            setAberto(false);
          }
        });
      }}
      className="card space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          🏆 Cadastrar campeão
        </p>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="shrink-0 text-xs font-semibold text-slate-400"
        >
          Fechar
        </button>
      </div>

      <div>
        <label className="label">Torneio *</label>
        <input
          name="titulo"
          required
          maxLength={80}
          placeholder="Ex: Torneio de Verão 2024"
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Data</label>
          <input name="event_date" type="date" className="input" />
        </div>
        <div>
          <label className="label">Categoria</label>
          <input
            name="categoria"
            maxLength={40}
            placeholder="Ex: Masculina B"
            className="input"
          />
        </div>
      </div>

      <Campeao
        indice={1}
        atletas={atletas}
        livre={livre1}
        setLivre={setLivre1}
        obrigatorio
      />
      <Campeao
        indice={2}
        atletas={atletas}
        livre={livre2}
        setLivre={setLivre2}
      />

      <div>
        <label className="label">Observação</label>
        <input
          name="observacao"
          maxLength={120}
          placeholder="Ex: virada na final, 7/6 no tie-break"
          className="input"
        />
      </div>

      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Salvando..." : "Adicionar ao mural"}
      </button>

      {error && <p className="text-sm text-rose-500">{error}</p>}
    </form>
  );
}

// Quem jogou antes do app pode não ter cadastro — por isso o campo livre.
function Campeao({
  indice,
  atletas,
  livre,
  setLivre,
  obrigatorio,
}: {
  indice: 1 | 2;
  atletas: Atleta[];
  livre: boolean;
  setLivre: (v: boolean) => void;
  obrigatorio?: boolean;
}) {
  return (
    <div>
      <label className="label">
        {indice === 1 ? "Campeão *" : "Dupla (opcional)"}
      </label>
      {livre ? (
        <div className="flex gap-2">
          <input
            name={`nome${indice}`}
            maxLength={60}
            autoFocus
            placeholder="Nome de quem não é do grupo"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => setLivre(false)}
            className="btn-ghost shrink-0 !py-2 text-xs"
          >
            Ver lista
          </button>
        </div>
      ) : (
        <select
          name={`member${indice}_id`}
          defaultValue=""
          required={obrigatorio}
          onChange={(e) => {
            if (e.target.value === "__livre__") setLivre(true);
          }}
          className="input"
        >
          <option value="" disabled={obrigatorio}>
            {obrigatorio ? "Escolha o atleta..." : "Sem dupla"}
          </option>
          {atletas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? "Atleta"}
            </option>
          ))}
          <option value="__livre__">Não é do grupo (escrever)...</option>
        </select>
      )}
    </div>
  );
}
