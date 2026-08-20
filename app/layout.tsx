import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  // Sem isso a imagem da prévia vira endereço relativo e o WhatsApp não
  // consegue buscar.
  metadataBase: new URL("https://ligaset.com.br"),
  title: "Ligaset — Organize, jogue, ranqueie e evolua",
  description:
    "A plataforma completa para organizar grupos, torneios, rankings e mensalidades do seu esporte.",
  manifest: "/manifest.json",
  applicationName: "Ligaset",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ligaset",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#071320",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
