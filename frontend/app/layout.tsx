import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
// 👇 CAMBIO 1: Importamos el Condicional en lugar del Navbar directo
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
  description: "Tu próximo partido empieza aquí.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png", // Android y Web
    apple: "/icon-180.png", // iPhone exclusivo
  },
  //  ESTO OBLIGA A iPHONE/ANDROID A COMPORTARSE COMO APP NATIVA
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
    <html lang="en" suppressHydrationWarning>
      <body
       className={inter.className} style={{ backgroundColor: 'white' }}
      >
        <Providers>
        {/* 👇 CAMBIO 2: Usamos el componente inteligente */}
        <ConditionalNavbar />
        
        {children}
        </Providers>
      </body>
    </html>
  );
}