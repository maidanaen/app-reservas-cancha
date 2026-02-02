"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, CalendarPlus, DollarSign, Clock, CheckCircle, Hourglass, Smartphone } from "lucide-react";
import Link from "next/link";

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

// Opciones de duración en minutos
const DURACIONES = [
    { label: "1 Hora", minutos: 60 },
    { label: "1 Hora 30 min", minutos: 90 },
    { label: "2 Horas", minutos: 120 },
    { label: "2 Horas 30 min", minutos: 150 },
    { label: "3 Horas", minutos: 180 },
    { label: "3 Horas 30 min", minutos: 210 },
    { label: "4 Horas", minutos: 240 },
];

export default function CrearReservaAdmin() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservasDelDia, setReservasDelDia] = useState<ReservaExistente[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Estado del formulario
  const [form, setForm] = useState({
    canchaId: "",
    clienteNombre: "",
    clienteTelefono: "",
    fecha: new Date().toISOString().split("T")[0],
    horaInicio: "", 
    horaFin: "",
    duracionMinutos: 90, // Por defecto 1h 30m
    metodoPago: "Efectivo"
  });

  useEffect(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    fetch("https://localhost:7123/api/Canchas")
      .then(res => res.json())
      .then(data => setCanchas(data))
      .catch(err => console.error("Error cargando canchas", err));
  }, []);

  useEffect(() => {
    if (form.canchaId && form.fecha) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        fetch(`https://localhost:7123/api/Reservas/cancha/${form.canchaId}?fecha=${form.fecha}`)
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

  const canchaSeleccionada = canchas.find(c => c.id === Number(form.canchaId));

  // 3. GENERADOR DE GRILLA (Intervalos de 30 min) 🧠
  const generarGrillaHorarios = () => {
    if (!canchaSeleccionada) return [];
    
    let horarios = [];
    let inicioMinutos = canchaSeleccionada.horaApertura * 60; 
    let finMinutos = canchaSeleccionada.horaCierre * 60;      

    if (finMinutos <= inicioMinutos) {
        finMinutos += 24 * 60;
    }

    for (let tiempo = inicioMinutos; tiempo < finMinutos; tiempo += 30) {
        let tiempoNormalizado = tiempo % (24 * 60);
        let horas = Math.floor(tiempoNormalizado / 60);
        let minutos = tiempoNormalizado % 60;
        let horaStr = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        horarios.push(horaStr);
    }
    
    return horarios;
  };

  // 4. VERIFICADOR DE DISPONIBILIDAD
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
    const inicioStr = nuevaHoraInicio || form.horaInicio;
    const duracion = nuevaDuracion || form.duracionMinutos;

    if (!inicioStr) return; 

    const fechaBase = new Date(`${form.fecha}T${inicioStr}:00`);
    fechaBase.setMinutes(fechaBase.getMinutes() + duracion);
    
    const horaFinStr = fechaBase.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});

    setForm(prev => ({
        ...prev,
        horaInicio: inicioStr,
        duracionMinutos: duracion,
        horaFin: horaFinStr
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.canchaId || !form.horaInicio) {
        alert("⚠️ Por favor selecciona una cancha y un horario.");
        return;
    }
    setCargando(true);

    const fechaInicioISO = `${form.fecha}T${form.horaInicio}:00`;
    
    const fechaObjInicio = new Date(fechaInicioISO);
    fechaObjInicio.setMinutes(fechaObjInicio.getMinutes() + form.duracionMinutos);
    
    const anio = fechaObjInicio.getFullYear();
    const mes = String(fechaObjInicio.getMonth()+1).padStart(2,'0');
    const dia = String(fechaObjInicio.getDate()).padStart(2,'0');
    const hora = String(fechaObjInicio.getHours()).padStart(2,'0');
    const min = String(fechaObjInicio.getMinutes()).padStart(2,'0');
    const fechaFinISO = `${anio}-${mes}-${dia}T${hora}:${min}:00`;

    const nuevaReserva = {
      canchaId: Number(form.canchaId),
      clienteNombre: form.clienteNombre,
      clienteTelefono: form.clienteTelefono,
      fechaInicio: fechaInicioISO,
      fechaFin: fechaFinISO,
      metodoPago: form.metodoPago
    };

    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const res = await fetch("https://localhost:7123/api/Reservas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nuevaReserva)
        });

        if (res.ok) {
            alert("✅ Turno registrado con éxito");
            router.push("/admin/reservas");
        } else {
            const txt = await res.text();
            alert("❌ Error: " + txt);
        }
    } catch (error) {
        alert("Error de conexión");
    } finally {
        setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-start">
      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mt-6">
        
        {/* Encabezado */}
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
            
            {/* SECCIÓN 1: DATOS PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Seleccionar Cancha</label>
                    <select 
                        name="canchaId"
                        className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white font-bold text-lg"
                        value={form.canchaId}
                        onChange={(e) => {
                            setForm({...form, canchaId: e.target.value, horaInicio: ""}); 
                        }}
                        required
                    >
                        <option value="">-- Toca para elegir --</option>
                        {canchas.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.nombre} (Cierra {c.horaCierre}:00hs)
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nombre Cliente</label>
                    <input type="text" name="clienteNombre" required 
                        className="w-full border p-3 rounded-xl focus:ring-black outline-none"
                        placeholder="Ej: Juan Pérez"
                        value={form.clienteNombre} onChange={handleChange}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Teléfono</label>
                    <input type="tel" name="clienteTelefono" required 
                        className="w-full border p-3 rounded-xl focus:ring-black outline-none"
                        placeholder="Ej: 3794..."
                        value={form.clienteTelefono} onChange={handleChange}
                    />
                </div>
            </div>

            {/* SECCIÓN 2: GRILLA DE HORARIOS */}
            <div className="border-t pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Clock size={18} /> 2. Elige Horario y Duración
                    </h3>
                    
                    <div className="flex gap-2">
                        <input type="date" name="fecha" required 
                            className="border border-gray-300 p-2 rounded-lg text-sm font-bold"
                            value={form.fecha} onChange={handleChange}
                        />
                        
                        <div className="relative">
                            <Hourglass size={16} className="absolute left-3 top-3 text-gray-500"/>
                            <select 
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-bold bg-white focus:border-black outline-none appearance-none"
                                value={form.duracionMinutos}
                                onChange={(e) => actualizarHorarios(undefined, Number(e.target.value))}
                            >
                                {DURACIONES.map(d => (
                                    <option key={d.minutos} value={d.minutos}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {!form.canchaId ? (
                    <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                        Selecciona una cancha arriba para ver los horarios disponibles. 👆
                    </div>
                ) : (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        {form.horaInicio && (
                            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <span className="text-sm font-bold">
                                    Reserva: {form.horaInicio} a {form.horaFin} 
                                    <span className="ml-2 opacity-75">({DURACIONES.find(d=>d.minutos === form.duracionMinutos)?.label})</span>
                                </span>
                                <CheckCircle size={18}/>
                            </div>
                        )}

                        {/* GRILLA DE 30 MIN */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {generarGrillaHorarios().map((horaStr) => {
                                const esSeleccionado = form.horaInicio === horaStr;
                                const estaOcupado = verificarSiEstaOcupado(horaStr);

                                return (
                                    <button
                                        key={horaStr}
                                        type="button"
                                        disabled={estaOcupado}
                                        onClick={() => actualizarHorarios(horaStr)}
                                        className={`
                                            p-3 rounded-lg border text-sm font-bold transition relative overflow-hidden flex items-center justify-center
                                            ${estaOcupado 
                                                ? 'bg-red-500 text-white border-red-600 cursor-not-allowed opacity-90' 
                                                : esSeleccionado 
                                                    ? 'bg-black text-white border-black shadow-lg scale-105 z-10' 
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-black hover:shadow-md'
                                            }
                                        `}
                                    >
                                        {estaOcupado ? (
                                            <span className="line-through decoration-2 decoration-white/50 text-xs">{horaStr}</span>
                                        ) : (
                                            horaStr
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-3 text-center">* Los horarios en rojo ya están reservados.</p>
                    </div>
                )}
            </div>

            {/* SECCIÓN 3: MÉTODO DE PAGO (SOLO EFVO Y TRANSF) */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">3. Forma de Pago</label>
                <div className="grid grid-cols-2 gap-4">
                    {["Efectivo", "Transferencia"].map((metodo) => (
                        <label key={metodo} className={`
                            cursor-pointer border rounded-xl p-4 text-center transition flex flex-col items-center gap-1 select-none hover:shadow-md
                            ${form.metodoPago === metodo 
                                ? "bg-black text-white border-black ring-2 ring-offset-1 ring-black" 
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}
                        `}>
                            <input 
                                type="radio" name="metodoPago" value={metodo} 
                                checked={form.metodoPago === metodo} onChange={handleChange} className="hidden"
                            />
                            <span className="font-bold text-lg">{metodo}</span>
                            {metodo === "Efectivo" ? <DollarSign size={20} /> : <Smartphone size={20} />}
                        </label>
                    ))}
                </div>
            </div>

            {/* BOTÓN FINAL */}
            <button 
                type="submit" 
                disabled={cargando}
                className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 text-white shadow-lg transition transform active:scale-95 ${
                    cargando ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
                {cargando ? "Procesando..." : <><Save size={20} /> Guardar Reserva</>}
            </button>
        </form>
      </div>
    </div>
  );
}