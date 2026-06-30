"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=/app` },
    });
    if (error) setError(error.message);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/app` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-dvh bg-court-gradient">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-court-500 text-xl font-black">
            LS
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">Bem-vindo ao Ligaset</h1>
          <p className="mt-1 text-sm text-white/60">
            Entre para gerenciar seus grupos e torneios
          </p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl">📩</div>
              <h2 className="mt-3 text-lg font-bold">Confira seu e-mail</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enviamos um link de acesso para <b>{email}</b>. Clique nele para
                entrar.
              </p>
              <button
                onClick={() => setSent(false)}
                className="btn-ghost mt-4 w-full"
              >
                Usar outro e-mail
              </button>
            </div>
          ) : (
            <>
              <button onClick={signInWithGoogle} className="btn-ghost w-full">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
                </svg>
                Continuar com Google
              </button>

              <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                ou com e-mail
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={sendMagicLink} className="space-y-3">
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
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "Enviando..." : "Receber link de acesso"}
                </button>
              </form>

              {error && (
                <p className="mt-3 text-center text-sm text-rose-500">{error}</p>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Ao continuar você concorda em usar o Ligaset para gestão do seu grupo.
        </p>
      </div>
    </main>
  );
}
