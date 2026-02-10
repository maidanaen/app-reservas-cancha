import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  
  // 1. Detectar si intenta entrar al área Master
  if (request.nextUrl.pathname.startsWith("/master")) {
    
    // Si ya está en el login, lo dejamos pasar para evitar bucles infinitos
    if (request.nextUrl.pathname === "/master/login") {
      return NextResponse.next();
    }

    // 2. Verificar cookie de sesión
    const tienePermiso = request.cookies.get("nexus_master_session");

    // 3. Si NO tiene permiso, redirigir al login
    if (!tienePermiso) {
      // Construimos la URL absoluta para el redirect
      return NextResponse.redirect(new URL("/master/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matcher para que se ejecute solo en rutas que empiecen con /master
  matcher: ["/master/:path*"],
};