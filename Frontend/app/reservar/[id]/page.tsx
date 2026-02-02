"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Calendar, Clock, User, Phone, CheckCircle, CreditCard, 
  Banknote, Landmark, ArrowLeft, ArrowRight, Grid, Timer, Hourglass 
} from "lucide-react";
import Link from "next/link";

interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
  horaApertura: number;
  horaCierre: number;
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

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center items-start p-4 md:p-8">
      <div className="bg-white max-w-2xl w-full rounded-3xl shadow-xl overflow-hidden border border-gray-100 mt-4">
        
        {/* --- PASO 1: SELECCIÓN --- */}
        {paso === 1 && (
            <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{cancha.nombre}</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1"><Grid size={14}/> Reserva Online</p>
                    </div>
                    <Link href="/" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><ArrowLeft size={20}/></Link>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fecha</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-black"
                                value={fechaSeleccionada}
                                onChange={(e) => setFechaSeleccionada(e.target.value)}
                            />
                            <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Duración</label>
                        <div className="relative">
                            <select 
                                className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-black appearance-none"
                                value={duracionSeleccionada}
                                onChange={(e) => setDuracionSeleccionada(Number(e.target.value))}
                            >
                                {DURACIONES.map(d => (
                                    <option key={d.minutos} value={d.minutos}>{d.label}</option>
                                ))}
                            </select>
                            <Hourglass className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                        </div>
                    </div>
                </div>

                {/* GRILLA */}
                <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-blue-600"/> Horarios Disponibles
                </p>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {generarGrillaHorarios().map((hora) => {
                        // CAMBIO 3: Verificación simple con .includes
                        const estaOcupado = horariosOcupados.includes(hora);
                        
                        return (
                            <button
                                key={hora}
                                onClick={() => !estaOcupado && seleccionarHorario(hora)}
                                disabled={estaOcupado}
                                className={`
                                    py-3 rounded-lg text-sm font-bold transition border shadow-sm relative overflow-hidden flex items-center justify-center
                                    ${estaOcupado 
                                        ? "bg-red-500 text-white border-red-600 opacity-90 cursor-not-allowed" // 🔴 ROJO FUERTE
                                        : "bg-white border-gray-200 text-gray-700 hover:border-black hover:bg-black hover:text-white hover:scale-105 transform cursor-pointer"}
                                `}
                            >
                                {estaOcupado ? (
                                    <span className="line-through decoration-white/50">{hora}</span>
                                ) : (
                                    hora
                                )}
                            </button>
                        );
                    })}
                </div>
                
                <div className="mt-8 flex items-center gap-6 justify-center text-xs font-medium text-gray-500 border-t pt-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-gray-300 rounded"></div> Libre</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded"></div> Ocupado</div>
                </div>
            </div>
        )}

        {/* --- PASO 2: CONFIRMACIÓN --- */}
        {paso === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                
                {/* Header Negro */}
                <div className="bg-black text-white p-8">
                    <button onClick={() => setPaso(1)} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition text-sm">
                        <ArrowLeft size={16} /> Volver a horarios
                    </button>
                    <h2 className="text-3xl font-bold mb-1">Confirmar Reserva</h2>
                    <p className="text-gray-400 text-sm">Completa tus datos para finalizar</p>
                    
                    <div className="mt-6 flex flex-wrap gap-4">
                        <div className="bg-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-800">
                            <Calendar size={16} className="text-blue-400"/>
                            <span className="font-bold text-sm">{formatearFechaVisual(fechaSeleccionada)}</span>
                        </div>
                        <div className="bg-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-800">
                            <Clock size={16} className="text-green-400"/>
                            <span className="font-bold text-sm">{horaSeleccionada} - {horaFinCalculada}</span>
                        </div>
                        <div className="bg-gray-900 px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-800">
                            <Timer size={16} className="text-yellow-400"/>
                            <span className="font-bold text-sm">{duracionSeleccionada} min</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    
                    {/* Precio */}
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <span className="text-gray-600 font-bold">Total a pagar</span>
                        <span className="text-2xl font-black text-black">
                            ${(cancha.precioPorHora * (duracionSeleccionada / 60)).toLocaleString()}
                        </span>
                    </div>

                    {/* Formulario */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><User size={18}/> Tus Datos</h3>
                        <input 
                            type="text" 
                            placeholder="Nombre y Apellido"
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition"
                            value={formDatos.nombre}
                            onChange={e => setFormDatos({...formDatos, nombre: e.target.value})}
                        />
                        <input 
                            type="tel" 
                            placeholder="Teléfono (WhatsApp)"
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black transition"
                            value={formDatos.telefono}
                            onChange={e => setFormDatos({...formDatos, telefono: e.target.value})}
                        />
                    </div>

                    {/* Métodos de Pago */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><CreditCard size={18}/> Forma de Pago</h3>
                        <div className="grid grid-cols-1 gap-3">
                            
                            <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${formDatos.metodoPago === "Efectivo" ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "hover:bg-gray-50"}`}>
                                <input type="radio" className="hidden" checked={formDatos.metodoPago === "Efectivo"} onChange={() => setFormDatos({...formDatos, metodoPago: "Efectivo"})} />
                                <div className="bg-green-100 p-2 rounded-lg text-green-600"><Banknote size={24} /></div>
                                <div>
                                    <span className="font-bold block text-gray-900">Efectivo en Cancha</span>
                                    <span className="text-xs text-gray-500">Pagas al llegar al complejo</span>
                                </div>
                                {formDatos.metodoPago === "Efectivo" && <CheckCircle className="ml-auto text-green-500"/>}
                            </label>
                            
                             <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${formDatos.metodoPago === "Transferencia" ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500" : "hover:bg-gray-50"}`}>
                                <input type="radio" className="hidden" checked={formDatos.metodoPago === "Transferencia"} onChange={() => setFormDatos({...formDatos, metodoPago: "Transferencia"})} />
                                <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Landmark size={24} /></div>
                                <div>
                                    <span className="font-bold block text-gray-900">Transferencia Bancaria</span>
                                    <span className="text-xs text-gray-500">Envío a CBU / Alias</span>
                                </div>
                                {formDatos.metodoPago === "Transferencia" && <CheckCircle className="ml-auto text-purple-500"/>}
                            </label>
                        </div>
                    </div>

                    <button 
                        onClick={handleReservar}
                        disabled={cargando || !formDatos.nombre || !formDatos.telefono}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95 ${
                            cargando || !formDatos.nombre || !formDatos.telefono 
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                    >
                        {cargando ? "Procesando..." : <>Confirmar Reserva <ArrowRight size={20}/></>}
                    </button>

                </div>
            </div>
        )}
      </div>
    </main>
  );
}