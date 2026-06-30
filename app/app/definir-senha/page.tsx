"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui";

export default function DefinirSenhaPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else window.location.href = "/app";
  }

  return (
    <div>
      <PageHeader title="Criar senha" />
      <div className="card space-y-4">
        <p className="text-sm text-slate-600">
          Crie uma senha para entrar mais rápido da próxima vez — assim você não
          precisa esperar o link no e-mail. É opcional.
        </p>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Nova senha</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className="input pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              >
                {show ? "ocultar" : "ver"}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Salvando..." : "Salvar senha"}
          </button>
          <a href="/app" className="btn-ghost w-full">
            Agora não
          </a>
        </form>
      </div>
    </div>
  );
}
