"use client";
import { useState, useEffect } from "react";
import { Calendar, User, Phone, Clock, ArrowLeft, Search,Plus,Trash2 } from "lucide-react";
import Link from "next/link";
import { Cancha, Reserva } from "../../types"; // Importamos los moldes


export default function ReservasPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  
  // Filtros: Por defecto HOY y la primera cancha
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]); // Formato YYYY-MM-DD
  const [canchaId, setCanchaId] = useState<number>(0);

  // 1. Cargar la lista de Canchas al entrar
  useEffect(() => {
    async function cargarCanchas() {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
        const res = await fetch("https://localhost:7123/api/Canchas"); // ⚠️ Revisa el puerto
        if (res.ok) {
          const data = await res.json();
          setCanchas(data);
          if (data.length > 0) setCanchaId(data[0].id); // Seleccionar la primera por defecto
        }
      } catch (error) {
        console.error("Error cargando canchas");
      }
    }
    cargarCanchas();
  }, []);

  // 2. Cargar Reservas cuando cambie la Fecha o la Cancha
  useEffect(() => {
    if (canchaId === 0) return;
    buscarReservas();
  }, [fecha, canchaId]);

  const buscarReservas = async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      // Llamamos al endpoint: /api/Reservas/cancha/1?fecha=2025-10-20
      const res = await fetch(`https://localhost:7123/api/Reservas/cancha/${canchaId}?fecha=${fecha}`);
      if (res.ok) {
        const data = await res.json();
        setReservas(data);
      }
    } catch (error) {
      console.error("Error buscando reservas");
    }
  };
  // Función para Cancelar Turno
  const handleCancelar = async (id: number) => {
    if (!confirm("¿Seguro que quieres cancelar este turno? Se liberará el horario.")) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`https://localhost:7123/api/Reservas/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Recargamos la lista para ver el hueco libre
        buscarReservas();
      } else {
        alert("Error al cancelar.");
      }
    } catch (error) {
      alert("Error de conexión.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      {/* Cabecera de la lista */}
    <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-gray-700 text-lg">
            Turnos del día ({reservas.length})
        </h2>
        <Link href="/admin/reservas/crear" className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-1 transition">
            <Plus size={16} /> Nuevo Turno
        </Link>
    </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
        
        {/* Selector de Cancha */}
        <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Cancha</label>
            <select 
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                value={canchaId}
                onChange={(e) => setCanchaId(Number(e.target.value))}
            >
                {canchas.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
            </select>
        </div>

        {/* Selector de Fecha */}
        <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input 
                type="date" 
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
            />
        </div>

        <button onClick={buscarReservas} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition">
            <Search size={24} />
        </button>
      </div>

      {/* Lista de Reservas */}
      <div className="space-y-4">
        <h2 className="font-bold text-gray-700 text-lg">
            Turnos del día ({reservas.length})
        </h2>

        {reservas.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
                <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                <p>No hay reservas para este día.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reservas.map((reserva) => {
                    const horaInicio = new Date(reserva.fechaInicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const horaFin = new Date(reserva.fechaFin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    return (
                      <div key={reserva.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500 flex flex-col gap-3 group relative">
                          
                          {/* --- CAMBIO AQUÍ: Cabecera con Hora y Botón Borrar --- */}
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2 text-blue-700 font-bold text-lg">
                                  <Clock size={20} />
                                  {horaInicio} - {horaFin}
                              </div>
                              
                              {/* Botón Borrar (Conectado a tu función handleCancelar) */}
                              <button 
                                  onClick={() => handleCancelar(reserva.id)}
                                  className="text-gray-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded-full"
                                  title="Cancelar Turno"
                              >
                                  <Trash2 size={20} />
                              </button>
                          </div>

                          <div className="h-px bg-gray-100"></div>
                          
                          <div className="flex items-center gap-2 text-gray-700">
                              <User size={18} className="text-gray-400" />
                              <span className="font-medium">{reserva.clienteNombre}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <Phone size={16} />
                              <span>{reserva.clienteTelefono}</span>
                          </div>
                      </div>
                    )
                })}
            </div>
        )}
      </div>

    </main>
  );
}