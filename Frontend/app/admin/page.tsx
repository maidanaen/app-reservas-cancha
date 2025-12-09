"use client";
import { useState, useEffect } from "react";
import { Trash2, Edit, Plus, LogOut, MapPin, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cancha } from "../types"; 

export default function AdminDashboard() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const router = useRouter();

  // 1. Verificar si es admin y cargar datos
  useEffect(() => {
    const esAdmin = localStorage.getItem("esAdmin");
    if (!esAdmin) {
      router.push("/admin/login");
    } else {
      cargarCanchas();
    }
  }, []);

  // Función para traer la lista del Backend
  const cargarCanchas = async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      // ⚠️ Chequea que el puerto 7123 sea el tuyo
      const res = await fetch("https://localhost:7123/api/Canchas");
      if (res.ok) {
        const data = await res.json();
        setCanchas(data);
      }
    } catch (error) {
      console.error("Error al cargar canchas");
    }
  };

  // Función para BORRAR
  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de borrar esta cancha?")) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`https://localhost:7123/api/Canchas/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        // Si se borró bien, recargamos la lista
        cargarCanchas(); 
      } else {
        alert("No se pudo borrar");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("esAdmin");
    router.push("/admin/login");
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      {/* Cabecera */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Panel de Control</h1>
            <p className="text-gray-500">Gestiona tus complejos deportivos</p>
        </div>
        <div className="flex gap-3">
             <Link href="/" className="px-4 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">
                Ver App
            </Link>

            {/* 2. CAMBIO: BOTÓN NUEVO DE AGENDA */}
            <Link 
              href="/admin/reservas" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition"
            >
              <Calendar size={18} /> Ver Agenda
            </Link>

            <button onClick={handleLogout} className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-2">
                <LogOut size={18} /> Salir
            </button>
        </div>
      </div>

      {/* Tabla de Gestión */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-lg">Mis Canchas ({canchas.length})</h2>
            
            {/* Botón para ir a CREAR */}
            <Link href="/admin/create" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Plus size={20} /> Nueva Cancha
            </Link>
        </div>

        <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                    <th className="p-4">Cancha</th>
                    <th className="p-4">Deporte</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {canchas.map((cancha) => (
                    <tr key={cancha.id} className="hover:bg-gray-50">
                        <td className="p-4">
                            <p className="font-bold text-gray-800">{cancha.nombre}</p>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                {cancha.techada ? "🏠 Techada" : "☀️ Al aire libre"}
                            </span>
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${cancha.deporte === 'Padel' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {cancha.deporte}
                            </span>
                        </td>
                        <td className="p-4 font-medium text-gray-700">${cancha.precioPorHora}</td>
                        <td className="p-4 text-right space-x-2">
                            {/* Botón Editar */}
                            <Link 
                              href={`/admin/editar/${cancha.id}`} 
                              className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition inline-block"
                              title="Editar">
                                <Edit size={18} />
                            </Link>
                            {/* Botón Borrar */}
                            <button 
                                onClick={() => handleDelete(cancha.id)}
                                className="p-2 text-gray-400 hover:text-red-600 transition"
                            >
                                <Trash2 size={18} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        {canchas.length === 0 && (
            <div className="p-10 text-center text-gray-400">
                No hay canchas cargadas todavía.
            </div>
        )}
      </div>
    </main>
  );
}