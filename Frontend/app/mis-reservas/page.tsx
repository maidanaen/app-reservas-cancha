"use client";
import { useState } from "react";
import { Search, Calendar, Clock, MapPin, Phone, ArrowLeft, Frown } from "lucide-react";
import Link from "next/link";
import { Reserva } from "../types"; // Asegúrate de importar tus tipos

export default function MisReservasPage() {
  const [telefono, setTelefono] = useState("");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [buscado, setBuscado] = useState(false); // Para saber si ya intentó buscar
  const [cargando, setCargando] = useState(false);

  const buscarTurnos = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!telefono) return;

    setCargando(true);
    setBuscado(false);
    
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      // ⚠️ Revisa que el puerto 7123 sea el tuyo
      const res = await fetch(`https://localhost:7123/api/Reservas/cliente/${telefono}`);
      if (res.ok) {
        const data = await res.json();
        setReservas(data);
      } else {
        setReservas([]);
      }
    } catch (error) {
      console.error("Error al buscar");
      setReservas([]);
    } finally {
      setCargando(false);
      setBuscado(true);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
            <Link href="/" className="text-gray-500 hover:text-green-600">
                <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Mis Reservas 🎾</h1>
        </div>

        {/* Buscador */}
        <form onSubmit={buscarTurnos} className="flex gap-2">
            <input 
                type="tel" 
                placeholder="Ingresa tu teléfono..." 
                className="flex-1 p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-700"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
            />
            <button 
                type="submit"
                disabled={cargando}
                className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition disabled:opacity-50"
            >
                <Search size={24} />
            </button>
        </form>
      </div>

      {/* Resultados */}
      <div className="px-6 space-y-4">
        
        {cargando && <p className="text-center text-gray-500 animate-pulse">Buscando turnos...</p>}

        {!cargando && buscado && reservas.length === 0 && (
            <div className="text-center p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
                <Frown size={48} className="mx-auto mb-2 opacity-50" />
                <p>No encontramos reservas para este teléfono.</p>
            </div>
        )}

        {reservas.map((reserva) => {
            const fechaObj = new Date(reserva.fechaInicio);
            // Formatear fecha bonito: "Lunes 20 de Octubre"
            const fechaTexto = fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
            
            const horaInicio = new Date(reserva.fechaInicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const horaFin = new Date(reserva.fechaFin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            return (
                <div key={reserva.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-green-500 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div>
                            {/* OJO: Aquí intentamos acceder a reserva.cancha.nombre. 
                                Si tu 'type' Reserva no tiene 'cancha', te dará error en TS. 
                                Ver nota abajo. */}
                            <h3 className="font-bold text-gray-800 text-lg">
                                {reserva.cancha ? reserva.cancha.nombre : "Cancha Reservada"}
                            </h3>
                            <p className="text-green-600 font-medium flex items-center gap-1 text-sm">
                                <Calendar size={14} /> {fechaTexto}
                            </p>
                        </div>
                        <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg font-bold text-sm">
                            {horaInicio}
                        </div>
                    </div>

                    <div className="h-px bg-gray-100"></div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <Clock size={16} /> Duración: {horaInicio} - {horaFin}
                        </div>
                        {/* Estado simulado */}
                        <span className="text-blue-600 font-medium">Confirmada</span>
                    </div>
                </div>
            );
        })}
      </div>
    </main>
  );
}