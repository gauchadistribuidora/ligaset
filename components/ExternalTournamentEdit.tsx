"use client";

import { useState, useTransition } from "react";
import { updateExternalTournament } from "@/app/actions/external";
import {
  CATEGORY_GENDERS,
  CATEGORY_LEVELS,
  FEDERATIONS,
  splitCategory,
} from "@/lib/external";

const OTHER_FED = "__outra__";

// Completa ou corrige os dados do torneio. É o que fecha o ciclo da agenda:
// lá se anota só nome e data, aqui se preenche o resto quando ele começa.
export default function ExternalTournamentEdit({
  tournament,
}: {
  tournament: {
    id: string;
    name: string;
    tournament_date: string | null;
    federation: string | null;
    category: string | null;
    partner_name: string | null;
  };
}) {
  const known =
    tournament.federation &&
    (FEDERATIONS as readonly string[]).includes(tournament.federation);

  const [open, setOpen] = useState(false);
  const [federation, setFederation] = useState(
    tournament.federation ? (known ? tournament.federation : OTHER_FED) : ""
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cat = splitCategory(tournament.category);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost w-full">
        ✏️ Editar dados do torneio
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        start(async () => {
          const res = await updateExternalTournament(tournament.id, formData);
          if (res?.error) setError(res.error);
          else setOpen(false);
        });
      }}
      className="card space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          Dados do torneio
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Fechar
        </button>
      </div>

      <div>
        <label className="label">Torneio *</label>
        <input
          name="name"
          required
          defaultValue={tournament.name}
          className="input"
        />
      </div>

      <div>
        <label className="label">Data</label>
        <input
          name="tournament_date"
          type="date"
          defaultValue={tournament.tournament_date ?? ""}
          className="input"
        />
      </div>

      <div>
        <label className="label">Federação</label>
        <select
          name="federation_option"
          value={federation}
          onChange={(e) => setFederation(e.target.value)}
          className="input"
        >
          <option value="">Selecione...</option>
          {FEDERATIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
          <option value={OTHER_FED}>➕ Outra (digitar)</option>
        </select>
        {federation === OTHER_FED && (
          <input
            name="federation_other"
            defaultValue={known ? "" : tournament.federation ?? ""}
            placeholder="Nome da federação"
            className="input mt-2"
          />
        )}
      </div>

      <div>
        <label className="label">Categoria</label>
        <div className="grid grid-cols-2 gap-2">
          <select
            name="category_level"
            defaultValue={cat.level}
            className="input"
          >
            <option value="">Nível...</option>
            {CATEGORY_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            name="category_gender"
            defaultValue={cat.gender || "Masculina"}
            className="input"
          >
            {CATEGORY_GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Parceiro(a)</label>
        <input
          name="partner_name"
          defaultValue={tournament.partner_name ?? ""}
          placeholder="Quem joga com você"
          className="input"
        />
      </div>

      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Salvando..." : "Salvar dados"}
      </button>
      {error && <p className="text-sm text-rose-500">{error}</p>}
    </form>
  );
}
