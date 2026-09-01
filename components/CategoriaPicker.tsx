"use client";

import { useState } from "react";
import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_RECEITA,
} from "@/lib/categorias";

export { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA };

export default function CategoriaPicker({
  name,
  opcoes,
  extras = [],
  label = "Categoria",
}: {
  name: string;
  opcoes: string[];
  // Categorias que o proprio grupo cadastrou.
  extras?: string[];
  label?: string;
}) {
  const [outra, setOutra] = useState(false);

  return (
    <div>
      <label className="label">{label}</label>
      {outra ? (
        <div className="flex gap-2">
          <input
            name={name}
            autoFocus
            maxLength={40}
            placeholder="Escreva a categoria"
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => setOutra(false)}
            className="btn-ghost shrink-0 !py-2 text-xs"
          >
            Ver lista
          </button>
        </div>
      ) : (
        <select
          name={name}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value === "__outra__") setOutra(true);
          }}
          className="input"
        >
          <option value="">Sem categoria</option>
          {opcoes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {extras.length > 0 && (
            <optgroup label="Do seu grupo">
              {extras.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </optgroup>
          )}
          <option value="__outra__">Outra (escrever)...</option>
        </select>
      )}
    </div>
  );
}
