"use client";
import { useState, useEffect } from "react";
import { 
  Calendar, User, Phone, ArrowLeft, Search, 
  Trash2, CalendarPlus, RefreshCw, DollarSign, CreditCard, Landmark, Timer, ArrowRight 
} from "lucide-react";
import Link from "next/link";

interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
}

interface Reserva {
  id: number;
  canchaId: number;
  clienteNombre: string;
  clienteTelefono: string;
  fechaInicio: string;
  fechaFin: string;
  metodoPago: string;
}

export default function ReservasPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Filtros
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [canchaId, setCanchaId] = useState<number>(0);

  // 1. Cargar Canchas
  useEffect(() => {
    async function cargarCanchas() {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
        const res = await fetch("https://localhost:7123/api/Canchas"); 
        if (res.ok) {
          const data = await res.json();
          setCanchas(data);
          if (data.length > 0) setCanchaId(data[0].id);
        }
      } catch (error) {
        console.error("Error cargando canchas");
      }
    }
    cargarCanchas();
  }, []);

  // 2. Cargar Reservas
  useEffect(() => {
    if (canchaId === 0) return;
    buscarReservas();
  }, [fecha, canchaId]);

  const buscarReservas = async () => {
    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`https://localhost:7123/api/Reservas/cancha/${canchaId}?fecha=${fecha}`);
      if (res.ok) {
        const data = await res.json();
        // Ordenamos por hora de inicio
        data.sort((a: Reserva, b: Reserva) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
        setReservas(data);
      }
    } catch (error) {
      console.error("Error buscando reservas");
    } finally {
        setCargando(false);
    }
  };

  const handleCancelar = async (id: number) => {
    if (!confirm("¿Seguro que quieres cancelar este turno?")) return;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`https://localhost:7123/api/Reservas/${id}`, { method: "DELETE" });
      if (res.ok) buscarReservas();
    } catch (error) { alert("Error de conexión."); }
  };

  // --- HELPERS ---
  const getDuracion = (inicio: string, fin: string) => {
    const diff = new Date(fin).getTime() - new Date(inicio).getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const minsRestantes = minutos % 60;
    if (horas > 0 && minsRestantes > 0) return `${horas}h ${minsRestantes}m`;
    if (horas > 0) return `${horas} hs`;
    return `${minsRestantes} min`;
  };

  const getPrecioTotal = (inicio: string, fin: string) => {
    const canchaActual = canchas.find(c => c.id === canchaId);
    if (!canchaActual) return 0;
    const diffHoras = (new Date(fin).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60);
    return Math.round(diffHoras * canchaActual.precioPorHora);
  };

  const renderMetodoPago = (metodo: string) => {
    if (metodo === "Efectivo") return <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold"><DollarSign size={12}/> Efectivo</span>;
    if (metodo === "Mercado Pago") return <span className="flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-1 rounded text-xs font-bold"><CreditCard size={12}/> MP/Tarjeta</span>;
    if (metodo === "Transferencia") return <span className="flex items-center gap-1 text-purple-700 bg-purple-100 px-2 py-1 rounded text-xs font-bold"><Landmark size={12}/> Transferencia</span>;
    return <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs font-bold">{metodo || "N/A"}</span>;
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 bg-white border rounded-lg hover:bg-gray-100 text-gray-600 transition">
                <ArrowLeft size={20} />
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Agenda de Turnos</h1>
                <p className="text-gray-500 text-sm">Administración y Caja</p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <Link href="/admin/reservas/crear" className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center gap-2 shadow-sm transition">
                <CalendarPlus size={18} /> Nuevo Turno
            </Link>
            <button onClick={buscarReservas} className="bg-white border text-gray-600 p-2 rounded-lg hover:bg-gray-50 transition">
                <RefreshCw size={20} className={cargando ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Cancha</label>
            <select 
                className="w-full p-2.5 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-black font-medium"
                value={canchaId}
                onChange={(e) => setCanchaId(Number(e.target.value))}
            >
                {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
        </div>
        <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Fecha</label>
            <input 
                type="date" 
                className="w-full p-2.5 bg-gray-50 rounded-lg border border-gray-300 outline-none focus:border-black font-medium"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
            />
        </div>
        <button onClick={buscarReservas} className="bg-black text-white p-3 rounded-lg hover:bg-gray-800 transition">
            <Search size={20} />
        </button>
      </div>

      {/* Lista de Tarjetas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="font-bold text-gray-700">
                Reservas ({reservas.length})
            </h2>
            {reservas.length > 0 && (
                <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    Total a cobrar: ${reservas.reduce((acc, curr) => acc + getPrecioTotal(curr.fechaInicio, curr.fechaFin), 0).toLocaleString()}
                </span>
            )}
        </div>

        {reservas.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                <p>No hay reservas para este día.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reservas.map((reserva) => {
                    // Formateamos AMBOS horarios
                    const horaInicio = new Date(reserva.fechaInicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const horaFin = new Date(reserva.fechaFin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    const duracion = getDuracion(reserva.fechaInicio, reserva.fechaFin);
                    const precio = getPrecioTotal(reserva.fechaInicio, reserva.fechaFin);
                    
                    return (
                      <div key={reserva.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative group">
                          
                          {/* Cabecera Tarjeta: Horarios Completos */}
                          <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                              <div>
                                  <div className="flex items-center gap-2 text-black font-extrabold text-xl">
                                      {horaInicio} <span className="text-gray-300 font-light">-</span> {horaFin}
                                  </div>
                                  <span className="text-gray-400 text-xs font-medium flex items-center gap-1 mt-1">
                                    <Timer size={12}/> {duracion} de juego
                                  </span>
                              </div>
                              
                              <div className="flex gap-2">
                                {/* BOTÓN NUEVO: IR A GESTIÓN DE TURNO */}
                                <Link 
                                    href={`/admin/reservas/${reserva.id}`}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition"
                                    title="Gestionar Turno y Cantina"
                                >
                                    <ArrowRight size={20} />
                                </Link>

                                <button 
                                    onClick={() => handleCancelar(reserva.id)}
                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                    title="Cancelar Turno"
                                >
                                    <Trash2 size={20} />
                                </button>
                              </div>
                          </div>

                          {/* Cuerpo: Cliente */}
                          <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-3 text-gray-800">
                                  <div className="bg-gray-100 p-1.5 rounded text-gray-500"><User size={16} /></div>
                                  <span className="font-semibold capitalize">{reserva.clienteNombre}</span>
                              </div>
                              <div className="flex items-center gap-3 text-gray-600 text-sm">
                                  <div className="bg-gray-100 p-1.5 rounded text-gray-500"><Phone size={16} /></div>
                                  <span>{reserva.clienteTelefono}</span>
                              </div>
                          </div>

                          {/* Footer: Finanzas */}
                          <div className="bg-gray-50 -mx-5 -mb-5 p-4 border-t border-gray-100 flex justify-between items-center rounded-b-xl">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">MÉTODO PAGO</p>
                                    {renderMetodoPago(reserva.metodoPago)}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">A COBRAR</p>
                                    <p className="font-bold text-lg text-gray-900">${precio.toLocaleString()}</p>
                                </div>
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