import { requirePlatformAdmin } from "@/lib/admin";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import AdminUsers from "@/components/AdminUsers";
import BroadcastForm from "@/components/BroadcastForm";

export default async function AdminPage() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) notFound();

  const { data: users } = await ctx.supabase
    .from("profiles")
    .select("id, full_name, email, phone, state, city, sport, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Administração"
        subtitle={`${(users ?? []).length} usuário(s) cadastrados`}
        back="/app"
      />

      <BroadcastForm />

      <a href="/app/admin/export" className="btn-ghost w-full">
        ⬇️ Exportar cadastros (Excel)
      </a>

      <AdminUsers users={users ?? []} />
    </div>
  );
}
