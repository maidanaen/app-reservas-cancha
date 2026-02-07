import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  
  // Imprimir en consola para verificar que se ejecuta (Solo en desarrollo)
  console.log("🔒 Middleware verificando:", request.nextUrl.pathname);

  // 1. Detectar si intenta entrar al área Master
  if (request.nextUrl.pathname.startsWith("/master")) {
    
    // Si ya está en el login, lo dejamos pasar
    if (request.nextUrl.pathname === "/master/login") {
      return NextResponse.next();
    }

    // 2. Verificar cookie
    const tienePermiso = request.cookies.get("nexus_master_session");

    // 3. Si NO tiene permiso, redirigir
    if (!tienePermiso) {
      console.log("⛔ Acceso denegado. Redirigiendo al login...");
      return NextResponse.redirect(new URL("/master/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matcher actualizado para cubrir todas las subrutas
  matcher: ["/master/:path*"],
};

//clave momentane 
//   const MY_SECRET_KEY = "NEXUS-MASTER-2026";   
