import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
// 👇 CAMBIO 1: Importamos el Condicional en lugar del Navbar directo
import ConditionalNavbar from "@/components/ConditionalNavbar"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nexus Sport Complex", // Aproveché para ponerle un título mejor
  description: "Sistema de gestión de canchas deportivas",
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