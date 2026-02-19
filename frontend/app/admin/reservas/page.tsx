"use client";
import { useState, useEffect } from "react";
import { 
  Calendar, User, Phone, ArrowLeft, Search, 
  Trash2, CalendarPlus, RefreshCw, Timer, ArrowRight, CheckCircle,
  MessageCircle, AlertCircle, X 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { API_URL } from '@/utils/config';

interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
}

interface Consumo {
    precio: number;
}

interface Reserva {
  id: number;
  canchaId: number;
  clienteNombre: string;
  clienteTelefono: string;
  fechaInicio: string;
  fechaFin: string;
  metodoPago: string; 
  cobradoEfectivo: number;
  cobradoTransferencia: number;
  consumos: Consumo[];
}

export default function ReservasPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(false);
  const router = useRouter(); 
  
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [canchaId, setCanchaId] = useState<number>(0);

  // 🟢 ESTADOS MODAL ELIMINAR Y NOTIFICACIONES
  const [reservaAEliminar, setReservaAEliminar] = useState<number | null>(null);
  const [notificacion, setNotificacion] = useState<{ tipo: 'error' | 'exito', msj: string } | null>(null);

  const mostrarMensaje = (tipo: 'error' | 'exito', msj: string) => {
      setNotificacion({ tipo, msj });
      setTimeout(() => setNotificacion(null), 4000);
  };

  useEffect(() => {
    async function cargarCanchas() {
      const userId = localStorage.getItem("usuarioId");
      if (!userId) {
          router.push("/admin/login");
          return;
      }

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
        const res = await fetch(`${API_URL}/api/Canchas?usuarioId=${userId}`);
        
        if (res.ok) {
          const data = await res.json();
          setCanchas(data);
          if (data.length > 0) setCanchaId(data[0].id);
        }
      } catch (error) { console.error("Error cargando canchas"); }
    }
    cargarCanchas();
  }, [router]);

  useEffect(() => {
    if (canchaId === 0) return;
    buscarReservas();
  }, [fecha, canchaId]);

  const buscarReservas = async () => {
    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`${API_URL}/api/Reservas/cancha/${canchaId}?fecha=${fecha}`);
      if (res.ok) {
        const data = await res.json();
        
        const soloJuegos = data.filter((r: any) => r.clienteNombre !== "🍻 VENTAS BARRA");
        soloJuegos.sort((a: any, b: any) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
        
        setReservas(soloJuegos);
      }
    } catch (error) {
      console.error("Error buscando reservas");
    } finally { setCargando(false); }
  };

  // FUNCIÓN WHATSAPP INTELIGENTE
  const abrirWhatsApp = (telefono: string) => {
      if (!telefono || telefono.length < 5) return;
      
      const limpio = telefono.replace(/\D/g, "");
      const numeroFinal = limpio.length === 10 ? `549${limpio}` : limpio;

      const url = `https://wa.me/${numeroFinal}`;
      window.open(url, "_blank");
  };

  // 🟢 LÓGICA MODAL CANCELAR TURNO
  const iniciarEliminar = (id: number) => {
      setReservaAEliminar(id);
  };

  const confirmarCancelar = async () => {
    if (!reservaAEliminar) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`${API_URL}/api/Reservas/${reservaAEliminar}`, { method: "DELETE" });
      if (res.ok) {
          mostrarMensaje('exito', '🗑️ El turno ha sido cancelado.');
          buscarReservas();
      } else {
          mostrarMensaje('error', 'No se pudo cancelar el turno.');
      }
    } catch (error) { 
        mostrarMensaje('error', 'Error de conexión con el servidor.');
    } finally {
        setReservaAEliminar(null);
    }
  };

  const getDuracion = (inicio: string, fin: string) => {
    const diff = new Date(fin).getTime() - new Date(inicio).getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(minutos / 60);
    const minsRestantes = minutos % 60;
    if (horas > 0 && minsRestantes > 0) return `${horas}h ${minsRestantes}m`;
    if (horas > 0) return `${horas} hs`;
    return `${minsRestantes} min`;
  };

  const renderEstadoPago = (reserva: Reserva) => {
      const canchaActual = canchas.find(c => c.id === canchaId);
      let totalDeuda = 0;
      if (canchaActual) {
        const diffHoras = (new Date(reserva.fechaFin).getTime() - new Date(reserva.fechaInicio).getTime()) / (1000 * 60 * 60);
        const precioCancha = Math.round(diffHoras * canchaActual.precioPorHora);
        const consumos = reserva.consumos || [];
        const totalCantina = consumos.reduce((acc, curr) => acc + curr.precio, 0);
        totalDeuda = precioCancha + totalCantina;
      }

      const totalPagado = (reserva.cobradoEfectivo || 0) + (reserva.cobradoTransferencia || 0);
      const saldo = totalDeuda - totalPagado;

      if (saldo <= 0) {
          return (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-green-200">
                  <CheckCircle size={16} className="text-green-600"/>
                  <span className="text-xs font-black uppercase tracking-wide">PAGADO</span>
              </div>
          );
      }

      return (
          <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">A COBRAR</p>
              <p className="font-bold text-lg text-red-600">${saldo.toLocaleString()}</p>
          </div>
      );
  };

  return (
    <main className="max-w-7xl mx-auto p-6 font-sans bg-gray-50 min-h-screen relative">
      
      {/* 🔔 NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
          <div className={`fixed top-6 right-6 z-[70] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 border ${
              notificacion.tipo === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'
          }`}>
              {notificacion.tipo === 'error' ? <AlertCircle size={24} className="text-red-600"/> : <CheckCircle size={24} className="text-green-600"/>}
              <div>
                  <h4 className="font-black text-sm uppercase">{notificacion.tipo === 'error' ? 'Error' : 'Éxito'}</h4>
                  <p className="font-medium text-sm">{notificacion.msj}</p>
              </div>
              <button onClick={() => setNotificacion(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={18}/></button>
          </div>
      )}

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
                {canchas.length === 0 && <option>No tienes canchas creadas</option>}
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
            <h2 className="font-bold text-gray-700">Reservas ({reservas.length})</h2>
        </div>

        {reservas.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
                <p>No hay reservas para este día.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reservas.map((reserva) => {
                    const horaInicio = new Date(reserva.fechaInicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const horaFin = new Date(reserva.fechaFin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const duracion = getDuracion(reserva.fechaInicio, reserva.fechaFin);
                    
                    return (
                      <div key={reserva.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition relative group">
                          
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
                                <Link 
                                    href={`/admin/reservas/${reserva.id}`}
                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition"
                                    title="Gestionar Turno"
                                >
                                    <ArrowRight size={20} />
                                </Link>
                                <button 
                                    onClick={() => iniciarEliminar(reserva.id)}
                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                    title="Cancelar Turno"
                                >
                                    <Trash2 size={20} />
                                </button>
                              </div>
                          </div>

                          <div className="space-y-3 mb-4">
                              {/* NOMBRE DEL CLIENTE */}
                              <div className="flex items-center gap-3 text-gray-800">
                                  <div className="bg-gray-100 p-1.5 rounded text-gray-500"><User size={16} /></div>
                                  <span className="font-semibold capitalize">{reserva.clienteNombre}</span>
                              </div>
                              
                              {/* BOTÓN DE WHATSAPP MEJORADO */}
                              <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => abrirWhatsApp(reserva.clienteTelefono)}
                                    className="flex-1 flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-2 rounded-lg transition border border-green-200 group/wa"
                                    title="Enviar mensaje por WhatsApp"
                                  >
                                      <MessageCircle size={16} className="text-green-600"/>
                                      <span className="text-sm font-bold truncate">
                                        {reserva.clienteTelefono || "Sin teléfono"}
                                      </span>
                                  </button>
                              </div>
                          </div>

                          <div className="bg-gray-50 -mx-5 -mb-5 p-4 border-t border-gray-100 flex justify-between items-center rounded-b-xl">
                                <div className="flex flex-col gap-1">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ESTADO</p>
                                    <span className="text-xs font-bold text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 inline-block w-max">
                                        {reserva.metodoPago === "Sin especificar" ? "Pendiente" : reserva.metodoPago}
                                    </span>
                                </div>
                                {renderEstadoPago(reserva)}
                          </div>
                      </div>
                    )
                })}
            </div>
        )}

        {/* 🟢 MODAL ELIMINAR RESERVA */}
        {reservaAEliminar && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-red-500">
                    <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={32}/>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">¿Cancelar Turno?</h3>
                    <p className="text-gray-500 mb-6 text-sm">Esta acción liberará el horario para otros clientes inmediatamente y no se puede deshacer.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setReservaAEliminar(null)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-gray-100 rounded-xl transition">Volver</button>
                        <button onClick={confirmarCancelar} className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl shadow-lg transition">Sí, Cancelar</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </main>
  );
}