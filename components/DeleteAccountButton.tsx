"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/app/actions/account";

export default function DeleteAccountButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      const res = await deleteMyAccount();
      if (res?.ok) window.location.href = "/login";
      else setError(res?.error || "Não foi possível excluir a conta.");
    });
  }

  return (
    <div>
      <button
        onClick={() => {
          if (
            confirm(
              "Excluir sua conta? Todos os seus dados serão apagados e os grupos dos quais você é dono também serão removidos. Esta ação não pode ser desfeita."
            )
          )
            run();
        }}
        disabled={pending}
        className="btn-ghost w-full !text-rose-500"
      >
        {pending ? "Excluindo..." : "Excluir minha conta"}
      </button>
      {error && <p className="mt-2 text-center text-sm text-rose-500">{error}</p>}
    </div>
  );
}
