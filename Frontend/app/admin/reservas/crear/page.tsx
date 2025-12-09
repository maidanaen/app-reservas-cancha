"use client";
import { useState, useEffect } from "react";
import { Save, ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cancha } from "../../../types"; 

export default function NuevaReservaPage() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [mensaje, setMensaje] = useState("");

  // Datos del formulario
  const [formData, setFormData] = useState({
    canchaId: 0,
    clienteNombre: "",
    clienteTelefono: "",
    fecha: new Date().toISOString().split("T")[0], // Hoy: YYYY-MM-DD
    horaInicio: "14:00", // Hora inicio por defecto
    horaFin: "15:30",    // Hora fin por defecto (1:30hs después)
  });

  // 1. Cargar canchas al iniciar
  useEffect(() => {
    async function cargarCanchas() {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const res = await fetch("https://localhost:7123/api/Canchas");
      if (res.ok) {
        const data = await res.json();
        setCanchas(data);
        if (data.length > 0) setFormData(prev => ({...prev, canchaId: data[0].id}));
      }
    }
    cargarCanchas();
  }, []);

  // 2. Enviar Reserva
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("Validando...");

    // A. VALIDACIÓN DE TIEMPO MÍNIMO (1 Hora y Media)
    const inicio = new Date(`2000-01-01T${formData.horaInicio}`);
    const fin = new Date(`2000-01-01T${formData.horaFin}`);
    
    // Calculamos la diferencia en minutos
    const diferenciaMinutos = (fin.getTime() - inicio.getTime()) / (1000 * 60);

    if (diferenciaMinutos < 90) {
      setMensaje("⚠️ Error: El turno debe durar al menos 1 hora y 30 minutos.");
      return;
    }

    if (diferenciaMinutos <= 0) {
      setMensaje("⚠️ Error: La hora de fin debe ser mayor a la de inicio.");
      return;
    }

    // B. Construimos las fechas completas para el Backend
    // Backend espera: "2025-10-20T14:30:00"
    const inicioIso = `${formData.fecha}T${formData.horaInicio}:00`;
    const finIso = `${formData.fecha}T${formData.horaFin}:00`;

    const reservaNueva = {
      canchaId: Number(formData.canchaId),
      clienteNombre: formData.clienteNombre,
      clienteTelefono: formData.clienteTelefono,
      fechaInicio: inicioIso,
      fechaFin: finIso
    };

    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const res = await fetch("https://localhost:7123/api/Reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservaNueva),
      });

      if (res.ok) {
        setMensaje("✅ ¡Reserva creada con éxito!");
        setTimeout(() => {
          router.push("/admin/reservas");
        }, 1500);
      } else {
        const errorData = await res.json();
        setMensaje(`❌ Error: ${errorData.mensaje || "Horario ocupado"}`);
      }
    } catch (error) {
      setMensaje("❌ Error de conexión");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <Link href="/admin/reservas" className="flex items-center gap-2 text-gray-500 mb-6 hover:text-blue-600">
        <ArrowLeft size={20} /> Volver a la Agenda
      </Link>

      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Clock className="text-blue-600" /> Nuevo Turno Flexible
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Cancha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancha</label>
            <select
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
              value={formData.canchaId}
              onChange={(e) => setFormData({...formData, canchaId: Number(e.target.value)})}
            >
              {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Cliente</label>
                <input type="text" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                    value={formData.clienteNombre}
                    onChange={(e) => setFormData({...formData, clienteNombre: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                    value={formData.clienteTelefono}
                    onChange={(e) => setFormData({...formData, clienteTelefono: e.target.value})}
                />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Turno</label>
            <input type="date" required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
            />
          </div>

          {/* Horario Flexible */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde (Inicio)</label>
                <input 
                    type="time" 
                    required 
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-center font-bold text-gray-700"
                    value={formData.horaInicio}
                    onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                />
            </div>
            <div className="pb-4 text-gray-400">➜</div>
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta (Fin)</label>
                <input 
                    type="time" 
                    required 
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-center font-bold text-gray-700"
                    value={formData.horaFin}
                    onChange={(e) => setFormData({...formData, horaFin: e.target.value})}
                />
            </div>
          </div>
            
          <p className="text-xs text-gray-400 text-center">
             Mínimo 1 hora y 30 minutos de duración.
          </p>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-200">
            <Save size={20} /> Confirmar Reserva
          </button>

          {mensaje && (
             <div className={`text-center font-bold mt-2 p-3 rounded-lg border ${mensaje.includes("Error") ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"}`}>
                {mensaje}
             </div>
          )}

        </form>
      </div>
    </main>
  );
}