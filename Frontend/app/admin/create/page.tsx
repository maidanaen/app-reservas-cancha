"use client"; // Necesario para que funcionen los botones y formularios

import { useState } from "react";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  // Estado para guardar los datos del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    deporte: "Padel", // Valor por defecto
    precioPorHora: "",
    techada: false,
    imgUrl: "",
    horaApertura: "10", // Valor por defecto sugerido
    horaCierre: "02", // Valor por defecto sugerido
  });

  const [mensaje, setMensaje] = useState("");

  // Función que se ejecuta al enviar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("Guardando...");

    try {
      // 1. Convertimos los datos al formato que espera el Backend
      const canchaNueva = {
        ...formData,
        precioPorHora: Number(formData.precioPorHora),
        horaApertura: Number(formData.horaApertura),
        horaCierre: Number(formData.horaCierre),
      };

      // 2. Enviamos al Backend (Cambia el puerto 7123 si es necesario)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Truco del certificado
      
      const res = await fetch("https://localhost:7123/api/Canchas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canchaNueva),
      });

      if (res.ok) {
        setMensaje("✅ ¡Cancha creada con éxito!");
        // Limpiar formulario
        setFormData({ ...formData, nombre: "", imgUrl: "", precioPorHora: "" });
      } else {
        setMensaje("❌ Error al guardar.");
      }
    } catch (error) {
      setMensaje("❌ Error de conexión.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <Link href="/" className="flex items-center gap-2 text-gray-500 mb-6 hover:text-green-600">
        <ArrowLeft size={20} /> Volver al Inicio
      </Link>

      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          🛠️ Administrar Canchas
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Cancha</label>
            <input
              type="text"
              required
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Ej: Cancha Central"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            />
          </div>

          {/* Deporte */}
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

          {/* Precio y Techada (en fila) */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio x Hora</label>
              <input
                type="number"
                required
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                placeholder="0.00"
                value={formData.precioPorHora}
                onChange={(e) => setFormData({...formData, precioPorHora: e.target.value})}
              />
            </div>
            <div className="flex items-center pt-6">
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
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apertura (Hora)</label>
              <input
                type="number" min="0" max="23"
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                value={formData.horaApertura}
                onChange={(e) => setFormData({...formData, horaApertura: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cierre (Hora)</label>
              <input
                type="number" min="0" max="23"
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none"
                value={formData.horaCierre}
                onChange={(e) => setFormData({...formData, horaCierre: e.target.value})}
              />
            </div>
          </div>

          {/* URL Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de la Foto</label>
            <input
              type="text"
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-sm"
              placeholder="https://..."
              value={formData.imgUrl}
              onChange={(e) => setFormData({...formData, imgUrl: e.target.value})}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2"
          >
            <Save size={20} /> Guardar Cancha
          </button>

          {mensaje && (
            <p className={`text-center font-medium ${mensaje.includes("exito") ? "text-green-600" : "text-red-500"}`}>
              {mensaje}
            </p>
          )}

        </form>
      </div>
    </main>
  );
}