import { requirePlatformAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return new NextResponse("Não autorizado", { status: 403 });

  const { data: users } = await ctx.supabase
    .from("profiles")
    .select("full_name, email, phone, state, city, sport, created_at")
    .order("created_at", { ascending: false });

  const rows = (users ?? []).map((u: any) => ({
    Nome: u.full_name || "",
    "E-mail": u.email || "",
    Celular: u.phone || "",
    Estado: u.state || "",
    Cidade: u.city || "",
    Esporte: u.sport || "",
    Cadastro: u.created_at ? String(u.created_at).slice(0, 10) : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 26 }, { wch: 28 }, { wch: 16 },
    { wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cadastros");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="cadastros-ligaset.xlsx"',
    },
  });
}
