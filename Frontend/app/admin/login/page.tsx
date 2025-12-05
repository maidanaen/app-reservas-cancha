"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [userName, setUserName] = useState(""); // Usamos userName
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
      const res = await fetch("https://localhost:7123/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password }),
      });

      if (res.ok) {
        localStorage.setItem("esAdmin", "true"); // Guardamos la sesión
        router.push("/admin"); // Vamos al panel
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } catch (err) {
      setError("Error de conexión");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">🔐 Acceso Admin</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Usuario"
            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">
            Ingresar
          </button>
          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        </form>

        <div className="mt-4 text-center">
          <Link href="/admin/register" className="text-sm text-gray-500 hover:text-green-600 hover:underline">
            ¿No tienes cuenta? Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
}