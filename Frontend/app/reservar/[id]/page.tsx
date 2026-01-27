"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Clock, User, Phone, CheckCircle, CreditCard, Banknote, Landmark, ArrowRight, ArrowLeft, Grid, Timer } from "lucide-react";
import Link from "next/link";

interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
}

interface ReservaExistente {
  fechaInicio: string; // ISO String
  fechaFin: string;    // ISO String
}

export default function ReservarPage() {
  const { id } = useParams();
  const router = useRouter();

  // --- ESTADOS ---
  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [reservasDelDia, setReservasDelDia] = useState<ReservaExistente[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Control de Pasos
  const [paso, setPaso] = useState(1);

  // Configuración de la Reserva
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [duracionSeleccionada, setDuracionSeleccionada] = useState(60); // En minutos (60, 90, 120)
  
  // Formulario Final
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    metodoPago: "Mercado Pago"
  });

  // 1. Cargar Datos de la Cancha
  useEffect(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    fetch(`https://localhost:7123/api/Canchas/${id}`)
      .then((res) => res.json())
      .then((data) => setCancha(data))
      .catch((err) => console.error(err));
  }, [id]);

  // 2. Cargar Reservas OCUPADAS cuando cambia la fecha
  useEffect(() => {
    const cargarOcupadas = async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            // Usamos el endpoint que busca por cancha y fecha
            const res = await fetch(`https://localhost:7123/api/Reservas/cancha/${id}?fecha=${fechaSeleccionada}`);
            if (res.ok) {
                const data = await res.json();
                setReservasDelDia(data);
            }
        } catch (error) {
            console.error("Error cargando disponibilidad");
        }
    };
    cargarOcupadas();
  }, [id, fechaSeleccionada]);


  // --- LÓGICA DE HORARIOS ---
  
  // Generar lista de horarios cada 30 minutos (de 08:00 a 23:00)
  const generarGrillaHorarios = () => {
    const horarios = [];
    let horaActual = 8; // Empieza 8 AM
    let minutoActual = 0;

    while (horaActual < 23) { // Hasta las 23 PM
        const horaStr = horaActual.toString().padStart(2, '0');
        const minStr = minutoActual.toString().padStart(2, '0');
        horarios.push(`${horaStr}:${minStr}`);

        // Sumar 30 minutos
        minutoActual += 30;
        if (minutoActual === 60) {
            minutoActual = 0;
            horaActual += 1;
        }
    }
    return horarios;
  };

  // VERIFICAR SI UN HORARIO ESTÁ DISPONIBLE
  const verificarDisponibilidad = (horaInicioStr: string) => {
    // 1. Convertir la hora del botón a objeto Date
    const inicioCandidato = new Date(`${fechaSeleccionada}T${horaInicioStr}:00`);
    // 2. Calcular cuándo terminaría esa reserva según la duración elegida (60, 90 min...)
    const finCandidato = new Date(inicioCandidato.getTime() + duracionSeleccionada * 60000);

    // 3. Revisar si choca con alguna reserva existente
    for (const reserva of reservasDelDia) {
        const ocupadoInicio = new Date(reserva.fechaInicio);
        const ocupadoFin = new Date(reserva.fechaFin);

        // Lógica de colisión de rangos de tiempo
        // (Si el candidato empieza antes de que termine el ocupado Y termina después de que empiece el ocupado)
        if (inicioCandidato < ocupadoFin && finCandidato > ocupadoInicio) {
            return false; // ESTÁ OCUPADO
        }
    }
    return true; // ESTÁ LIBRE
  };

  const seleccionarHorario = (hora: string) => {
    setHoraSeleccionada(hora);
    setPaso(2);
  };

  // --- CONFIRMAR RESERVA ---
  const handleReservar = async () => {
    setCargando(true);
    
    // Calcular fechas exactas
    const inicioDate = new Date(`${fechaSeleccionada}T${horaSeleccionada}:00`);
    const finDate = new Date(inicioDate.getTime() + duracionSeleccionada * 60000); // Sumar minutos

    // Ajuste de zona horaria local a ISO (simple)
    // Nota: Para producción idealmente usar librerías como 'date-fns' o manejar UTC
    const isoString = (d: Date) => {
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return d.getFullYear() + '-' + 
            pad(d.getMonth() + 1) + '-' + 
            pad(d.getDate()) + 'T' + 
            pad(d.getHours()) + ':' + 
            pad(d.getMinutes()) + ':00';
    };

    const nuevaReserva = {
      canchaId: Number(id),
      clienteNombre: form.nombre,
      clienteTelefono: form.telefono,
      fechaInicio: isoString(inicioDate),
      fechaFin: isoString(finDate),
      metodoPago: form.metodoPago
    };

    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const res = await fetch("https://localhost:7123/api/Reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevaReserva),
      });

      if (res.ok) {
        const data = await res.json();
        if (form.metodoPago === "Mercado Pago" && data.urlPago) {
            // Calcular precio proporcional a la duración
            // Esto asume que el backend recalculó el precio o generó el link base.
            // Si tu backend no ajusta precio por duración, enviará el precio por hora.
             window.location.href = data.urlPago;
        } else {
            router.push(`/reservar/exito?pago=${form.metodoPago}`);
        }
      } else {
        alert("❌ Ups, alguien te ganó el turno justo ahora.");
        // Recargar disponibilidad
        const resRefresh = await fetch(`https://localhost:7123/api/Reservas/cancha/${id}?fecha=${fechaSeleccionada}`);
        const dataRefresh = await resRefresh.json();
        setReservasDelDia(dataRefresh);
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  if (!cancha) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center items-start p-6">
      <div className="bg-white max-w-2xl w-full rounded-3xl shadow-xl overflow-hidden mt-6">
        
        {/* --- PASO 1: CALENDARIO Y HORARIOS --- */}
        {paso === 1 && (
            <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Grid className="text-blue-600"/> Elegí tu Horario
                    </h1>
                    <Link href="/" className="text-sm text-gray-500 hover:text-black">Cancelar</Link>
                </div>

                {/* CONTROLES: FECHA Y DURACIÓN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Fecha</label>
                        <input 
                            type="date" 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                            value={fechaSeleccionada}
                            onChange={(e) => setFechaSeleccionada(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">Duración</label>
                        <div className="relative">
                            <select 
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                value={duracionSeleccionada}
                                onChange={(e) => setDuracionSeleccionada(Number(e.target.value))}
                            >
                                <option value={60}>1 Hora</option>
                                <option value={90}>1 Hora y media (90 min)</option>
                                <option value={120}>2 Horas</option>
                                <option value={150}>2 Horas y media (150 min)</option>
                                <option value={180}>3 Horas</option>
                                <option value={210}>3 Horas y media (210 min)</option>
                                <option value={240}>4 Horas</option>
                            </select>
                            <Timer className="absolute right-3 top-3 text-gray-400" size={20}/>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 my-4"></div>

                {/* GRILLA DE HORARIOS INTELIGENTE */}
                <p className="text-sm text-gray-500 mb-3">Horarios de inicio disponibles:</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {generarGrillaHorarios().map((hora) => {
                        const estaLibre = verificarDisponibilidad(hora);
                        
                        return (
                            <button
                                key={hora}
                                onClick={() => estaLibre && seleccionarHorario(hora)}
                                disabled={!estaLibre}
                                className={`
                                    p-2 rounded-lg text-sm font-bold transition border shadow-sm
                                    ${estaLibre 
                                        ? "bg-white border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 hover:scale-105 transform cursor-pointer" 
                                        : "bg-gray-100 border-transparent text-gray-300 cursor-not-allowed line-through decoration-gray-300"}
                                `}
                            >
                                {hora}
                            </button>
                        );
                    })}
                </div>
                
                <div className="mt-6 flex items-center gap-4 text-xs text-gray-400 justify-center">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-300 rounded"></div> Libre</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 rounded"></div> Ocupado</div>
                </div>
            </div>
        )}

        {/* --- PASO 2: FORMULARIO DE PAGO --- */}
        {paso === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                {/* Header Negro */}
                <div className="bg-black text-white p-6 flex items-center gap-3">
                    <button onClick={() => setPaso(1)} className="hover:bg-gray-800 p-2 rounded-full transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Confirmar Reserva</h1>
                        <div className="flex items-center gap-2 text-gray-400 text-xs mt-1">
                            <Calendar size={12}/> {new Date(fechaSeleccionada).toLocaleDateString()} 
                            <Clock size={12}/> {horaSeleccionada} hs 
                            <Timer size={12} className="ml-2"/> {duracionSeleccionada} min
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {/* Precio Estimado */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Total a pagar:</span>
                        <span className="text-xl font-bold text-black">
                            ${(cancha.precioPorHora * (duracionSeleccionada / 60)).toLocaleString()}
                        </span>
                    </div>

                    {/* Datos Personales */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-800">Tus Datos</label>
                        <div className="space-y-3">
                            <div className="flex items-center bg-gray-50 border rounded-xl px-4 py-3">
                                <User className="text-gray-400" size={20} />
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Nombre y Apellido"
                                    className="w-full bg-transparent px-3 outline-none text-gray-800"
                                    value={form.nombre}
                                    onChange={e => setForm({...form, nombre: e.target.value})}
                                />
                            </div>
                            <div className="flex items-center bg-gray-50 border rounded-xl px-4 py-3">
                                <Phone className="text-gray-400" size={20} />
                                <input 
                                    required 
                                    type="tel" 
                                    placeholder="Teléfono (WhatsApp)"
                                    className="w-full bg-transparent px-3 outline-none text-gray-800"
                                    value={form.telefono}
                                    onChange={e => setForm({...form, telefono: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Medios de Pago */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-800">Método de Pago</label>
                        
                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${form.metodoPago === "Mercado Pago" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "hover:bg-gray-50"}`}>
                            <input type="radio" name="pago" className="hidden" checked={form.metodoPago === "Mercado Pago"} onChange={() => setForm({...form, metodoPago: "Mercado Pago"})} />
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><CreditCard size={20} /></div>
                            <div className="flex-1">
                                <span className="font-bold text-sm block text-gray-800">Mercado Pago</span>
                                <span className="text-xs text-gray-500">Tarjetas / Débito</span>
                            </div>
                            {form.metodoPago === "Mercado Pago" && <CheckCircle size={18} className="text-blue-500" />}
                        </label>

                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${form.metodoPago === "Efectivo" ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "hover:bg-gray-50"}`}>
                            <input type="radio" name="pago" className="hidden" checked={form.metodoPago === "Efectivo"} onChange={() => setForm({...form, metodoPago: "Efectivo"})} />
                            <div className="bg-green-100 p-2 rounded-lg text-green-600"><Banknote size={20} /></div>
                            <div className="flex-1">
                                <span className="font-bold text-sm block text-gray-800">Efectivo</span>
                                <span className="text-xs text-gray-500">Pagar en cancha</span>
                            </div>
                            {form.metodoPago === "Efectivo" && <CheckCircle size={18} className="text-green-500" />}
                        </label>

                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${form.metodoPago === "Transferencia" ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500" : "hover:bg-gray-50"}`}>
                            <input type="radio" name="pago" className="hidden" checked={form.metodoPago === "Transferencia"} onChange={() => setForm({...form, metodoPago: "Transferencia"})} />
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Landmark size={20} /></div>
                            <div className="flex-1">
                                <span className="font-bold text-sm block text-gray-800">Transferencia</span>
                                <span className="text-xs text-gray-500">Envío a CBU</span>
                            </div>
                            {form.metodoPago === "Transferencia" && <CheckCircle size={18} className="text-purple-500" />}
                        </label>
                    </div>

                    <button 
                        onClick={handleReservar}
                        disabled={cargando}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] transform"
                    >
                        {cargando ? "Procesando..." : (
                            <>Confirmar Reserva <ArrowRight size={20} /></>
                        )}
                    </button>
                </div>
            </div>
        )}

      </div>
    </main>
  );
}