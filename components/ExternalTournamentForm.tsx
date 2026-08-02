"use client";

import { useState, useTransition } from "react";
import { createExternalTournament } from "@/app/actions/external";

export default function ExternalTournamentForm({
  partners,
  categories,
}: {
  partners: string[];
  categories: string[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await createExternalTournament(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={onSubmit} className="card space-y-3">
      <div>
        <label className="label">Torneio *</label>
        <input
          name="name"
          required
          placeholder="Ex: Open de Verão"
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Data</label>
          <input name="tournament_date" type="date" className="input" />
        </div>
        <div>
          <label className="label">Categoria</label>
          <input
            name="category"
            list="ext-categories"
            placeholder="Ex: B feminina"
            className="input"
          />
          <datalist id="ext-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="label">Parceiro(a)</label>
        <input
          name="partner_name"
          list="ext-partners"
          placeholder="Quem jogou com você"
          className="input"
        />
        <datalist id="ext-partners">
          {partners.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <p className="mt-1.5 text-xs text-slate-400">
          Escreva sempre do mesmo jeito — é por esse nome que o relatório de
          melhor e pior dupla junta os jogos.
        </p>
      </div>

      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Criando..." : "Criar torneio"}
      </button>
      {error && <p className="text-sm text-rose-500">{error}</p>}
    </form>
  );
}
