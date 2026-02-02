"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, ArrowRight, AlertTriangle, Lock } from "lucide-react";

interface Cancha {
  id: number;
  nombre: string;
  deporte: string;
  precioPorHora: number;
  techada: boolean;
  imgUrl: string;
  activa: boolean; // 🟢 Importante recibir esto
}

export default function ReservarPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);

  useEffect(() => {
    // Traemos todas las canchas (activas y pausadas)
    fetch("https://localhost:7123/api/Canchas")
      .then((res) => res.json())
      .then((data) => setCanchas(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6 min-h-screen">
      <h1 className="text-3xl font-black text-slate-900 mb-2">Canchas Disponibles</h1>
      <p className="text-gray-500 mb-8">Selecciona tu cancha preferida para ver horarios.</p>

      <div className="space-y-6">
        {canchas.map((c) => (
          <div 
            key={c.id} 
            className={`relative bg-white rounded-3xl p-4 flex flex-col md:flex-row gap-6 shadow-sm border border-gray-100 transition-all 
            ${!c.activa ? "opacity-75 bg-gray-50 grayscale" : "hover:shadow-lg hover:border-blue-200"}`}
          >
            {/* IMAGEN */}
            <div className="w-full md:w-48 h-32 relative shrink-0">
              <img 
                src={c.imgUrl} 
                alt={c.nombre} 
                className="w-full h-full object-cover rounded-2xl"
              />
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
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold uppercase">{c.deporte}</span>
                    {c.techada ? (
                       <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold uppercase">Techada 🏠</span>
                    ) : (
                       <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold uppercase">Descubierta☀️</span>
                    )}
                  </div>
                </div>
                
                {/* PRECIO */}
                <div className="text-right">
                    <span className={`font-mono font-bold text-lg ${!c.activa ? 'text-gray-400 decoration-slate-400 line-through' : 'text-green-600'}`}>
                        ${c.precioPorHora.toLocaleString()}
                    </span>
                </div>
              </div>

              {/* BOTÓN DE ACCIÓN */}
              <div className="mt-2">
                {c.activa ? (
                    // 🟢 SI ESTÁ ACTIVA: Link normal
                    <Link 
                        href={`/reservar/${c.id}`} 
                        className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition gap-1"
                    >
                        Ver disponibilidad <ArrowRight size={16}/>
                    </Link>
                ) : (
                    // 🔴 SI ESTÁ PAUSADA: Botón falso y aviso
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg w-fit">
                        <AlertTriangle size={16}/>
                        <span className="text-xs font-bold uppercase">En Mantenimiento - No disponible</span>
                    </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}