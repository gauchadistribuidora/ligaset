import { ImageResponse } from "next/og";
import { requireExternalTester } from "@/lib/admin";
import { resultLabel } from "@/lib/external";

// Card 1080x1350 (formato retrato do Instagram) com o resultado do torneio.
// Gerado pelo próprio Next — sem biblioteca nova.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ctx = await requireExternalTester();
  if (!ctx) return new Response("Não encontrado", { status: 404 });
  const { supabase, user } = ctx;

  const { data: t } = await supabase
    .from("external_tournaments")
    .select("*, matches:external_matches(won)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!t) return new Response("Não encontrado", { status: 404 });

  const matches = (t.matches ?? []) as { won: boolean }[];
  const wins = matches.filter((m) => m.won).length;
  const losses = matches.length - wins;

  const date = t.tournament_date
    ? new Date(t.tournament_date + "T00:00:00").toLocaleDateString("pt-BR")
    : "";

  try {
    return buildCard({
      name: t.name,
      champion: t.champion,
      result: resultLabel(t).toUpperCase(),
      accent: t.champion ? "#fbbf24" : "#34d399",
      details: [
        t.federation,
        date,
        t.category,
        t.partner_name ? `com ${t.partner_name}` : "",
      ]
        .filter(Boolean)
        .join("   ·   "),
      record: matches.length ? `${wins}V ${losses}D` : "Sem jogos",
    });
  } catch {
    return new Response(
      "Não consegui gerar a imagem do card agora. Me avise que eu conserto.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }
}

function buildCard({
  name,
  champion,
  result,
  accent,
  details,
  record,
}: {
  name: string;
  champion: boolean;
  result: string;
  accent: string;
  details: string;
  record: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 90,
          background:
            "linear-gradient(135deg, #071320 0%, #0c1b2a 45%, #0e7490 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: 14,
              color: "#34d399",
            }}
          >
            LIGASET
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 34,
              color: "rgba(255,255,255,0.55)",
              letterSpacing: 6,
            }}
          >
            {champion ? "TÍTULO" : "RESULTADO"}
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.05,
              marginTop: 24,
              color: accent,
            }}
          >
            {result}
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.15,
              marginTop: 36,
              color: "white",
            }}
          >
            {name}
          </div>
          {details ? (
            <div
              style={{
                fontSize: 34,
                marginTop: 28,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {details}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 800,
              padding: "18px 36px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
            }}
          >
            {record}
          </div>
          <div style={{ fontSize: 32, color: "rgba(255,255,255,0.5)" }}>
            ligaset.com.br
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
