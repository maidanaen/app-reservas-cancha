"use client";

import { useState, useEffect } from "react";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation"; // useParams sirve para leer el [id]

export default function EditarCanchaPage() {
  const router = useRouter();
  const params = useParams(); // Leemos el ID de la URL
  const id = params.id; // Aquí guardamos el número (ej: 1)

  const [mensaje, setMensaje] = useState("Cargando datos...");
  
  // Estado inicial del formulario
  const [formData, setFormData] = useState({
    id: 0,
    nombre: "",
    deporte: "",
    precioPorHora: 0,
    techada: false,
    imgUrl: "",
    horaApertura: 14,
    horaCierre: 23,
  });

  // 1. CARGAR DATOS: Se ejecuta apenas entras a la página
  useEffect(() => {
    if (id) {
      cargarDatosCancha(id.toString());
    }
  }, [id]);

  const cargarDatosCancha = async (idCancha: string) => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      // Pedimos la cancha específica al Backend
      // ⚠️ Chequea que el puerto 7123 sea el correcto
      const res = await fetch(`https://localhost:7123/api/Canchas/${idCancha}`);
      
      if (res.ok) {
        const data = await res.json();
        setFormData(data); // Rellenamos los inputs con los datos reales
        setMensaje(""); // Borramos el mensaje de carga
      } else {
        setMensaje("❌ No se encontró la cancha.");
      }
    } catch (error) {
      setMensaje("❌ Error de conexión.");
    }
  };

  // 2. GUARDAR CAMBIOS (PUT)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("Guardando cambios...");

    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      // Enviamos el PUT al Backend
      const res = await fetch(`https://localhost:7123/api/Canchas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMensaje("✅ ¡Actualizado correctamente!");
        setTimeout(() => {
          router.push("/admin"); // Volver a la tabla automáticamente
        }, 1500);
      } else {
        setMensaje("❌ Error al guardar.");
      }
    } catch (error) {
      setMensaje("❌ Error de conexión.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <Link href="/admin" className="flex items-center gap-2 text-gray-500 mb-6 hover:text-green-600">
        <ArrowLeft size={20} /> Cancelar y Volver
      </Link>

      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          ✏️ Editar Cancha
        </h1>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              required
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-green-500"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deporte</label>
            <select
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
              value={formData.deporte}
              onChange={(e) => setFormData({...formData, deporte: e.target.value})}
            >
              <option value="Padel">🎾 Padel</option>
              <option value="Futbol">⚽ Fútbol</option>
              <option value="Tenis">racket Tenis</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
              <input
                type="number"
                required
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                value={formData.precioPorHora}
                onChange={(e) => setFormData({...formData, precioPorHora: Number(e.target.value)})}
              />
            </div>
            
            <div className="flex-1">
               {/* Horarios */}
               <label className="block text-sm font-medium text-gray-700 mb-1">Cierre (Hora)</label>
               <input
                type="number"
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                value={formData.horaCierre}
                onChange={(e) => setFormData({...formData, horaCierre: Number(e.target.value)})}
              />
            </div>
          </div>
          
           {/* Checkbox Techada */}
            <div className="flex items-center pt-2 pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  checked={formData.techada}
                  onChange={(e) => setFormData({...formData, techada: e.target.checked})}
                />
                <span className="text-sm text-gray-700">¿Es Techada? 🏠</span>
              </label>
            </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2 mt-4"
          >
            <Save size={20} /> Guardar Cambios
          </button>

          {mensaje && <p className="text-center font-bold text-gray-500 mt-2">{mensaje}</p>}

        </form>
      </div>
    </main>
  );
}