"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, CalendarPlus, DollarSign, Clock, CreditCard } from "lucide-react";
import Link from "next/link";

interface Cancha {
  id: number;
  nombre: string;
  precioPorHora: number;
}

export default function CrearReservaAdmin() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [cargando, setCargando] = useState(false);
  
  // Estado del formulario
  const [form, setForm] = useState({
    canchaId: "",
    clienteNombre: "",
    clienteTelefono: "",
    fecha: new Date().toISOString().split("T")[0], // Fecha de hoy por defecto
    horaInicio: "14:00",
    horaFin: "15:00", // Una hora después por defecto
    metodoPago: "Efectivo" // Valor por defecto
  });

  // Cargar las canchas
  useEffect(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    fetch("https://localhost:7123/api/Canchas")
      .then(res => res.json())
      .then(data => setCanchas(data))
      .catch(err => console.error("Error cargando canchas", err));
  }, []);

  // Manejar cambios en inputs normales
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    // Validación básica de horario
    if (form.horaFin <= form.horaInicio) {
        alert("⚠️ La hora de finalización debe ser posterior a la de inicio.");
        setCargando(false);
        return;
    }
    
    // Armar las fechas en formato ISO para C#
    const fechaInicioISO = `${form.fecha}T${form.horaInicio}:00`;
    const fechaFinISO = `${form.fecha}T${form.horaFin}:00`;

    // Objeto que enviamos al Backend
    const nuevaReserva = {
      canchaId: Number(form.canchaId),
      clienteNombre: form.clienteNombre,
      clienteTelefono: form.clienteTelefono,
      fechaInicio: fechaInicioISO,
      fechaFin: fechaFinISO,
      metodoPago: form.metodoPago // ¡Aquí va el dato financiero!
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
            alert("❌ Error: Verifica que el horario esté disponible.");
        }
    } catch (error) {
        alert("Error de conexión con el servidor");
    } finally {
        setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-start">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg border border-gray-100 mt-6">
        
        {/* Encabezado */}
        <div className="flex items-center gap-4 mb-8 border-b pb-4">
            <Link href="/admin/reservas" className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    Nueva Reserva Manual
                </h1>
                <p className="text-sm text-gray-500">Registra un turno telefónico o presencial</p>
            </div>
            <div className="ml-auto bg-blue-50 p-3 rounded-full text-blue-600">
                <CalendarPlus size={28} />
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECCIÓN 1: DATOS DE CANCHA Y CLIENTE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Cancha</label>
                    <select 
                        name="canchaId"
                        className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={form.canchaId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">-- Elegir cancha --</option>
                        {canchas.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.nombre} (${c.precioPorHora}/hora)
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Cliente</label>
                    <input type="text" name="clienteNombre" required 
                        className="w-full border border-gray-300 p-3 rounded-xl focus:ring-blue-500 outline-none"
                        placeholder="Ej: Juan Pérez"
                        value={form.clienteNombre}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                    <input type="tel" name="clienteTelefono" required 
                        className="w-full border border-gray-300 p-3 rounded-xl focus:ring-blue-500 outline-none"
                        placeholder="Ej: 3794..."
                        value={form.clienteTelefono}
                        onChange={handleChange}
                    />
                </div>
            </div>

            {/* SECCIÓN 2: FECHA Y HORARIOS */}
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 mb-4 text-blue-800 font-bold">
                    <Clock size={20} />
                    <h3>Configuración de Horario</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-blue-700 mb-1">FECHA</label>
                        <input type="date" name="fecha" required 
                            className="w-full border border-blue-200 p-3 rounded-lg focus:ring-blue-500 outline-none"
                            value={form.fecha}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-green-700 mb-1">HORA INICIO</label>
                        <input type="time" name="horaInicio" required 
                            className="w-full border border-green-200 p-3 rounded-lg focus:ring-green-500 outline-none bg-green-50"
                            value={form.horaInicio}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-red-700 mb-1">HORA FIN</label>
                        <input type="time" name="horaFin" required 
                            className="w-full border border-red-200 p-3 rounded-lg focus:ring-red-500 outline-none bg-red-50"
                            value={form.horaFin}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: MÉTODO DE PAGO */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
                    <CreditCard size={20} />
                    <h3>Forma de Pago</h3>
                </div>
                
                <div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Botones de selección */}
                        {["Efectivo", "Transferencia", "Débito", "Crédito"].map((metodo) => (
                            <label key={metodo} className={`
                                cursor-pointer border rounded-xl p-3 text-center transition flex flex-col items-center gap-1 select-none
                                ${form.metodoPago === metodo 
                                    ? "bg-black text-white border-black ring-2 ring-offset-1 ring-black" 
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"}
                            `}>
                                <input 
                                    type="radio" 
                                    name="metodoPago" 
                                    value={metodo} 
                                    checked={form.metodoPago === metodo}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                <span className="font-medium text-sm">{metodo}</span>
                                {metodo === "Efectivo" && <DollarSign size={14} />}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* BOTÓN FINAL */}
            <button 
                type="submit" 
                disabled={cargando}
                className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 text-white shadow-lg transition transform hover:scale-[1.01] ${
                    cargando ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"
                }`}
            >
                {cargando ? "Guardando..." : <><Save size={20} /> Confirmar Reserva</>}
            </button>
        </form>
      </div>
    </div>
  );
}