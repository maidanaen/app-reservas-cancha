"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Para poner el link de "Volver al login"

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState(""); // Para mostrar éxito o error
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Truco del certificado local

    try {
      // OJO: Revisa que el puerto 7123 sea el tuyo
      const res = await fetch("https://localhost:7123/api/Auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setMensaje("✅ ¡Creado! Redirigiendo al login...");
        // Esperamos 2 segundos y lo mandamos al login
        setTimeout(() => {
          router.push("/admin/login");
        }, 2000);
      } else {
        const data = await res.json();
        setMensaje(`❌ Error: ${data.message || "No se pudo registrar"}`);
      }
    } catch (err) {
      setMensaje("❌ Error de conexión");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">✨ Nuevo Admin</h1>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Elige un Usuario"
            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Elige una Contraseña"
            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
            Registrar Admin
          </button>
          
          {mensaje && <p className="text-center text-sm font-medium mt-2">{mensaje}</p>}
        </form>

        <div className="mt-4 text-center">
          <Link href="/admin/login" className="text-sm text-gray-500 hover:text-green-600 hover:underline">
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}