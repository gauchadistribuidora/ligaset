"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("desconectado")) setNotice("Você foi desconectado com sucesso.");
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading("entrar");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) {
      setError("E-mail ou senha incorretos. Crie uma conta ou recupere a senha.");
    } else {
      window.location.href = "/app";
    }
  }

  async function forgot() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Digite seu e-mail para recuperar a senha.");
      return;
    }
    setLoading("forgot");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/app/definir-senha`,
    });
    setLoading(null);
    if (error) setError(error.message);
    else setInfo("Enviamos um e-mail para você criar uma nova senha.");
  }

  return (
    <main className="min-h-dvh bg-court-gradient">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <div className="card">
          <div
            className="mx-auto mb-4 w-full overflow-hidden rounded-xl"
            style={{ aspectRatio: "5 / 2" }}
          >
            <img
              src="/logo.png"
              alt="LigaSet"
              className="h-full w-full object-cover object-center"
            />
          </div>

          {notice && (
            <div className="mb-4 rounded-xl border border-court-200 bg-court-50 px-4 py-3 text-center text-sm font-medium text-court-700">
              ✅ {notice}
            </div>
          )}

          <form onSubmit={signInPassword} className="space-y-3">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="input"
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="sua senha"
                  className="input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                >
                  {showPass ? "ocultar" : "ver"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading !== null} className="btn-primary w-full">
              {loading === "entrar" ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between text-sm">
            <a href="/criar-conta" className="font-semibold text-court-600">
              Criar conta
            </a>
            <button
              onClick={forgot}
              disabled={loading !== null}
              className="text-slate-500"
            >
              Esqueci a senha
            </button>
          </div>

          {error && <p className="mt-3 text-center text-sm text-rose-500">{error}</p>}
          {info && <p className="mt-3 text-center text-sm text-court-600">{info}</p>}
        </div>
      </div>
    </main>
  );
}
