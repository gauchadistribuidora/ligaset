"use client";

import { useState, useTransition } from "react";
import { createExternalTournament } from "@/app/actions/external";
import { CATEGORY_GENDERS, CATEGORY_LEVELS } from "@/lib/external";

const NEW_PARTNER = "__novo__";

export default function ExternalTournamentForm({
  partners,
}: {
  partners: string[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [partner, setPartner] = useState(partners.length ? "" : NEW_PARTNER);

  // Sem lista ainda, ou escolheu "outro": digita o nome.
  const typingPartner = !partners.length || partner === NEW_PARTNER;

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

      <div>
        <label className="label">Data</label>
        <input name="tournament_date" type="date" className="input" />
      </div>

      <div>
        <label className="label">Categoria</label>
        <div className="grid grid-cols-2 gap-2">
          <select name="category_level" defaultValue="" className="input">
            <option value="">Nível...</option>
            {CATEGORY_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select name="category_gender" defaultValue="" className="input">
            <option value="">Naipe...</option>
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

        {partners.length > 0 && (
          <select
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            className="input mb-2"
          >
            <option value="">Selecione...</option>
            {partners.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={NEW_PARTNER}>➕ Outro parceiro (digitar)</option>
          </select>
        )}

        {typingPartner ? (
          <>
            <input
              name="partner_name"
              placeholder="Quem jogou com você"
              className="input"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              O nome entra na sua lista de parceiros. Da próxima vez é só
              escolher — é assim que o relatório de melhor e pior dupla não se
              perde com nomes escritos de jeitos diferentes.
            </p>
          </>
        ) : (
          <input type="hidden" name="partner_name" value={partner} />
        )}
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
        <input
          type="checkbox"
          name="planned"
          className="mt-0.5 h-5 w-5 shrink-0 accent-court-500"
        />
        <span className="text-sm text-slate-600">
          <strong className="font-semibold text-slate-800">
            Ainda vou jogar
          </strong>
          <br />
          Só agenda o torneio. Ele fica esperando na lista e você começa a lançar
          os jogos quando ele acontecer.
        </span>
      </label>

      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Criando..." : "Criar torneio"}
      </button>
      {error && <p className="text-sm text-rose-500">{error}</p>}
    </form>
  );
}
