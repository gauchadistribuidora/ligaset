"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Atleta = { id: string; name: string | null };

// Entrar na lista sem criar conta: nome e quem convidou. Para quem vai jogar
// uma vez, exigir cadastro era o que fazia desistir no meio.
export default function ConviteEntrar({
  code,
  atletas,
}: {
  code: string;
  atletas: Atleta[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pronto, setPronto] = useState<string | null>(null);

  if (pronto) {
    return (
      <div className="rounded-xl bg-court-50 p-4 text-center">
        <p className="text-lg font-black text-court-700">
          Presença confirmada! 🎾
        </p>
        <p className="mt-1 text-sm text-slate-600">
          <strong>{pronto}</strong>, você está na lista. Bom jogo!
        </p>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        const nome = String(fd.get("nome") || "").trim();
        const host = String(fd.get("host") || "");
        if (!nome) {
          setError("Escreva o seu nome.");
          return;
        }
        setError(null);
        start(async () => {
          const supabase = createClient();
          const { data, error: err } = await supabase.rpc(
            "public_join_invite",
            { p_code: code, p_nome: nome, p_host: host || null }
          );
          const r = data as any;
          if (err || r?.error) {
            setError(r?.error ?? "Não consegui confirmar. Tente de novo.");
            return;
          }
          setPronto(r.nome ?? nome);
        });
      }}
      className="space-y-3"
    >
      <div>
        <label className="label">Seu nome *</label>
        <input
          name="nome"
          required
          maxLength={60}
          placeholder="Como o pessoal te chama"
          className="input"
        />
      </div>

      <div>
        <label className="label">Quem te convidou?</label>
        <select name="host" defaultValue="" className="input">
          <option value="">Não sei / prefiro não dizer</option>
          {atletas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? "Atleta"}
            </option>
          ))}
        </select>
      </div>

      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Confirmando..." : "✅ Confirmar minha presença"}
      </button>

      {error && <p className="text-center text-sm text-rose-500">{error}</p>}

      <p className="text-center text-xs text-slate-400">
        Não precisa criar conta. Se quiser acompanhar o ranking e o histórico
        depois, dá para criar uma na hora que quiser.
      </p>
    </form>
  );
}
