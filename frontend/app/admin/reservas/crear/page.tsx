"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Save, ArrowLeft, CalendarPlus, DollarSign, Clock, CheckCircle, 
    Hourglass, Smartphone, Repeat, CalendarDays, AlertCircle, X 
} from "lucide-react";
import Link from "next/link";
import { API_URL } from '@/utils/config';

interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
  horaApertura: number;
  horaCierre: number;
}

interface ReservaExistente {
  fechaInicio: string;
  fechaFin: string;
}

const DURACIONES = [
    { label: "1 Hora", minutos: 60 },
    { label: "1 Hora 30 min", minutos: 90 },
    { label: "2 Horas", minutos: 120 },
    { label: "2 Horas 30 min", minutos: 150 },
    { label: "3 Horas", minutos: 180 },
];

export default function CrearReservaAdmin() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservasDelDia, setReservasDelDia] = useState<ReservaExistente[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // 🟢 SISTEMA DE NOTIFICACIONES
  const [notificacion, setNotificacion] = useState<{ tipo: 'error' | 'exito', msj: string } | null>(null);

  const mostrarMensaje = (tipo: 'error' | 'exito', msj: string) => {
      setNotificacion({ tipo, msj });
      setTimeout(() => setNotificacion(null), 4000);
  };

  // --- ESTADOS DE FORMULARIO ---
  const hoyLocal = new Date();
  const fechaLocalStr = `${hoyLocal.getFullYear()}-${String(hoyLocal.getMonth() + 1).padStart(2, '0')}-${String(hoyLocal.getDate()).padStart(2, '0')}`;

  const [form, setForm] = useState({
    canchaId: "",
    clienteNombre: "",
    clienteTelefono: "",
    fecha: fechaLocalStr,
    horaInicio: "", 
    horaFin: "",
    duracionMinutos: 90,
    metodoPago: "Efectivo"
  });

  // --- ESTADOS PARA FIJOS ---
  const [esFijo, setEsFijo] = useState(false);
  const [fechaFinFijo, setFechaFinFijo] = useState("");
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  
  const diasSemana = [
    { id: 1, label: "Lunes" }, { id: 2, label: "Martes" }, { id: 3, label: "Miérc" },
    { id: 4, label: "Jueves" }, { id: 5, label: "Viernes" }, { id: 6, label: "Sáb" }, { id: 0, label: "Dom" }
  ];

  // 1. CARGAR CANCHAS
  useEffect(() => {
    const userId = localStorage.getItem("usuarioId");
    if (!userId) {
        router.push("/admin/login");
        return;
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    fetch(`${API_URL}/api/Canchas?usuarioId=${userId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setCanchas(data))
      .catch(err => console.error(err));
  }, [router]);

  // 2. CARGAR OCUPACIÓN
  useEffect(() => {
    if (form.canchaId && form.fecha) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        fetch(`${API_URL}/api/Reservas/cancha/${form.canchaId}?fecha=${form.fecha}`)
            .then(res => res.json())
            .then((data: any[]) => {
                const ocupados = data.map(r => ({
                    fechaInicio: r.fechaInicio,
                    fechaFin: r.fechaFin
                }));
                setReservasDelDia(ocupados);
            })
            .catch(err => console.error(err));
    }
  }, [form.canchaId, form.fecha]);

  // --- LOGICA GRILLA ---
  const canchaSeleccionada = canchas.find(c => c.id === Number(form.canchaId));

  const generarGrillaHorarios = () => {
    if (!canchaSeleccionada) return [];
    let horarios = [];
    let inicioMinutos = canchaSeleccionada.horaApertura * 60; 
    let finMinutos = canchaSeleccionada.horaCierre * 60;      
    if (finMinutos <= inicioMinutos) finMinutos += 24 * 60;

    for (let tiempo = inicioMinutos; tiempo < finMinutos; tiempo += 30) {
        let tiempoNormalizado = tiempo % (24 * 60);
        let horas = Math.floor(tiempoNormalizado / 60);
        let minutos = tiempoNormalizado % 60;
        let horaStr = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        horarios.push(horaStr);
    }
    return horarios;
  };

  const verificarSiEstaOcupado = (horaStr: string) => {
    if (!canchaSeleccionada) return false;
    const [horas, minutos] = horaStr.split(':').map(Number);
    const fechaBase = new Date(`${form.fecha}T00:00:00`); 
    if (horas < canchaSeleccionada.horaApertura && canchaSeleccionada.horaCierre < canchaSeleccionada.horaApertura) {
        fechaBase.setDate(fechaBase.getDate() + 1);
    }
    fechaBase.setHours(horas, minutos, 0, 0);
    const tiempoBoton = fechaBase.getTime();

    return reservasDelDia.some(reserva => {
        const inicioReserva = new Date(reserva.fechaInicio).getTime();
        const finReserva = new Date(reserva.fechaFin).getTime();
        return tiempoBoton >= inicioReserva && tiempoBoton < finReserva;
    });
  };

  const actualizarHorarios = (nuevaHoraInicio?: string, nuevaDuracion?: number) => {
    let currentInicio = nuevaHoraInicio !== undefined ? nuevaHoraInicio : form.horaInicio;
    let currentDuracion = nuevaDuracion !== undefined ? nuevaDuracion : form.duracionMinutos;

    if (!currentInicio) {
        setForm(prev => ({ ...prev, duracionMinutos: currentDuracion }));
        return;
    }

    const fechaBase = new Date(`${form.fecha}T${currentInicio}:00`);
    fechaBase.setMinutes(fechaBase.getMinutes() + currentDuracion);
    
    const hours = fechaBase.getHours().toString().padStart(2, '0');
    const minutes = fechaBase.getMinutes().toString().padStart(2, '0');
    const horaFinStr = `${hours}:${minutes}`;

    setForm(prev => ({ 
        ...prev, 
        horaInicio: currentInicio, 
        duracionMinutos: currentDuracion, 
        horaFin: horaFinStr 
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleDia = (dia: number) => {
    if (diasSeleccionados.includes(dia)) setDiasSeleccionados(diasSeleccionados.filter(d => d !== dia));
    else setDiasSeleccionados([...diasSeleccionados, dia]);
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.canchaId || !form.horaInicio) {
        mostrarMensaje('error', "⚠️ Por favor selecciona una cancha y un horario.");
        return;
    }
    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        const fechaInicioISO = `${form.fecha}T${form.horaInicio}:00`;
        const fechaBaseObj = new Date(fechaInicioISO);
        const fechaFinObj = new Date(fechaBaseObj.getTime() + form.duracionMinutos * 60000);
        
        const toLocalISO = (date: Date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, -1);
        };

        if (esFijo) {
            // MODO FIJO
            if (diasSeleccionados.length === 0 || !fechaFinFijo) {
                mostrarMensaje('error', "Para turnos fijos, selecciona los días y la fecha límite.");
                setCargando(false);
                return;
            }

            const bodyFijo = {
                canchaId: Number(form.canchaId),
                clienteNombre: form.clienteNombre,
                clienteTelefono: form.clienteTelefono,
                fechaInicio: new Date(form.fecha),
                fechaFin: new Date(fechaFinFijo),
                horaInicio: toLocalISO(fechaBaseObj),
                horaFin: toLocalISO(fechaFinObj),
                diasSemana: diasSeleccionados,
                precioPorTurno: 0
            };

            const res = await fetch(`${API_URL}/api/Reservas/fija`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyFijo)
            });

            if (res.ok) {
                const data = await res.json();
                mostrarMensaje('exito', `✅ ${data.mensaje}`);
                setTimeout(() => router.push("/admin/reservas"), 2000);
            } else {
                // 🟢 LIMPIEZA DE MENSAJE DE ERROR
                try {
                    const errorJson = await res.json();
                    mostrarMensaje('error', errorJson.mensaje || "Error al crear turno fijo.");
                } catch {
                    const errorText = await res.text();
                    mostrarMensaje('error', errorText);
                }
            }

        } else {
            // MODO SIMPLE
            const nuevaReserva = {
                canchaId: Number(form.canchaId),
                clienteNombre: form.clienteNombre,
                clienteTelefono: form.clienteTelefono,
                fechaInicio: fechaInicioISO,
                fechaFin: toLocalISO(fechaFinObj),
                metodoPago: form.metodoPago
            };

            const res = await fetch(`${API_URL}/api/Reservas`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nuevaReserva)
            });

            if (res.ok) {
                mostrarMensaje('exito', "✅ Turno registrado con éxito");
                setTimeout(() => router.push("/admin/reservas"), 2000);
            } else {
                // 🟢 LIMPIEZA DE MENSAJE DE ERROR
                try {
                    const errorJson = await res.json();
                    // Si el backend devuelve {"mensaje": "Error..."}, usamos eso.
                    mostrarMensaje('error', errorJson.mensaje || "Error al crear reserva.");
                } catch {
                    // Si devuelve texto plano, usamos eso.
                    const errorText = await res.text();
                    mostrarMensaje('error', errorText);
                }
            }
        }
    } catch (error) {
        mostrarMensaje('error', "Error de conexión con el servidor.");
    } finally {
        setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-start relative">
      
      {/* 🔔 NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 border ${
              notificacion.tipo === 'error' 
                ? 'bg-red-50 text-red-800 border-red-200' 
                : 'bg-green-50 text-green-800 border-green-200'
          }`}>
              {notificacion.tipo === 'error' ? <AlertCircle size={24} className="text-red-600"/> : <CheckCircle size={24} className="text-green-600"/>}
              <div>
                  <h4 className="font-black text-sm uppercase">{notificacion.tipo === 'error' ? 'Error' : 'Éxito'}</h4>
                  <p className="font-medium text-sm">{notificacion.msj}</p>
              </div>
              <button onClick={() => setNotificacion(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={18}/></button>
          </div>
      )}

      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mt-6">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8 border-b pb-4">
            <Link href="/admin/reservas" className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    Nueva Reserva
                </h1>
                <p className="text-sm text-gray-500">Sistema de Grilla Inteligente</p>
            </div>
            <div className="ml-auto bg-black p-3 rounded-full text-white shadow-lg">
                <CalendarPlus size={24} />
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. DATOS PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Seleccionar Cancha</label>
                    <select name="canchaId" className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white font-bold text-lg"
                        value={form.canchaId}
                        onChange={(e) => setForm({...form, canchaId: e.target.value, horaInicio: ""})} required>
                        <option value="">-- Toca para elegir --</option>
                        {canchas.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre} (Cierra {c.horaCierre}:00hs)</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nombre Cliente</label>
                    <input type="text" name="clienteNombre" required className="w-full border p-3 rounded-xl focus:ring-black outline-none"
                        placeholder="Ej: Juan Pérez" value={form.clienteNombre} onChange={handleChange}/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Teléfono</label>
                    <input type="tel" name="clienteTelefono" required className="w-full border p-3 rounded-xl focus:ring-black outline-none"
                        placeholder="Ej: 3794..." value={form.clienteTelefono} onChange={handleChange}/>
                </div>
            </div>

            {/* 2. FECHA Y HORARIO */}
            <div className="border-t pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Clock size={18} /> 2. Elige Horario y Duración
                    </h3>
                    <div className="flex gap-2">
                        <input type="date" name="fecha" required className="border border-gray-300 p-2 rounded-lg text-sm font-bold"
                            value={form.fecha} onChange={handleChange}/>
                        <div className="relative">
                            <Hourglass size={16} className="absolute left-3 top-3 text-gray-500"/>
                            <select className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white focus:border-black outline-none appearance-none"
                                value={form.duracionMinutos} onChange={(e) => actualizarHorarios(undefined, Number(e.target.value))}>
                                {DURACIONES.map(d => <option key={d.minutos} value={d.minutos}>{d.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {!form.canchaId ? (
                    <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">Selecciona una cancha arriba 👆</div>
                ) : (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        {form.horaInicio && (
                            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <span className="text-sm font-bold">Reserva: {form.horaInicio} a {form.horaFin}</span>
                                <CheckCircle size={18}/>
                            </div>
                        )}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {generarGrillaHorarios().map((horaStr) => {
                                const esSeleccionado = form.horaInicio === horaStr;
                                const estaOcupado = verificarSiEstaOcupado(horaStr);
                                return (
                                    <button key={horaStr} type="button" disabled={estaOcupado} onClick={() => actualizarHorarios(horaStr)}
                                        className={`p-3 rounded-lg border text-sm font-bold transition relative overflow-hidden flex items-center justify-center ${estaOcupado ? 'bg-red-500 text-white border-red-600 cursor-not-allowed opacity-90' : esSeleccionado ? 'bg-black text-white border-black shadow-lg scale-105 z-10' : 'bg-white text-gray-700 border-gray-200 hover:border-black hover:shadow-md'}`}>
                                        {estaOcupado ? <span className="line-through decoration-2 decoration-white/50 text-xs">{horaStr}</span> : horaStr}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 🟢 3. SECCIÓN DE TURNO FIJO */}
            <div className={`p-5 rounded-2xl border transition-all duration-300 ${esFijo ? 'bg-indigo-50 border-indigo-200 shadow-inner ring-1 ring-indigo-200' : 'bg-white border-gray-200'}`}>
                <label className="flex items-center gap-3 font-bold text-gray-800 cursor-pointer select-none">
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${esFijo ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${esFijo ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                    <input type="checkbox" className="hidden" checked={esFijo} onChange={e => setEsFijo(e.target.checked)}/>
                    <span className="flex items-center gap-2 text-lg"><Repeat size={20} className={esFijo ? "text-indigo-600" : "text-gray-400"}/> Repetir (Turno Fijo)</span>
                </label>

                {esFijo && (
                    <div className="mt-5 space-y-5 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-3 items-start bg-indigo-100/50 p-3 rounded-lg text-indigo-800 text-sm">
                            <AlertCircle size={20} className="shrink-0"/>
                            <p>Se crearán reservas automáticas para los días elegidos. Todas nacerán como <strong>"Pendiente de Pago"</strong>.</p>
                        </div>

                        <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase mb-2 block tracking-wider">Se repite los días:</span>
                            <div className="flex flex-wrap gap-2">
                                {diasSemana.map(dia => (
                                    <button key={dia.id} type="button" onClick={() => toggleDia(dia.id)}
                                        className={`w-10 h-10 rounded-full text-sm font-bold transition flex items-center justify-center border ${diasSeleccionados.includes(dia.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-110' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
                                        {dia.label.substring(0,1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase mb-1 block tracking-wider">Repetir hasta la fecha:</span>
                            <div className="relative max-w-xs">
                                <CalendarDays className="absolute left-3 top-2.5 text-indigo-400" size={18}/>
                                <input type="date" className="w-full pl-10 p-2 border border-indigo-200 rounded-lg text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
                                    value={fechaFinFijo} onChange={e => setFechaFinFijo(e.target.value)}/>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. PAGO (Solo visible si NO es fijo) */}
            {!esFijo && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Forma de Pago Inicial</label>
                    <div className="grid grid-cols-2 gap-4">
                        {["Efectivo", "Transferencia"].map((metodo) => (
                            <label key={metodo} className={`cursor-pointer border rounded-xl p-4 text-center transition flex flex-col items-center gap-1 select-none hover:shadow-md ${form.metodoPago === metodo ? "bg-black text-white border-black ring-2 ring-offset-1 ring-black" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                                <input type="radio" name="metodoPago" value={metodo} checked={form.metodoPago === metodo} onChange={handleChange} className="hidden"/>
                                <span className="font-bold text-lg">{metodo}</span>
                                {metodo === "Efectivo" ? <DollarSign size={20} /> : <Smartphone size={20} />}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* BOTÓN FINAL */}
            <button type="submit" disabled={cargando} className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 text-white shadow-lg transition transform active:scale-95 ${cargando ? "bg-gray-400 cursor-not-allowed" : esFijo ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                {cargando ? "Procesando..." : <><Save size={20} /> {esFijo ? "Generar Turnos Fijos" : "Guardar Reserva"}</>}
            </button>
        </form>
      </div>
    </div>
  );
}