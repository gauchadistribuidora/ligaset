"use client";

import { useTransition } from "react";
import { reactivateMember } from "@/app/actions/groups";

export default function ReativarMembro({
  groupId,
  memberId,
  nome,
}: {
  groupId: string;
  memberId: string;
  nome: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await reactivateMember(groupId, memberId);
        })
      }
      className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-court-600 ring-1 ring-slate-200"
    >
      {pending ? "..." : `↩︎ ${nome}`}
    </button>
  );
}
