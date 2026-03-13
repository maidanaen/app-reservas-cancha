"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Save, Tag } from "lucide-react";
import Link from "next/link";
import { API_URL } from '@/utils/config';
import useSWR from 'swr';
import { fetcher } from '@/utils/fetcher';
import { useRouter } from 'next/navigation';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: string;
}

const CATEGORIAS = ["Bebidas", "Comidas", "Accesorios", "General"];

export default function GestionProductosPage() {
  const router = useRouter();
  const [nuevo, setNuevo] = useState({ nombre: "", precio: "", categoria: "Bebidas" });

  const userId = typeof window !== 'undefined' ? localStorage.getItem("usuarioId") : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  // --- CARGA CON SWR ---
  const { data: productosData, mutate: recargarProductos } = useSWR(
      userId && token ? `${API_URL}/api/Productos?usuarioId=${userId}` : null,
      fetcher
  );
  const productos: Producto[] = productosData || [];

  useEffect(() => {
      if (!token && typeof window !== 'undefined') {
          router.push("/admin/login");
      }
  }, [token, router]);

  const cargarProductos = () => recargarProductos();

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.nombre || !nuevo.precio) return;
    
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const token = localStorage.getItem("token");
    if (!token) return;

    await fetch(`${API_URL}/api/Productos`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ ...nuevo, precio: Number(nuevo.precio) })
    });
    setNuevo({ nombre: "", precio: "", categoria: "Bebidas" });
    cargarProductos();
  };

  const borrar = async (id: number) => {
      if(!confirm("¿Borrar producto?")) return;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/Productos/${id}`, { 
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
      });
      cargarProductos();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 font-sans">
        <div className="flex items-center gap-4 mb-6">
            <Link href="/admin" className="p-2 bg-white border rounded-lg hover:bg-gray-100"><ArrowLeft size={20}/></Link>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Productos</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FORMULARIO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus size={20}/> Nuevo Producto</h2>
                <form onSubmit={guardar} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                        <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 ring-blue-500" 
                            value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} placeholder="Ej: Coca Cola 1.5L"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Precio</label>
                        <input type="number" className="w-full p-2 border rounded-lg outline-none focus:ring-2 ring-blue-500" 
                            value={nuevo.precio} onChange={e => setNuevo({...nuevo, precio: e.target.value})} placeholder="$"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                        <select className="w-full p-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                             value={nuevo.categoria} onChange={e => setNuevo({...nuevo, categoria: e.target.value})}>
                            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800">Guardar Producto</button>
                </form>
            </div>

            {/* LISTA DE PRODUCTOS */}
            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Tag size={20}/> Inventario Actual</h2>
                <div className="space-y-2">
                    {productos.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                            <div>
                                <p className="font-bold text-gray-800">{p.nombre}</p>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">{p.categoria}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-green-700">${p.precio}</span>
                                <button onClick={() => borrar(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {productos.length === 0 && <p className="text-gray-400 text-center py-4">No hay productos cargados.</p>}
                </div>
            </div>
        </div>
    </main>
  );
}