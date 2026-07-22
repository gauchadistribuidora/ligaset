"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary w-full">
      🖨️ Baixar / imprimir PDF
    </button>
  );
}
