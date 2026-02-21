"use client";
import { useState } from "react";
// import { useRouter } from "next/navigation"; // 👈 YA NO LO NECESITAMOS PARA REDIRIGIR
import { Lock, User, AlertCircle, ArrowRight } from "lucide-react"; 
import { API_URL } from '@/utils/config';
export default function LoginPage() {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  // const router = useRouter(); // 👈 ELIMINADO

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 🛑 VITAL: Evita que el formulario recargue solo
    
    setError("");
    setCargando(true);

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    try {
      const res = await fetch(`${API_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            userName: email,    
            Password: password  
        }) 
      });

      if (res.ok) {
        const data = await res.json();
        
        // 1. Guardamos datos
        localStorage.setItem("token", data.token);
        localStorage.setItem("usuarioId", data.id);
        localStorage.setItem("nombreNegocio", data.nombreNegocio || "Mi Club");

        // 2. 🟢 SOLUCIÓN AL BUCLE: Usamos window.location en lugar de router.push
        // Esto fuerza al navegador a refrescar la memoria y asegura que el Dashboard
        // encuentre el ID que acabamos de guardar.
        window.location.href = "/admin";

      } else {
        const errorData = await res.json();
        setError(errorData.message || "Usuario o contraseña incorrectos");
        setCargando(false); // Solo dejamos de cargar si falló
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
        
        <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-900 flex justify-center items-center gap-2 mb-2">
               <Lock className="text-blue-600" size={28}/> Acceso Admin
            </h2>
             <p className="text-sm text-gray-400 font-medium">Sistema de Gestión Nexus Sport</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Usuario</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Ej: Usuarionuevo" 
                        className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition font-bold text-slate-900"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Contraseña</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                    <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full pl-12 p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition font-bold text-slate-900"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold text-center border border-red-100 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18}/> {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={cargando}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {cargando ? "Verificando..." : <>Ingresar al Panel <ArrowRight size={18}/></>}
            </button>
        </form>
      </div>
    </div>
  );
}