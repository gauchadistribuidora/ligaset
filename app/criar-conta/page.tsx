"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BR_STATES, SIGNUP_SPORTS } from "@/lib/format";

export default function CriarContaPage() {
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: "",
    state: "",
    city: "",
    email: "",
    phone: "",
    sport: "",
    password: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!form.full_name.trim()) return setError("Informe seu nome.");
    if (!form.state) return setError("Selecione seu estado.");
    if (!form.city.trim()) return setError("Informe sua cidade.");
    if (!form.email.trim()) return setError("Informe seu e-mail.");
    if (!form.sport) return setError("Selecione o esporte que você pratica.");
    if (form.password.length < 6)
      return setError("A senha precisa ter ao menos 6 caracteres.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/app`,
        data: {
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          state: form.state,
          city: form.city.trim(),
          sport: form.sport,
        },
      },
    });
    setLoading(false);

    if (error) {
      if (/already registered|already exists/i.test(error.message))
        setError("Este e-mail já tem conta. Volte e faça login.");
      else setError(error.message);
      return;
    }
    if (data.session) {
      window.location.href = "/app";
    } else {
      setInfo(
        "Conta criada! Enviamos um e-mail de confirmação. Confirme e depois faça login."
      );
    }
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

          <h1 className="mb-1 text-center text-xl font-black text-slate-900">
            Criar sua conta
          </h1>
          <p className="mb-5 text-center text-sm text-slate-500">
            Leva menos de um minuto.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Nome completo</label>
              <input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Seu nome"
                className="input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Estado</label>
                <select
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Selecione</option>
                  {BR_STATES.map(([uf, name]) => (
                    <option key={uf} value={uf}>
                      {uf} — {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Cidade</label>
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Sua cidade"
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="voce@email.com"
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Celular</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(00) 00000-0000"
                className="input"
                inputMode="tel"
              />
            </div>

            <div>
              <label className="label">Esporte que pratica</label>
              <select
                value={form.sport}
                onChange={(e) => set("sport", e.target.value)}
                className="input"
                required
              >
                <option value="">Selecione</option>
                {SIGNUP_SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  className="input pr-12"
                  required
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          {error && (
            <p className="mt-3 text-center text-sm text-rose-500">{error}</p>
          )}
          {info && (
            <p className="mt-3 text-center text-sm text-court-600">{info}</p>
          )}

          <a
            href="/login"
            className="mt-4 block text-center text-sm text-slate-500"
          >
            Já tem conta? <span className="font-semibold text-court-600">Entrar</span>
          </a>
        </div>
      </div>
    </main>
  );
}
