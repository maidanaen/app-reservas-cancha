"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Info, Lock, AlertTriangle, ArrowLeft, SunMoon, Umbrella, Warehouse } from "lucide-react";
import { API_URL } from '@/utils/config';

interface Cancha {
  id: number;
  nombre: string;
  deporte: string;
  precioPorHora: number;
  techada: boolean;
  imgUrl: string;
  activa: boolean;
}

interface Producto {
    id: number;
    nombre: string;
    precio: number;
    categoria: string;
}

export default function ClubProfilePage() {
  const params = useParams();
  const clubId = params.id;

  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [activeTab, setActiveTab] = useState<'canchas' | 'carta'>('canchas');
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Cargar Canchas
        const resCanchas = await fetch(`${API_URL}/api/Canchas?usuarioId=${clubId}`);
        const dataCanchas = await resCanchas.json();
        if (Array.isArray(dataCanchas)) setCanchas(dataCanchas);

        // Cargar Productos
        const resProd = await fetch(`${API_URL}/api/Productos?usuarioId=${clubId}`);
        if (resProd.ok) {
            const dataProd = await resProd.json();
            if (Array.isArray(dataProd)) setProductos(dataProd);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clubId]);

  // Agrupar productos por categoría
  const categoriasUnicas = ["Todas", ...Array.from(new Set(productos.map(p => p.categoria)))];

  const productosFiltrados = productos.filter(p => 
    categoriaActiva === "Todas" || p.categoria === categoriaActiva
  );

  return (
    <main className="max-w-5xl mx-auto p-6 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <Link href="/reservar" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-flex items-center gap-1 transition">
                <ArrowLeft size={14}/> Volver a Clubes
            </Link>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Panel del Club</h1>
            <p className="text-gray-500 font-medium">Reserva tu turno o consulta nuestra carta.</p>
        </div>

        {/* SELECTOR DE TABS */}
        <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
            <button 
                onClick={() => setActiveTab('canchas')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'canchas' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Canchas
            </button>
            <button 
                onClick={() => setActiveTab('carta')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'carta' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Ver Carta 🍔
            </button>
        </div>
      </div>      {loading ? (
        <div className="text-center py-20 text-gray-400 font-bold animate-pulse">Cargando información...</div>
      ) : activeTab === 'canchas' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {canchas.length === 0 ? (
                <div className="p-10 bg-gray-50 rounded-3xl text-center text-gray-400 border border-gray-100">
                    <Info className="mx-auto mb-2 opacity-50" size={32}/>
                    <p>Este club aún no tiene canchas registradas.</p>
                </div>
            ) : (
                canchas.map((c) => (
                    <div 
                        key={c.id} 
                        // 🟢 LÓGICA VISUAL: Si no está activa, aplicamos opacidad y escala de grises
                        className={`relative bg-white rounded-3xl p-4 flex flex-col md:flex-row gap-6 shadow-sm border border-gray-100 transition-all 
                        ${!c.activa ? "opacity-75 bg-gray-50 grayscale" : "hover:shadow-lg hover:border-blue-200"}`}
                    >
                        {/* IMAGEN */}
                        <div className="w-full md:w-48 h-32 relative shrink-0">
                            <img 
                                src={c.imgUrl || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80"} 
                                alt={c.nombre} 
                                className="w-full h-full object-cover rounded-2xl"
                            />
                            {/* 🟢 OVERLAY DE CANDADO SI ESTÁ INACTIVA */}
                            {!c.activa && (
                                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                                    <Lock className="text-white drop-shadow-md" size={32}/>
                                </div>
                            )}
                        </div>

                        {/* INFO */}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">{c.nombre}</h3>
                                    <div className="flex gap-2 mb-3">
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold uppercase">
                                            {c.deporte}
                                        </span>
                                        {c.techada ? (
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold uppercase flex items-center gap-1">
                                                <Warehouse  size={10}/> Techada
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded-lg font-bold uppercase flex items-center gap-1">
                                                <SunMoon size={10}/> Aire Libre
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* PRECIO */}
                                <div className="text-right">
                                    <span className={`font-mono font-bold text-lg ${!c.activa ? 'text-gray-400 decoration-slate-400 line-through' : 'text-green-600'}`}>
                                        ${c.precioPorHora.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-400 block">/hora</span>
                                </div>
                            </div>

                            {/* BOTÓN DE ACCIÓN */}
                            <div className="mt-2">
                                {c.activa ? (
                                    // 🟢 ENLACE ACTIVO
                                    <Link 
                                        href={`/reservar/pista/${c.id}`} 
                                        className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition gap-1"
                                    >
                                        Ver disponibilidad <ArrowRight size={16}/>
                                    </Link>
                                ) : (
                                    // 🔴 AVISO DE MANTENIMIENTO
                                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg w-fit">
                                        <AlertTriangle size={16}/>
                                        <span className="text-xs font-bold uppercase">En Mantenimiento - No disponible</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      ) : (
          /* VISTA DE LA CARTA MEJORADA */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {productos.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium tracking-tight">Este club aún no ha cargado su carta de productos.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Selector de Categorías (Pills) */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {categoriasUnicas.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoriaActiva(cat)}
                                    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap
                                    ${categoriaActiva === cat 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' 
                                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Grid de Productos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {productosFiltrados.map(p => (
                                <div 
                                    key={p.id} 
                                    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex justify-between items-center group hover:shadow-md hover:border-slate-200 transition-all"
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.categoria}</span>
                                        <h4 className="font-bold text-slate-900 text-lg leading-tight uppercase">{p.nombre}</h4>
                                    </div>
                                    <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-gray-50 group-hover:bg-slate-100 transition-colors">
                                        <p className="text-xl font-black text-slate-900 tracking-tighter">${p.precio.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                            {productosFiltrados.length === 0 && (
                                <div className="col-span-full py-20 text-center text-gray-400 font-medium">
                                    No hay productos en esta categoría.
                                </div>
                            )}
                        </div>
                    </div>
                )}
          </div>
      )}
    </main>
  );
}