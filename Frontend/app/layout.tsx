import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
// 👇 CAMBIO 1: Importamos el Condicional en lugar del Navbar directo
import ConditionalNavbar from "@/components/ConditionalNavbar"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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