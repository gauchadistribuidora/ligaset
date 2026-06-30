import Link from "next/link";
import { getGroupContext } from "@/lib/data";
import GroupTabs from "@/components/GroupTabs";
import { MODALITY_LABEL } from "@/lib/format";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { group, isAdmin } = await getGroupContext(id);

  return (
    <div>
      <div
        className="-mx-4 -mt-6 mb-4 px-4 pb-5 pt-6 text-white"
        style={{
          background: `linear-gradient(135deg, ${group.color} 0%, #0c1b2a 130%)`,
        }}
      >
        <Link href="/app/groups" className="text-sm text-white/70">
          ← Grupos
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {group.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.logo_url}
                alt={group.name}
                className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/30"
              />
            )}
            <div>
            <h1 className="text-2xl font-black leading-tight">{group.name}</h1>
            <span className="mt-1 inline-block rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold backdrop-blur">{MODALITY_LABEL[group.modality] || "Beach Tennis"}</span>
            {group.description && (
              <p className="text-sm text-white/70">{group.description}</p>
            )}
            </div>
          </div>
          {isAdmin && (
            <Link
              href={`/app/groups/${id}/settings`}
              className="rounded-full bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur"
            >
              ⚙️
            </Link>
          )}
        </div>
      </div>

      <GroupTabs groupId={id} />
      {children}
    </div>
  );
}
