export function Logo({
  tone = "dark",
  className = "",
  tagline = false,
}: {
  tone?: "dark" | "light";
  className?: string;
  tagline?: boolean;
}) {
  const liga = tone === "light" ? "#ffffff" : "#0c2340";
  const set = "#16c7c7";
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <span
        className="inline-flex items-baseline font-extrabold italic leading-none tracking-tight"
        style={{ transform: "skewX(-6deg)" }}
      >
        <span style={{ color: liga }}>Liga</span>
        <span style={{ color: set }}>Set</span>
      </span>
      {tagline && (
        <span
          className="mt-1.5 text-xs font-medium not-italic"
          style={{ color: tone === "light" ? "rgba(255,255,255,.7)" : "#0c2340" }}
        >
          Organize, jogue, ranqueie e evolua.
        </span>
      )}
    </div>
  );
}

export function Credit({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const c = tone === "light" ? "rgba(255,255,255,.5)" : "#94a3b8";
  return (
    <p className="text-center text-xs" style={{ color: c }}>
      Desenvolvido por Henrique Nunes ·{" "}
      <a
        href="https://wa.me/5551981151291"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        WhatsApp 51 98115-1291
      </a>
    </p>
  );
}
