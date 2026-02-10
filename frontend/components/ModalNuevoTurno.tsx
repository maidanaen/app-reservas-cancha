"use client";
import { useState, useEffect } from "react";
import { Save, CalendarPlus, CheckCircle, Smartphone, DollarSign, X, Repeat, AlertCircle } from "lucide-react";
import { API_URL } from '@/utils/config';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  userId: string | null;
}

interface Cancha {
  id: number;
  nombre: string;
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
];

export default function ModalNuevoTurno({ onClose, onSuccess, userId }: Props) {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservasDelDia, setReservasDelDia] = useState<ReservaExistente[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // ESTADOS DEL FORMULARIO
  const [form, setForm] = useState({
    canchaId: "",
    clienteNombre: "",
    clienteTelefono: "",
    fecha: new Date().toISOString().split("T")[0],
    horaInicio: "", 
    horaFin: "",
    duracionMinutos: 90,
    metodoPago: "Efectivo"
  });

  // ESTADOS PARA FIJOS (RECURRENTES)
  const [esFijo, setEsFijo] = useState(false);
  const [fechaFinFijo, setFechaFinFijo] = useState("");
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const diasSemana = [
    { id: 1, label: "L" }, { id: 2, label: "M" }, { id: 3, label: "X" },
    { id: 4, label: "J" }, { id: 5, label: "V" }, { id: 6, label: "S" }, { id: 0, label: "D" }
  ];

  // 1. CARGAR CANCHAS
  useEffect(() => {
    if(!userId) return;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    fetch(`${API_URL}/api/Canchas?usuarioId=${userId}`)
      .then(res => res.json())
      .then(data => {
          setCanchas(data);
          if(data.length > 0) setForm(prev => ({...prev, canchaId: data[0].id}));
      })
      .catch(err => console.error("Error cargando canchas", err));
  }, [userId]);

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
    const inicioStr = nuevaHoraInicio || form.horaInicio;
    const duracion = nuevaDuracion || form.duracionMinutos;
    if (!inicioStr) return; 

    const fechaBase = new Date(`${form.fecha}T${inicioStr}:00`);
    fechaBase.setMinutes(fechaBase.getMinutes() + duracion);
    const horaFinStr = fechaBase.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});

    setForm(prev => ({ ...prev, horaInicio: inicioStr, duracionMinutos: duracion, horaFin: horaFinStr }));
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.canchaId || !form.horaInicio) {
        alert("⚠️ Por favor selecciona una cancha y un horario en la grilla.");
        return;
    }
    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        // Generamos la fecha base
        const fechaInicioISO = `${form.fecha}T${form.horaInicio}:00`;
        const fechaBaseObj = new Date(fechaInicioISO);
        const fechaFinObj = new Date(fechaBaseObj.getTime() + form.duracionMinutos * 60000);
        
        // 🟢 HELPER CRUCIAL: Mantiene la hora local al enviar al servidor
        const toLocalISO = (date: Date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, -1); // Le quitamos la Z del final
        };

        if (esFijo) {
            // --- LOGICA FIJO ---
            if (diasSeleccionados.length === 0 || !fechaFinFijo) {
                alert("Para fijos selecciona días y fecha fin.");
                setCargando(false);
                return;
            }
            
            const bodyFijo = {
                canchaId: Number(form.canchaId),
                clienteNombre: form.clienteNombre,
                clienteTelefono: form.clienteTelefono,
                fechaInicio: new Date(form.fecha),
                fechaFin: new Date(fechaFinFijo),
                
                // 🟢 CORRECCIÓN AQUÍ: Usamos toLocalISO para enviar la hora exacta (Ej: 20:00)
                // y no la hora UTC (que sería 23:00)
                horaInicio: toLocalISO(fechaBaseObj),
                horaFin: toLocalISO(fechaFinObj),
                
                diasSemana: diasSeleccionados
            };

            const res = await fetch(`${API_URL}/api/Reservas/fija`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyFijo)
            });

            if (res.ok) {
                const data = await res.json();
                alert(`✅ ${data.mensaje}`);
                onSuccess();
            } else {
                alert("❌ Error: Horarios ocupados o datos inválidos.");
            }

        } else {
            // --- LOGICA SIMPLE ---
            const bodySimple = {
                canchaId: Number(form.canchaId),
                clienteNombre: form.clienteNombre,
                clienteTelefono: form.clienteTelefono,
                fechaInicio: fechaInicioISO, 
                fechaFin: toLocalISO(fechaFinObj), 
                metodoPago: form.metodoPago
            };
            
            const res = await fetch(`${API_URL}/api/Reservas`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodySimple)
            });

            if (res.ok) {
                alert("✅ Turno registrado");
                onSuccess();
            } else {
                const txt = await res.text();
                alert("❌ Error: " + txt);
            }
        }
    } catch (error) {
        alert("Error de conexión");
    } finally {
        setCargando(false);
    }
  };

  const toggleDia = (dia: number) => {
    if (diasSeleccionados.includes(dia)) setDiasSeleccionados(diasSeleccionados.filter(d => d !== dia));
    else setDiasSeleccionados([...diasSeleccionados, dia]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-20">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><CalendarPlus className="text-blue-600"/> Nueva Reserva</h2>
                <p className="text-xs text-gray-400">Selecciona horario en la grilla</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Cancha</label>
                    <select className="w-full p-3 rounded-xl border border-gray-300 bg-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.canchaId} onChange={e => setForm({...form, canchaId: e.target.value, horaInicio: ""})}>
                        {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
                    <input type="text" className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-blue-500" 
                        placeholder="Nombre" value={form.clienteNombre} onChange={e => setForm({...form, clienteNombre: e.target.value})}/>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                        <input type="date" className="block mt-1 p-2 border rounded font-bold text-gray-700" 
                            value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Duración</label>
                        <select className="block mt-1 p-2 border rounded font-bold text-gray-700 bg-gray-50"
                            value={form.duracionMinutos} onChange={e => actualizarHorarios(undefined, Number(e.target.value))}>
                            {DURACIONES.map(d => <option key={d.minutos} value={d.minutos}>{d.label}</option>)}
                        </select>
                    </div>
                </div>

                {form.horaInicio && (
                    <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg flex items-center justify-between border border-blue-100">
                        <span className="text-sm font-bold">Reserva: {form.horaInicio} a {form.horaFin}</span>
                        <CheckCircle size={18}/>
                    </div>
                )}

                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {generarGrillaHorarios().map((horaStr) => {
                        const esSeleccionado = form.horaInicio === horaStr;
                        const estaOcupado = verificarSiEstaOcupado(horaStr);
                        return (
                            <button key={horaStr} type="button" disabled={estaOcupado} onClick={() => actualizarHorarios(horaStr)}
                                className={`p-2 rounded-lg border text-xs font-bold transition ${estaOcupado ? 'bg-red-50 text-red-400 border-red-100 cursor-not-allowed' : esSeleccionado ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-white text-gray-600 hover:border-blue-400'}`}>
                                {horaStr}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${esFijo ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer mb-2">
                    <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={esFijo} onChange={e => setEsFijo(e.target.checked)}/>
                    <Repeat size={18} className={esFijo ? "text-indigo-600" : "text-gray-400"}/>
                    <span className={esFijo ? "text-indigo-700" : ""}>Repetir Reserva (Turno Fijo)</span>
                </label>

                {esFijo && (
                    <div className="mt-3 pl-7 space-y-3 animate-in fade-in">
                        <div className="flex gap-2">
                            {diasSemana.map(dia => (
                                <button key={dia.id} type="button" onClick={() => toggleDia(dia.id)}
                                    className={`w-8 h-8 rounded-full text-xs font-bold transition flex items-center justify-center ${diasSeleccionados.includes(dia.id) ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-500'}`}>
                                    {dia.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase text-indigo-400">Hasta:</span>
                            <input type="date" className="p-1 border rounded text-sm" value={fechaFinFijo} onChange={e => setFechaFinFijo(e.target.value)}/>
                        </div>
                        <p className="text-[10px] text-indigo-500 flex items-center gap-1"><AlertCircle size={10}/> Se verificarán conflictos para cada día.</p>
                    </div>
                )}
            </div>

            {!esFijo && (
                <div className="grid grid-cols-2 gap-4">
                    {["Efectivo", "Transferencia"].map(metodo => (
                        <label key={metodo} className={`cursor-pointer border rounded-xl p-3 text-center transition hover:shadow-sm ${form.metodoPago === metodo ? 'bg-gray-800 text-white ring-2 ring-gray-800' : 'bg-white'}`}>
                            <input type="radio" name="metodoPago" value={metodo} checked={form.metodoPago === metodo} onChange={e => setForm({...form, metodoPago: e.target.value})} className="hidden"/>
                            <span className="font-bold text-sm flex items-center justify-center gap-2">
                                {metodo === "Efectivo" ? <DollarSign size={16}/> : <Smartphone size={16}/>} {metodo}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>

        <div className="p-4 border-t bg-white sticky bottom-0">
            <button onClick={handleSubmit} disabled={cargando} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-lg disabled:opacity-50">
                {cargando ? "Procesando..." : <><Save size={20}/> Confirmar Reserva</>}
            </button>
        </div>
    </div>
  );
}