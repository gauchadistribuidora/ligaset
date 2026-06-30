"use client";

import { useState } from "react";

const COLORS = [
  "#10b981", "#0ea5e9", "#6366f1", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#0c1b2a",
];

export default function ColorPicker({
  name,
  defaultValue = "#10b981",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {COLORS.map((c) => (
        <button
          type="button"
          key={c}
          onClick={() => setValue(c)}
          className={`h-9 w-9 rounded-full ring-2 transition ${
            value === c ? "ring-slate-900 ring-offset-2" : "ring-transparent"
          }`}
          style={{ background: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}
