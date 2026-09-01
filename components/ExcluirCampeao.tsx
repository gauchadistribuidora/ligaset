"use client";

import { useTransition } from "react";
import { excluirCampeao } from "@/app/actions/campeoes";

export default function ExcluirCampeao({
  groupId,
  campeaoId,
}: {
  groupId: string;
  campeaoId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Tirar este título do mural?")) return;
        start(async () => {
          await excluirCampeao(groupId, campeaoId);
        });
      }}
      className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-rose-50 hover:text-rose-500"
      aria-label="Excluir"
    >
      ✕
    </button>
  );
}
