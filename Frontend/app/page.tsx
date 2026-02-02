"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  ArrowRight, Calendar, Users, MapPin, 
  Trophy, ShieldCheck, Coffee, Car
} from "lucide-react";

interface Cancha {
  id: number;
  nombre: string;
  deporte: string;
  precioPorHora: number;
  imgUrl: string;
  techada: boolean;
}

export default function HomePage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);

  // Cargamos solo 3 canchas para mostrar como "Destacadas"
  useEffect(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    fetch("https://localhost:7123/api/Canchas")
      .then(res => res.json())
      .then(data => setCanchas(data.slice(0, 3))) // Solo las primeras 3
      .catch(err => console.error(err));
  }, []);

  return (
    <main className="min-h-screen bg-white font-sans">
      
      {/* 1. HERO SECTION (PORTADA) */}
      <div className="relative h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        {/* Imagen de fondo con filtro oscuro */}
        <div className="absolute inset-0 z-0">
            <img 
                src="https://deportes.cba.gov.ar/wp-content/uploads/2022/11/padel-e.jpg" 
                alt="Fondo Padel" 
                className="w-full h-full object-cover brightness-[0.3]"
            />
        </div>

        {/* Contenido Central */}
        <div className="relative z-10 text-center px-4 animate-in fade-in zoom-in-95 duration-700">
            <span className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">
                Nexus Sport
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
                ELEVA TU <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">JUEGO</span>
            </h1>
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                Las mejores canchas las encotras aca. Reserva tu turno online o súmate a partidos públicos y conoce nuevos rivales.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center">
                <Link 
                    href="/reservar" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/50"
                >
                    <Calendar size={20}/> Reservar Cancha
                </Link>
                <Link 
                    href="/partidos" 
                    className="bg-white hover:bg-gray-100 text-slate-900 px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg"
                >
                    <Users size={20}/> Buscar Partido
                </Link>
            </div>
        </div>
      </div>

      {/* 2. BARRA DE BENEFICIOS */}
      <div className="bg-slate-50 py-12 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center gap-2">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600 mb-2"><ShieldCheck size={24}/></div>
                <h3 className="font-bold text-slate-900">Seguridad 24hs</h3>
                <p className="text-xs text-gray-500">Predio monitoreado</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
                <div className="bg-green-100 p-3 rounded-full text-green-600 mb-2"><Trophy size={24}/></div>
                <h3 className="font-bold text-slate-900">Césped Sintético</h3>
                <p className="text-xs text-gray-500">La Mejor en Calidad del mercado</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
                <div className="bg-orange-100 p-3 rounded-full text-orange-600 mb-2"><Coffee size={24}/></div>
                <h3 className="font-bold text-slate-900">Bar & Vestuarios</h3>
                <p className="text-xs text-gray-500">Relájate post partido</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
                <div className="bg-purple-100 p-3 rounded-full text-purple-600 mb-2"><Car size={24}/></div>
                <h3 className="font-bold text-slate-900">Estacionamiento</h3>
                <p className="text-xs text-gray-500">Gratuito para jugadores</p>
            </div>
        </div>
      </div>

      {/* 3. CANCHAS DESTACADAS */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex justify-between items-end mb-10">
            <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Nuestras Canchas</h2>
                <p className="text-gray-500">Elige tu superficie favorita y empieza a jugar.</p>
            </div>
            <Link href="/reservar" className="text-blue-600 font-bold flex items-center gap-1 hover:gap-2 transition-all">
                Ver todas <ArrowRight size={18}/>
            </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
            {canchas.map(c => (
                <div key={c.id} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition overflow-hidden cursor-pointer">
                    <div className="relative h-48 overflow-hidden">
                        <img 
                            src={c.imgUrl} 
                            alt={c.nombre} 
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm">
                            ${c.precioPorHora.toLocaleString()}
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex gap-2 mb-3">
                            <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded">{c.deporte}</span>
                            {c.techada && <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-600 px-2 py-1 rounded">Techada</span>}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">{c.nombre}</h3>
                        <Link href={`/reservar/${c.id}`} className="block w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition">
                            Ver Disponibilidad
                        </Link>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 4. BANNER COMUNIDAD */}
      <div className="bg-slate-900 text-white py-20 relative overflow-hidden">
         {/* Decoración de fondo */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20"></div>
         <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-600 rounded-full blur-[120px] opacity-20"></div>

         <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-6">¿Te falta uno para el partido?</h2>
            <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
                No suspendas por falta de jugadores. Únete a nuestra comunidad, crea partidos públicos y encuentra rivales de tu nivel.
            </p>
            <Link 
                href="/partidos" 
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/50 transition transform hover:scale-105"
            >
                <Users size={24}/> Ver Partidos Públicos
            </Link>
         </div>
      </div>

      {/* 5. FOOTER SIMPLE */}
      <footer className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <h4 className="font-black text-xl text-slate-900 italic">NEXUS<span className="text-blue-600">SPORT</span></h4>
                <p className="text-sm text-gray-400 mt-1">© 2026 Todos los derechos reservados.</p>
            </div>
            <div className="flex gap-6 text-gray-500">
                <div className="flex items-center gap-2">
                    <MapPin size={18}/>
                    <span className="text-sm font-medium">San Luis del Palmar, Corrientes</span>
                </div>
            </div>
        </div>
      </footer>

    </main>
  );
}