"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Atleta = { id: string; name: string | null };

// Quem recebeu o convite escolhe quem o chamou e confirma. Como o link é um
// só para o grupo inteiro, é o convidado que diz o anfitrião.
export default function ConviteConfirm({
  code,
  atletas,
}: {
  code: string;
  atletas: Atleta[];
}) {
  const [host, setHost] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Quem te convidou?</label>
        <select
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="input"
        >
          <option value="">Selecione...</option>
          {atletas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name ?? "Atleta"}
            </option>
          ))}
        </select>
      </div>

      <button
        disabled={pending || !host}
        onClick={() => {
          setError(null);
          start(async () => {
            const supabase = createClient();
            const { data, error: err } = await supabase.rpc("join_as_guest", {
              p_code: code,
              p_host: host,
            });
            const r = data as any;
            if (err || r?.error) {
              setError(r?.error ?? "Não consegui confirmar. Tente de novo.");
              return;
            }
            router.push(`/app/groups/${r.group_id}`);
          });
        }}
        className="btn-primary w-full"
      >
        {pending ? "Confirmando..." : "✅ Confirmar minha presença"}
      </button>

      {!host && (
        <p className="text-center text-xs text-slate-400">
          Escolha quem te convidou para liberar a confirmação.
        </p>
      )}
      {error && <p className="text-center text-sm text-rose-500">{error}</p>}
    </div>
  );
}
