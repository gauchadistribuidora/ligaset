"use client";

import { useState } from "react";

const HELP: Record<string, string> = {
  round_robin:
    "Sorteio automático monta as duplas fixas; todos jogam contra todos.",
  rei_praia:
    "Individual: cada atleta joga com e contra vários parceiros (quem sobra descansa a rodada). O ranking é individual — 1 grupo só, sem classificados.",
  knockout: "Mata-mata: quem perde é eliminado até sobrar o campeão.",
  groups_ko:
    "Joga-se em grupos (todos contra todos) e os melhores de cada grupo avançam para o mata-mata.",
  manual: "Você monta as duplas e os jogos na mão.",
};

export default function FormatPicker({
  defaultGameFormat,
}: {
  defaultGameFormat: number;
}) {
  const [format, setFormat] = useState("round_robin");

  return (
    <>
      <div>
        <label className="label">Tipo de torneio</label>
        <select
          name="format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="input"
        >
          <option value="round_robin">Todos contra todos (sorteio automático)</option>
          <option value="rei_praia">Rei/Rainha da Praia (individual, rodízio)</option>
          <option value="knockout">Eliminatória direta (mata-mata)</option>
          <option value="groups_ko">Grupos + mata-mata</option>
          <option value="manual">Manual (eu monto as duplas e os jogos)</option>
        </select>
        <p className="mt-1 text-xs text-slate-400">{HELP[format]}</p>
      </div>

      {format === "groups_ko" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Grupos</label>
            <select name="groups_count" defaultValue="2" className="input">
              <option value="2">2 grupos</option>
              <option value="3">3 grupos</option>
              <option value="4">4 grupos</option>
            </select>
          </div>
          <div>
            <label className="label">Classificados por grupo</label>
            <select name="advance_count" defaultValue="2" className="input">
              <option value="1">1º de cada grupo</option>
              <option value="2">Top 2 de cada grupo</option>
            </select>
          </div>
        </div>
      )}
    </>
  );
}
