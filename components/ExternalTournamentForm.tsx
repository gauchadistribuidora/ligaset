"use client";

import { useState, useTransition } from "react";
import { createExternalTournament } from "@/app/actions/external";
import {
  CATEGORY_GENDERS,
  CATEGORY_LEVELS,
  FEDERATIONS,
  type ExternalEvent,
} from "@/lib/external";

const NEW_EVENT = "__novo__";
const NEW_PARTNER = "__novo__";
const OTHER_FED = "__outra__";

export default function ExternalTournamentForm({
  partners,
  events,
}: {
  partners: string[];
  events: ExternalEvent[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [event, setEvent] = useState(NEW_EVENT);
  const [federation, setFederation] = useState("");
  const [partner, setPartner] = useState(partners.length ? "" : NEW_PARTNER);

  const typingEvent = event === NEW_EVENT;
  const typingPartner = !partners.length || partner === NEW_PARTNER;
  const typingFederation = federation === OTHER_FED;

  // Escolher um torneio já cadastrado traz a federação dele junto.
  function onPickEvent(value: string) {
    setEvent(value);
    if (value === NEW_EVENT) return;
    const found = events.find((e) => e.name === value);
    if (!found?.federation) return;
    setFederation(
      (FEDERATIONS as readonly string[]).includes(found.federation)
        ? found.federation
        : OTHER_FED
    );
  }

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

        {events.length > 0 && (
          <select
            value={event}
            onChange={(e) => onPickEvent(e.target.value)}
            className="input mb-2"
          >
            <option value={NEW_EVENT}>➕ Novo torneio (digitar)</option>
            {events.map((e) => (
              <option key={e.name} value={e.name}>
                {e.name}
                {e.federation ? ` · ${e.federation}` : ""}
              </option>
            ))}
          </select>
        )}

        {typingEvent ? (
          <input
            name="name"
            required
            placeholder="Ex: Open de Verão"
            className="input"
          />
        ) : (
          <input type="hidden" name="name" value={event} />
        )}

        {events.length > 0 && typingEvent && (
          <p className="mt-1.5 text-xs text-slate-400">
            Torneio que se repete no ano? Cadastre uma vez — nas próximas edições
            ele aparece na lista acima, já com a federação.
          </p>
        )}
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
        {typingFederation && (
          <input
            name="federation_other"
            placeholder="Nome da federação"
            className="input mt-2"
          />
        )}
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
