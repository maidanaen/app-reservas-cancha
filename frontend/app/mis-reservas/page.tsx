"use client";
import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Search, Phone, ArrowRight, Frown } from "lucide-react";
import { API_URL } from '@/utils/config';

interface Reserva {
  id: number;
  club: string;
  cancha: string;
  fecha: string;
  hora: string;
  estado: string;
  precio: number;
}

export default function MisReservasPage() {
  const [telefono, setTelefono] = useState("");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const buscarReservas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono.trim()) return;

    setCargando(true);
    setBusquedaRealizada(true);
    setReservas([]); // Limpiamos resultados anteriores

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Solo para desarrollo local

    try {
        // 🟢 CONEXIÓN REAL A TU API
        const res = await fetch(`${API_URL}/api/Reservas/buscar/${telefono.trim()}`);
        
        if (res.ok) {
            const data = await res.json();
            setReservas(data);
        } else {
            console.error("Error al buscar reservas");
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    } finally {
        setCargando(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 min-h-screen font-sans bg-slate-50">
      
      {/* HEADER */}
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center justify-center md:justify-start gap-2">
            Mis Reservas 🎾
        </h1>
        <p className="text-gray-500">Consulta tus próximos partidos ingresando tu celular.</p>
      </div>

      {/* 🔍 BARRA DE BÚSQUEDA */}
      <form onSubmit={buscarReservas} className="relative mb-10 shadow-xl rounded-2xl group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Phone className="text-slate-400 group-focus-within:text-blue-500 transition" size={20}/>
        </div>
        <input 
            type="tel" 
            placeholder="Ingresa tu número (Ej: 3795014124)" 
            className="w-full pl-12 pr-32 py-5 bg-white rounded-2xl border border-slate-100 text-slate-900 font-bold text-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition placeholder:font-normal placeholder:text-slate-400"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            autoFocus
        />
        <button 
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-slate-900 hover:bg-orange-600 text-white px-6 rounded-xl font-bold transition flex items-center gap-2"
        >
            {cargando ? "..." : "Buscar"}
        </button>
      </form>

      {/* --- RESULTADOS --- */}
      <div className="space-y-4">
        
        {/* CARGANDO */}
        {cargando && (
            <div className="text-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-400 font-bold animate-pulse">Buscando en la base de datos...</p>
            </div>
        )}

        {/* SIN RESULTADOS */}
        {!cargando && busquedaRealizada && reservas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 animate-in fade-in zoom-in">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <Frown size={40} className="text-slate-400"/>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">No encontramos reservas</h3>
                <p className="text-slate-400 mb-6 text-center max-w-xs text-sm">
                    No hay turnos registrados con el número <span className="text-slate-900 font-bold">{telefono}</span>.
                </p>
                <Link 
                    href="/reservar" 
                    className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 flex items-center gap-2"
                >
                    Reservar Cancha <ArrowRight size={18}/>
                </Link>
            </div>
        )}

        {/* LISTA DE RESERVAS REALES */}
        {!cargando && reservas.map((reserva) => (
            <div key={reserva.id} className="group bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all duration-300 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${reserva.estado.toLowerCase() === 'confirmada' || reserva.estado.toLowerCase() === 'efectivo' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>

                {/* Info Club */}
                <div className="flex items-center gap-4 w-full md:w-auto pl-2">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border-4 border-slate-50 text-white font-bold text-lg shadow-lg uppercase">
                         {reserva.club ? reserva.club.substring(0,1) : "C"}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">{reserva.club || "Club Desconocido"}</h3>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mt-1 flex items-center gap-1">
                            <MapPin size={12}/> {reserva.cancha}
                        </p>
                    </div>
                </div>

                {/* Fecha y Hora */}
                <div className="flex items-center gap-6 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 w-full md:w-auto justify-center">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">FECHA</p>
                        <p className="font-bold text-slate-800 text-sm flex items-center gap-1"><Calendar size={14} className="text-blue-500"/> {reserva.fecha}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">HORA</p>
                        <p className="font-bold text-slate-800 text-sm flex items-center gap-1"><Clock size={14} className="text-orange-500"/> {reserva.hora}</p>
                    </div>
                </div>

                {/* Precio y Estado */}
                <div className="text-right pl-2">
                    <p className="text-xl font-black text-slate-900">${reserva.precio?.toLocaleString()}</p>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                        {reserva.estado}
                    </span>
                </div>
            </div>
        ))}

      </div>
    </main>
  );
}