"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar"; // Tu Navbar original

export default function ConditionalNavbar() {
  const pathname = usePathname();

  // 🛑 REGLA: Si la ruta empieza con "/master/", NO mostramos el Navbar público
  if (pathname.startsWith("/master")) {
    return null;
  }

  // ✅ Si no es admin, mostramos el Navbar normal
  return <Navbar />;
}