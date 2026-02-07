"use client";
import { useState } from "react";
import { ShieldAlert, Lock } from "lucide-react";
// Importamos la acción del Paso 2
import { loginMaster } from "../actions";


export default function MasterLoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    
    // Llamamos a la Server Action
    const result = await loginMaster(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Si es correcto, la action hace el redirect automático
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md text-center animate-in fade-in zoom-in">
        <ShieldAlert size={48} className="text-red-500 mx-auto mb-4"/>
        <h1 className="text-2xl font-black text-white mb-2">Área Restringida</h1>
        <p className="text-slate-400 mb-6 text-sm">Panel Super Admin SaaS</p>
        
        <form action={handleSubmit} className="space-y-4">
          <input 
            name="clave" 
            type="password" 
            placeholder="Clave Maestra" 
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 text-white text-center tracking-widest outline-none focus:border-red-500 transition" 
            required
          />
          
          {error && <p className="text-red-400 font-bold text-sm bg-red-500/10 p-2 rounded animate-pulse">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Verificando..." : <><Lock size={18}/> Acceder</>}
          </button>
        </form>
      </div>
    </div>
  );
}