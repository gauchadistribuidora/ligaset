import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
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
    icon: "/icon.svg",
    apple: "/icon.svg",
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
