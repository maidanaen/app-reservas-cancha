"use client";
import { useState, useEffect, use } from "react";
import { MapPin, Clock, ArrowLeft, Calendar as CalendarIcon, Timer, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { Cancha, Reserva } from "../../types"; 

export default function DetalleCanchaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // Estados de datos
  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [reservasOcupadas, setReservasOcupadas] = useState<Reserva[]>([]);
  
  // Estado para guardar los horarios generados dinámicamente
  const [horariosDinamicos, setHorariosDinamicos] = useState<string[]>([]);

  // Estados del formulario
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]); // Hoy
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [duracionSeleccionada, setDuracionSeleccionada] = useState<number>(0);
  
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  
  const [id, setId] = useState<string>("");

  // 1. Cargar ID y Cancha
  useEffect(() => {
    params.then((p) => {
        setId(p.id);
        cargarCancha(p.id);
    });
  }, [params]);

  // 2. Cargar Reservas cuando cambia fecha o ID
  useEffect(() => {
    if (id) cargarReservasDelDia(id, fecha);
  }, [id, fecha]);

  // 3. Generar la grilla de horarios cuando carga la cancha
  useEffect(() => {
    if (cancha) {
        generarGrillaHorarios();
    }
  }, [cancha]);

  // --- FUNCIÓN GENERADORA DE HORARIOS ---
  const generarGrillaHorarios = () => {
    if (!cancha) return;
    
    const lista: string[] = [];
    let h = cancha.horaApertura;
    const cierre = cancha.horaCierre; // Ej: 3 (03:00 AM)

    // Protegemos con un contador para evitar bucles infinitos
    let contador = 0;
    
    // El bucle sigue mientras la hora sea distinta a la de cierre
    // OJO: Si abre a las 18 y cierra a las 18, esto evita bucle infinito
    while (h !== cierre && contador < 24) {
        lista.push(`${h.toString().padStart(2, '0')}:00`);
        lista.push(`${h.toString().padStart(2, '0')}:30`);

        h++; 
        if (h === 24) h = 0; // Si llegamos a 24, volvemos a 0 (medianoche)
        contador++;
    }
    setHorariosDinamicos(lista);
  };

  // --- CARGA DE DATOS ---
  const cargarCancha = async (canchaId: string) => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const res = await fetch(`https://localhost:7123/api/Canchas/${canchaId}`);
    if (res.ok) setCancha(await res.json());
  };

  const cargarReservasDelDia = async (canchaId: string, fechaFiltro: string) => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`https://localhost:7123/api/Reservas/cancha/${canchaId}?fecha=${fechaFiltro}`);
      if (res.ok) setReservasOcupadas(await res.json());
    } catch (error) {
      console.error("Error cargando disponibilidad");
    }
  };
  
  // --- VALIDACIÓN: ¿ES DE MADRUGADA? (CLAVE) ---
  const ajustarFechaSiEsMadrugada = (fechaBaseISO: string, horaStr: string): Date => {
    const fechaObj = new Date(`${fechaBaseISO}T${horaStr}`);
    if (!cancha) return fechaObj;

    const horaInt = parseInt(horaStr.split(':')[0]);

    // LÓGICA MAESTRA:
    // Si la cancha cierra "mañana" (ej: abre 18, cierra 03)
    // Y la hora que elegí (ej: 01:00) es menor que la de apertura (18:00)
    // Entonces esa hora pertenece al día siguiente.
    if (cancha.horaCierre < cancha.horaApertura && horaInt < cancha.horaApertura) {
        fechaObj.setDate(fechaObj.getDate() + 1);
    }
    
    return fechaObj;
  };

  // --- VALIDACIONES ---
  const esHoraOcupada = (horaStr: string) => {
    // Usamos la función inteligente para saber la fecha real
    const turnoInicio = ajustarFechaSiEsMadrugada(fecha, horaStr);
    const puntoCheck = new Date(turnoInicio.getTime() + 1000); 

    return reservasOcupadas.some(reserva => {
        const ocupadoInicio = new Date(reserva.fechaInicio);
        const ocupadoFin = new Date(reserva.fechaFin);
        return puntoCheck >= ocupadoInicio && puntoCheck < ocupadoFin;
    });
  };

  const obtenerDuracionesDisponibles = () => {
    if (!horaSeleccionada || !cancha) return [];

    const opciones = [60, 90, 120, 150, 180, 210, 240, 270, 300]; 
    const disponibles: number[] = [];
    
    // Usamos la función inteligente aquí también
    const inicioDate = ajustarFechaSiEsMadrugada(fecha, horaSeleccionada);

    // Calcular fecha límite de cierre
    const cierreDate = new Date(`${fecha}T${cancha.horaCierre.toString().padStart(2, '0')}:00:00`);
    // Si cierra de madrugada, el cierre es mañana
    if (cancha.horaCierre < cancha.horaApertura) {
        cierreDate.setDate(cierreDate.getDate() + 1);
    } else if (cancha.horaCierre > cancha.horaApertura && inicioDate.getDate() > new Date(fecha).getDate()) {
       // Caso raro borde
       cierreDate.setDate(cierreDate.getDate() + 1);
    }

    for (let duracion of opciones) {
        const finDate = new Date(inicioDate.getTime() + duracion * 60000);
        
        // 1. Validar choque con reservas
        const choca = reservasOcupadas.some(reserva => {
            const ocupadoInicio = new Date(reserva.fechaInicio);
            const ocupadoFin = new Date(reserva.fechaFin);
            return inicioDate < ocupadoFin && finDate > ocupadoInicio;
        });

        if (!choca) {
            disponibles.push(duracion);
        } else {
            break; 
        }
    }
    return disponibles;
  };

  // --- RESERVAR ---
  const handleReservar = async () => {
    if (!duracionSeleccionada || !clienteNombre || !clienteTelefono) {
        alert("Por favor completa todos los pasos.");
        return;
    }

    setMensaje("Reservando...");

    // 1. Calcular Inicio Real (considerando madrugada)
    const inicioDate = ajustarFechaSiEsMadrugada(fecha, horaSeleccionada);
    
    // 2. Calcular Fin Real
    const finDate = new Date(inicioDate.getTime() + duracionSeleccionada * 60000); 
    
    // 3. Convertir a String ISO Manual (para evitar líos de zona horaria)
    const isoString = (d: Date) => {
        const Y = d.getFullYear();
        const M = (d.getMonth() + 1).toString().padStart(2, '0');
        const D = d.getDate().toString().padStart(2, '0');
        const H = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        return `${Y}-${M}-${D}T${H}:${m}:00`;
    };

    const nuevaReserva = {
        canchaId: Number(id),
        clienteNombre,
        clienteTelefono,
        fechaInicio: isoString(inicioDate),
        fechaFin: isoString(finDate)
    };

    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const res = await fetch("https://localhost:7123/api/Reservas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevaReserva),
        });

        if (res.ok) {
            setMensaje("✅ ¡Reserva Exitosa!");
            setTimeout(() => {
                router.push("/"); 
            }, 2000);
        } else {
            const error = await res.json();
            setMensaje("❌ Error: " + (error.mensaje || "Ocupado"));
            cargarReservasDelDia(id, fecha);
        }
    } catch (error) {
        setMensaje("❌ Error de conexión");
    }
  };

  const formatoDuracion = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h} h ${m > 0 ? m + ' min' : ''}`;
  };

  if (!cancha) return <div className="p-10 text-center animate-pulse">Cargando cancha...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header Foto */}
      <div className="relative h-56 bg-gray-800">
        <img src={cancha.imgUrl || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80"} className="w-full h-full object-cover opacity-70"/>
        <Link href="/" className="absolute top-6 left-6 bg-white/90 p-2 rounded-full shadow-md hover:scale-110 transition"><ArrowLeft size={24} /></Link>
        <div className="absolute bottom-4 left-6 text-white">
            <h1 className="text-3xl font-bold">{cancha.nombre}</h1>
            <div className="flex items-center gap-1 text-gray-200 text-sm"><MapPin size={14} /> San Luis del Palmar</div>
        </div>
      </div>

      <div className="p-6 -mt-4 relative bg-white rounded-t-3xl shadow-lg min-h-[600px]">
        
        {/* Info Cancha */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
            <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Precio por hora</p>
                <p className="text-3xl font-bold text-green-600">${cancha.precioPorHora}</p>
            </div>
            <div className="text-right">
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase">{cancha.deporte}</span>
                <p className="text-xs text-gray-400 mt-1">
                    Horario: {cancha.horaApertura}:00 a {cancha.horaCierre}:00
                </p>
            </div>
        </div>

        {/* 1. Selector de Fecha */}
        <div className="mb-6">
            <label className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <CalendarIcon size={18} className="text-blue-600" /> 1. Elige el día
            </label>
            <input 
                type="date" 
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none font-bold text-gray-700"
                value={fecha}
                onChange={(e) => {
                    setFecha(e.target.value);
                    setHoraSeleccionada("");
                    setDuracionSeleccionada(0);
                }}
            />
        </div>

        {/* 2. Grilla de Horarios (DINÁMICA) */}
        <div className="mb-6">
            <label className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" /> 2. ¿A qué hora empiezas?
            </label>
            <div className="grid grid-cols-4 gap-2">
                {horariosDinamicos.length > 0 ? horariosDinamicos.map(hora => {
                    const ocupado = esHoraOcupada(hora);
                    const seleccionado = horaSeleccionada === hora;
                    return (
                        <button 
                            key={hora}
                            disabled={ocupado}
                            onClick={() => {
                                setHoraSeleccionada(hora);
                                setDuracionSeleccionada(0); 
                            }}
                            className={`py-2 px-1 rounded-lg border text-xs font-bold transition relative ${
                                ocupado 
                                ? "bg-gray-100 text-gray-300 border-transparent cursor-not-allowed decoration-slice" 
                                : seleccionado 
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105" 
                                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                            }`}
                        >
                            {hora}
                        </button>
                    );
                }) : <p className="text-gray-400 text-sm col-span-4">No hay horarios disponibles.</p>}
            </div>
        </div>

        {/* 3. Selector de Duración */}
        {horaSeleccionada && (
            <div className="mb-6 animate-fade-in bg-blue-50 p-4 rounded-xl border border-blue-100">
                <label className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-sm">
                    <Timer size={18} /> 3. ¿Cuánto tiempo juegas?
                </label>
                <div className="flex flex-wrap gap-2">
                    {obtenerDuracionesDisponibles().length > 0 ? (
                        obtenerDuracionesDisponibles().map(duracion => (
                            <button
                                key={duracion}
                                onClick={() => setDuracionSeleccionada(duracion)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                                    duracionSeleccionada === duracion
                                    ? "bg-green-600 text-white border-green-600 shadow-md"
                                    : "bg-white text-green-700 border-green-200 hover:bg-green-50"
                                }`}
                            >
                                {formatoDuracion(duracion)}
                            </button>
                        ))
                    ) : (
                        <p className="text-red-500 text-xs font-bold">Tiempo insuficiente.</p>
                    )}
                </div>
            </div>
        )}

        {/* 4. Datos del Cliente y Botón Final */}
        {duracionSeleccionada > 0 && (
            <div className="mb-10 animate-fade-in space-y-4 border-t border-gray-100 pt-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <CheckCircle size={18} className="text-blue-600"/> 4. Tus Datos para confirmar
                </h3>
                
                <div className="space-y-3">
                    <input 
                        type="text" placeholder="Nombre y Apellido"
                        className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none text-sm focus:bg-white focus:ring-2 focus:ring-green-500 transition"
                        value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                    />
                    <input 
                        type="tel" placeholder="Teléfono de contacto"
                        className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none text-sm focus:bg-white focus:ring-2 focus:ring-green-500 transition"
                        value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)}
                    />
                </div>

                {/* BOTÓN VISIBLE */}
                <button 
                    onClick={handleReservar}
                    disabled={!clienteNombre || !clienteTelefono}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-xl mt-4 ${
                        clienteNombre && clienteTelefono
                        ? "bg-green-600 text-white hover:bg-green-700 hover:scale-[1.02]" 
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                    {mensaje ? mensaje : `Confirmar Reserva (${formatoDuracion(duracionSeleccionada)})`}
                </button>
            </div>
        )}

      </div>
    </main>
  );
}