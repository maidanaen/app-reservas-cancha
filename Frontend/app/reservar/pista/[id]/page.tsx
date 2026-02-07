
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Calendar, Clock, User, Phone, CheckCircle, CreditCard, 
  Banknote, Landmark, ArrowLeft, ArrowRight, Grid, Timer, Hourglass, 
  Shield,
  Zap,
  MapPin,
  Info,
  SunMoon,
  Warehouse
} from "lucide-react";
import Link from "next/link";

interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
  horaApertura: number;
  horaCierre: number;
  activa: boolean;
  imgUrl: string;  // 🟢 Vital para la foto
  techada: boolean; // 🟢 Vital para iconos
  deporte: string;
}

// Duraciones disponibles
const DURACIONES = [
    { label: "1 Hora", minutos: 60 },
    { label: "1 Hora 30 min", minutos: 90 },
    { label: "2 Horas", minutos: 120 },
    { label: "2 Horas 30 min", minutos: 150 },
    { label: "3 Horas", minutos: 180 },
    { label: "3 Horas 30 min", minutos: 210 },
    { label: "4 Horas", minutos: 240 },
];

export default function ReservarPage() {
  const { id } = useParams();
  const router = useRouter();

  // --- ESTADOS ---
  const [cancha, setCancha] = useState<Cancha | null>(null);
  
  // CAMBIO 1: Lista simple de textos para los horarios ocupados
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  
  const [cargando, setCargando] = useState(false);
  
  // Pasos del Wizard
  const [paso, setPaso] = useState(1);

  // Formulario
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [horaFinCalculada, setHoraFinCalculada] = useState("");
  const [duracionSeleccionada, setDuracionSeleccionada] = useState(90); 
  
  const [formDatos, setFormDatos] = useState({
    nombre: "",
    telefono: "",
    metodoPago: "Mercado Pago"
  });

  // 1. Cargar Cancha
  useEffect(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    fetch(`https://localhost:7123/api/Canchas/${id}`)
      .then((res) => res.json())
      .then((data) => setCancha(data))
      .catch((err) => console.error(err));
  }, [id]);

  // 2. Cargar Disponibilidad (CAMBIO 2: Usamos el endpoint 'ocupadas')
  useEffect(() => {
    if (id && fechaSeleccionada) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        fetch(`https://localhost:7123/api/Reservas/ocupadas?canchaId=${id}&fecha=${fechaSeleccionada}`)
            .then((res) => res.json())
            .then((data: string[]) => {
                setHorariosOcupados(data); // Guardamos directamente ["14:00", "15:00"]
            })
            .catch((err) => {
                console.error(err);
                setHorariosOcupados([]); // Si falla, liberamos todo por seguridad
            });
    }
  }, [id, fechaSeleccionada]);

  // --- LÓGICA DE GRILLA ---
  const generarGrillaHorarios = () => {
    if (!cancha) return [];
    
    let horarios = [];
    let inicioMinutos = cancha.horaApertura * 60; 
    let finMinutos = cancha.horaCierre * 60;      

    // Si cierra de madrugada
    if (finMinutos <= inicioMinutos) {
        finMinutos += 24 * 60;
    }

    // Intervalos de 30 min
    for (let tiempo = inicioMinutos; tiempo < finMinutos; tiempo += 30) {
        let tiempoNormalizado = tiempo % (24 * 60);
        let horas = Math.floor(tiempoNormalizado / 60);
        let minutos = tiempoNormalizado % 60;
        let horaStr = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        horarios.push(horaStr);
    }
    
    return horarios;
  };

  const seleccionarHorario = (hora: string) => {
    // Calcular fin visualmente
    const fechaBase = new Date(`${fechaSeleccionada}T${hora}:00`);
    fechaBase.setMinutes(fechaBase.getMinutes() + duracionSeleccionada);
    const horaFinStr = fechaBase.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});

    setHoraSeleccionada(hora);
    setHoraFinCalculada(horaFinStr);
    setPaso(2); 
  };

  // Función visual para la fecha "2026-01-29" -> "29/01/2026"
  const formatearFechaVisual = (fechaISO: string) => {
      if(!fechaISO) return "";
      const [anio, mes, dia] = fechaISO.split('-');
      return `${dia}/${mes}/${anio}`;
  };

  // --- CONFIRMAR ---
  const handleReservar = async () => {
    setCargando(true);
    
    // Crear ISO para Backend
    const fechaInicioISO = `${fechaSeleccionada}T${horaSeleccionada}:00`;
    
    const fechaObjInicio = new Date(fechaInicioISO);
    fechaObjInicio.setMinutes(fechaObjInicio.getMinutes() + duracionSeleccionada);
    
    // Reconstrucción manual ISO Local para fecha fin
    const anio = fechaObjInicio.getFullYear();
    const mes = String(fechaObjInicio.getMonth()+1).padStart(2,'0');
    const dia = String(fechaObjInicio.getDate()).padStart(2,'0');
    const hora = String(fechaObjInicio.getHours()).padStart(2,'0');
    const min = String(fechaObjInicio.getMinutes()).padStart(2,'0');
    const fechaFinISO = `${anio}-${mes}-${dia}T${hora}:${min}:00`;

    const nuevaReserva = {
      canchaId: Number(id),
      clienteNombre: formDatos.nombre,
      clienteTelefono: formDatos.telefono,
      fechaInicio: fechaInicioISO,
      fechaFin: fechaFinISO,
      metodoPago: formDatos.metodoPago
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
        if (formDatos.metodoPago === "Mercado Pago" && data.urlPago) {
            window.location.href = data.urlPago;
        } else {
            router.push(`/reservar/exito`);
        }
      } else {
        alert("❌ Ups, el horario ya no está disponible.");
        // Recargar disponibilidad usando el nuevo endpoint
        const resRefresh = await fetch(`https://localhost:7123/api/Reservas/ocupadas?canchaId=${id}&fecha=${fechaSeleccionada}`);
        const dataRefresh = await resRefresh.json();
        setHorariosOcupados(dataRefresh);
        setPaso(1);
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  if (!cancha) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Cargando...</div>;
  // 🛑 BLOQUEO DE SEGURIDAD: SI ESTÁ EN MANTENIMIENTO
    if (!cancha.activa) {
        // Importamos Wrench arriba: import { ..., Wrench } from "lucide-react";
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl text-center border-t-8 border-orange-500 animate-in zoom-in-95">
                    <div className="bg-orange-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        {/* Asegúrate de importar Wrench o usa AlertTriangle si no quieres importar más */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Cancha en Mantenimiento</h1>
                    <p className="text-gray-500 mb-8 font-medium">
                        La <strong>{cancha.nombre}</strong> no está disponible para reservas en este momento. Estamos trabajando para dejarla impecable. ✨
                    </p>
                    <button 
                        onClick={() => router.back()}
                        className="bg-slate-900 text-white w-full py-4 rounded-xl font-bold hover:bg-slate-800 transition flex justify-center items-center gap-2 shadow-lg"
                    >
                        <ArrowLeft size={20}/> Volver a Canchas
                    </button>
                </div>
            </main>
        );
    }

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center items-start p-4 md:p-8">
      
      {/* Contenedor Principal */}
      <div className="bg-white max-w-5xl w-full rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row">
        
        {/* --- PASO 1: SELECCIÓN --- */}
        {paso === 1 && (
            <>
                {/* 🟢 COLUMNA IZQUIERDA: INFORMACIÓN VISUAL */}
                <div className="md:w-5/12 bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
                    {/* Imagen de Fondo con gradiente */}
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={cancha.imgUrl || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80"} 
                            alt={cancha.nombre} 
                            className="w-full h-full object-cover opacity-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                    </div>

                    {/* Contenido sobre la imagen */}
                    <div className="relative z-10">
                        <Link href="/reservar" className="inline-flex items-center text-slate-300 hover:text-white transition mb-6">
                            <ArrowLeft size={18} className="mr-2"/> Volver
                        </Link>
                        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">{cancha.nombre}</h1>
                        <div className="flex flex-wrap gap-2 mb-6">
                            <span className="bg-blue-600/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                {cancha.deporte}
                            </span>
                            {cancha.techada ? (
                                <span className="bg-emerald-600/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Warehouse size={12}/> Techada
                                </span>
                            ) : (
                                <span className="bg-orange-500/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                    <SunMoon size={12}/> Aire Libre
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 mt-auto">
                        <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-widest">Precio por hora</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-white">${cancha.precioPorHora.toLocaleString()}</span>
                            <span className="text-slate-400">/hr</span>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-700 space-y-3">
                            <div className="flex items-center gap-3 text-slate-300 text-sm">
                                <MapPin size={18} className="text-blue-400"/>
                                <span>Nexus Sport Complex</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300 text-sm">
                                <Info size={18} className="text-blue-400"/>
                                <span>Cancha profesional con iluminación LED.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🟢 COLUMNA DERECHA: MOTOR DE RESERVA */}
                <div className="md:w-7/12 p-6 md:p-8 bg-white h-full overflow-y-auto">
                    
                    {/* Filtros Compactos */}
                    <div className="flex gap-4 mb-8 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <div className="flex-1 relative">
                            <input 
                                type="date" 
                                className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-slate-900 transition text-sm"
                                value={fechaSeleccionada}
                                onChange={(e) => setFechaSeleccionada(e.target.value)}
                            />
                            <Calendar className="absolute left-3 top-3 text-gray-400" size={16}/>
                        </div>
                        <div className="flex-1 relative">
                            <select 
                                className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-slate-900 appearance-none transition text-sm"
                                value={duracionSeleccionada}
                                onChange={(e) => setDuracionSeleccionada(Number(e.target.value))}
                            >
                                {DURACIONES.map(d => (
                                    <option key={d.minutos} value={d.minutos}>{d.label}</option>
                                ))}
                            </select>
                            <Hourglass className="absolute left-3 top-3 text-gray-400" size={16}/>
                        </div>
                    </div>

                    {/* GRILLA DE HORARIOS */}
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                            <Clock className="text-blue-600" size={20}/> Horarios Disponibles
                        </h3>
                        {/* Referencias */}
                        <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white border border-gray-300"></div> Libre</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-100 border border-gray-200"></div> Ocupado</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {generarGrillaHorarios().map((hora) => {
                            const estaOcupado = horariosOcupados.includes(hora);
                            return (
                                <button
                                    key={hora}
                                    onClick={() => !estaOcupado && seleccionarHorario(hora)}
                                    disabled={estaOcupado}
                                    className={`
                                        py-3 rounded-xl text-sm font-bold transition border relative overflow-hidden group flex items-center justify-center
                                        ${estaOcupado 
                                            ? "bg-red-50 text-red-400 border-red-100 cursor-not-allowed opacity-60" // 🔴 ROJO SUAVE (Estilo Premium)
                                            : "bg-white border-gray-200 text-slate-700 hover:border-slate-900 hover:shadow-md active:scale-95" // Libre
                                        }
                                    `}
                                >
                                    {/* Si está ocupado, tachamos la hora sutilmente */}
                                    {estaOcupado ? (
                                        <span className="line-through decoration-red-300">{hora}</span>
                                    ) : (
                                        hora
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </>
        )}

        {/* --- PASO 2: CONFIRMACIÓN (Ocupa todo el ancho cuando se activa) --- */}
        {paso === 2 && (
             <div className="w-full animate-in fade-in slide-in-from-right-8 duration-500">
                {/* ... (Aquí pegas el mismo código del Paso 2 que ya tenías, funciona perfecto) ... */}
                {/* Te recomiendo solo cambiar el botón de "Volver" para que use setPaso(1) correctamente */}
                 <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
                    <div>
                        <button onClick={() => setPaso(1)} className="mb-2 flex items-center gap-2 text-slate-400 hover:text-white transition text-xs font-bold uppercase tracking-wider">
                            <ArrowLeft size={14} /> Cambiar Horario
                        </button>
                        <h2 className="text-3xl font-black">Confirmar Reserva</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400">Total a pagar</p>
                        <p className="text-3xl font-black text-green-400">${(cancha.precioPorHora * (duracionSeleccionada / 60)).toLocaleString()}</p>
                    </div>
                </div>

                <div className="p-8 max-w-2xl mx-auto space-y-6">
                    {/* ... Resto del formulario igual que antes ... */}
                     <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><User size={18}/> Tus Datos</h3>
                        <input type="text" placeholder="Nombre y Apellido" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-slate-900 transition font-bold" value={formDatos.nombre} onChange={e => setFormDatos({...formDatos, nombre: e.target.value})}/>
                        <input type="tel" placeholder="Teléfono (WhatsApp)" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-slate-900 transition font-bold" value={formDatos.telefono} onChange={e => setFormDatos({...formDatos, telefono: e.target.value})}/>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><CreditCard size={18}/> Forma de Pago</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${formDatos.metodoPago === "Efectivo" ? "border-green-500 bg-green-50/50 ring-1 ring-green-500" : "hover:bg-gray-50"}`}>
                                <input type="radio" className="hidden" checked={formDatos.metodoPago === "Efectivo"} onChange={() => setFormDatos({...formDatos, metodoPago: "Efectivo"})} />
                                <div className="bg-green-100 p-2 rounded-lg text-green-600"><Banknote size={20} /></div>
                                <span className="font-bold text-gray-900 text-sm">Efectivo en Cancha</span>
                            </label>
                            
                             <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${formDatos.metodoPago === "Transferencia" ? "border-purple-500 bg-purple-50/50 ring-1 ring-purple-500" : "hover:bg-gray-50"}`}>
                                <input type="radio" className="hidden" checked={formDatos.metodoPago === "Transferencia"} onChange={() => setFormDatos({...formDatos, metodoPago: "Transferencia"})} />
                                <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Landmark size={20} /></div>
                                <span className="font-bold text-gray-900 text-sm">Transferencia</span>
                            </label>
                        </div>
                    </div>

                    <button 
                        onClick={handleReservar}
                        disabled={cargando || !formDatos.nombre || !formDatos.telefono}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-blue-200 transition transform active:scale-95 ${
                            cargando || !formDatos.nombre || !formDatos.telefono 
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" 
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                    >
                        {cargando ? "Reservando..." : <>Confirmar Reserva <CheckCircle size={20}/></>}
                    </button>
                </div>
             </div>
        )}
      </div>
    </main>
  );
}