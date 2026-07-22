"use client";

import { useMemo, useState, useTransition } from "react";
import { updateUserProfile } from "@/app/actions/admin";
import { BR_STATES, SIGNUP_SPORTS } from "@/lib/format";

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  city: string | null;
  sport: string | null;
};

export default function AdminUsers({ users }: { users: User[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.phone, u.city, u.state, u.sport]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [q, users]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Usuários</h3>
        <span className="text-xs text-slate-400">{filtered.length} de {users.length}</span>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome, e-mail, cidade..."
        className="input"
      />
      <div className="card divide-y divide-slate-100 !p-0">
        {filtered.map((u) => (
          <Row key={u.id} user={u} />
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Nenhum usuário encontrado.
          </p>
        )}
      </div>
    </section>
  );
}

function Row({ user }: { user: User }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    phone: user.phone || "",
    state: user.state || "",
    city: user.city || "",
    sport: user.sport || "",
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateUserProfile(user.id, form);
      if (res?.ok) setEditing(false);
      else setMsg(res?.error || "Erro ao salvar.");
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">
            {user.full_name || "—"}
          </p>
          <p className="truncate text-xs text-slate-400">
            {user.email || "sem e-mail"}
            {user.city ? ` • ${user.city}${user.state ? "/" + user.state : ""}` : ""}
            {user.sport ? ` • ${user.sport}` : ""}
          </p>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-court-600"
        >
          {editing ? "Fechar" : "Editar"}
        </button>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Nome"
            className="input !py-2"
          />
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="Celular"
            className="input !py-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              className="input !py-2"
            >
              <option value="">Estado</option>
              {BR_STATES.map(([uf, name]) => (
                <option key={uf} value={uf}>{uf} — {name}</option>
              ))}
            </select>
            <input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Cidade"
              className="input !py-2"
            />
          </div>
          <select
            value={form.sport}
            onChange={(e) => set("sport", e.target.value)}
            className="input !py-2"
          >
            <option value="">Esporte</option>
            {SIGNUP_SPORTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={save} disabled={pending} className="btn-primary w-full !py-2 text-sm">
            {pending ? "Salvando..." : "Salvar"}
          </button>
          {msg && <p className="text-xs text-rose-500">{msg}</p>}
        </div>
      )}
    </div>
  );
}
