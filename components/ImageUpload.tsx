"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui";

export default function ImageUpload({
  bucket,
  path,
  currentUrl,
  name,
  shape = "circle",
  size = 64,
  label = "Trocar foto",
  onSave,
}: {
  bucket: "avatars" | "logos";
  /** caminho do arquivo dentro do bucket, sem extensão. Ex: `${groupId}/${memberId}` */
  path: string;
  currentUrl?: string | null;
  name?: string | null;
  shape?: "circle" | "square";
  size?: number;
  label?: string;
  /** server action que persiste a URL no banco */
  onSave: (url: string) => Promise<{ ok?: boolean; error?: string } | void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(currentUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, start] = useTransition();

  async function pick(file: File) {
    setErr(null);
    if (!file.type.startsWith("image/")) {
      setErr("Selecione uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("Imagem muito grande (máx. 5MB).");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const key = `${path}.${ext}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(key, file, { upsert: true, cacheControl: "3600" });
      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      setUrl(publicUrl);
      start(async () => {
        const res = await onSave(publicUrl);
        if (res && "error" in res && res.error) setErr(res.error);
      });
    } catch (e: any) {
      setErr(e?.message || "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  const radius = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative overflow-hidden ${radius} ring-1 ring-slate-200`}
        style={{ width: size, height: size }}
        aria-label={label}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name ?? ""} className="h-full w-full object-cover" />
        ) : (
          <Avatar name={name} size={size} />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs text-white">
            ...
          </span>
        )}
      </button>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-sm font-semibold text-court-600"
        >
          {busy ? "Enviando..." : label}
        </button>
        {err && <p className="text-xs text-rose-500">{err}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
