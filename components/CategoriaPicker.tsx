"use client";

import { useState } from "react";

// Categorias que se repetem toda vez. A lista poupa digitação, e a opção
// "Outra" mantém o campo livre para o que não estiver previsto.
export const CATEGORIAS_RECEITA = [
  "Mensalidade",
  "Diária / avulso",
  "Convidado",
  "Churrasco",
  "Inscrição de torneio",
  "Patrocínio",
  "Rifa / sorteio",
  "Venda de material",
];

export const CATEGORIAS_DESPESA = [
  "Aluguel da quadra",
  "Bolas",
  "Material",
  "Premiação",
  "Churrasco / bebidas",
  "Professor",
  "Manutenção",
  "Taxas",
];

export default function CategoriaPicker({
  name,
  opcoes,
  label = "Categoria",
}: {
  name: string;
  opcoes: string[];
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
          <option value="__outra__">Outra (escrever)...</option>
        </select>
      )}
    </div>
  );
}
