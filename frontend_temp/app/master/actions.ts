"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginMaster(formData: FormData) {
  const claveIngresada = formData.get("clave");
  const claveReal = process.env.MASTER_SECRET_KEY;

  // 1. Verificar Clave
  if (claveIngresada === claveReal) {
    
    // 2. Crear la Cookie de Sesión (Dura 24 horas)
    const cookieStore = await cookies();
    cookieStore.set("nexus_master_session", "true", {
      httpOnly: true, // No accesible por JS (Mayor seguridad)
      secure: process.env.NODE_ENV === "production", // Solo HTTPS en prod
      maxAge: 60 * 60 * 24, // 1 día
      path: "/",
    });

    // 3. Redirigir al Panel
    redirect("/master/clientes/nuevo");
  } else {
    // Si falla, retornamos error
    return { error: "⛔ Clave Incorrecta" };
  }
}

export async function logoutMaster() {
  const cookieStore = await cookies();
  cookieStore.delete("nexus_master_session");
  redirect("/master/login");
}