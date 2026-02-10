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

export default function ClubProfilePage() {
  const params = useParams();
  const clubId = params.id;

  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    fetch(`${API_URL}/api/Canchas?usuarioId=${clubId}`)
      .then((res) => res.json())
      .then((data) => {
        // 🟢 CAMBIO: Ya no filtramos, guardamos TODAS (activas e inactivas)
        setCanchas(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [clubId]);

  return (
    <main className="max-w-5xl mx-auto p-6 min-h-screen">
      <div className="mb-8">
        <Link href="/reservar" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-flex items-center gap-1 transition">
             <ArrowLeft size={14}/> Volver a Clubes
        </Link>
        <h1 className="text-3xl font-black text-slate-900">Canchas del Club</h1>
        <p className="text-gray-500">Selecciona la pista donde quieres jugar.</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Cargando pistas...</div>
      ) : (
        <div className="space-y-6">
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
      )}
    </main>
  );
}