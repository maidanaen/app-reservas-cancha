import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import ConditionalNavbar from "@/components/ConditionalNavbar"; 

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Nexus Sport - Reservas",
  description: "Administra tu cantina y reservas de forma rápida y profesional.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png", 
    apple: "/icon-180.png", 
  },
  // --- ETIQUETAS PARA COMPARTIR (LOGO EN WHATSAPP/REDES) ---
  openGraph: {
    title: "Nexus Sport - Gestión Deportiva",
    description: "Tu próximo partido empieza aquí. Control de turnos y cantina.",
    url: "https://nexussport.vercel.app",
    siteName: "Nexus Sport",
    images: [
      {
        url: "https://nexussport.vercel.app/opengraph-image.png", // Asegúrate que este archivo exista en /public
        width: 1200,
        height: 630,
        alt: "Nexus Sport Logo Preview",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  // --- CONFIGURACIÓN TWITTER/X ---
  twitter: {
    card: "summary_large_image",
    title: "Nexus Sport",
    description: "Gestión inteligente para complejos deportivos.",
    images: ["https://nexussport.vercel.app/opengraph-image.png"],
  },
  // --- COMPORTAMIENTO APP NATIVA ---
  appleWebApp: {
    capable: true,
    title: "Nexus Sport",
    statusBarStyle: "black-translucent",
  },
  applicationName: "Nexus Sport",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} style={{ backgroundColor: 'white' }}>
        <Providers>
          <div className="print:hidden">
            <ConditionalNavbar />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}