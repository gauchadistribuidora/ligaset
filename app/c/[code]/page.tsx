import { redirect } from "next/navigation";

// Endereço antigo dos links de presença. Os que já foram para o grupo do
// WhatsApp continuam funcionando: mandamos para o endereço novo.
export default async function ConfirmarAntigo({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/jogo/${code}`);
}
