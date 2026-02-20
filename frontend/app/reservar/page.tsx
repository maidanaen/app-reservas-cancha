"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation"; 
import { MapPin, ArrowRight, Zap, Star, Clock, Phone } from "lucide-react";
import { API_URL } from '@/utils/config';

// --- INTERFAZ (Datos del endpoint público nuevo) ---
interface Cancha {
  id: number;
  nombre: string;
  horaApertura: number;
  horaCierre: number;
}

interface Club {
  clubId: number;        
  nombreClub: string;    
  direccion: string;
  canchas: Cancha[];     
  logoUrl?: string; 
  fotoUrl?: string;
  telefono?: string;
  linkUbicacion?: string;
}

function ListaDeClubes() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId"); 

  const [clubes, setClubes] = useState<Club[]>([]);
  const [cargando, setCargando] = useState(true);

  // 1. CARGA DE DATOS + REDIRECCIÓN AUTOMÁTICA
  useEffect(() => {
    const cargarDatos = async () => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
        const res = await fetch(`${API_URL}/api/Publico/sedes`);
        if (res.ok) {
          const data = await res.json();
          setClubes(data);

          if (userIdParam) {
            const clubExiste = data.find((c: Club) => c.clubId === Number(userIdParam));
            if (clubExiste) {
               router.push(`/reservar/${userIdParam}`);
               return; 
            }
          }
        }
      } catch (err) { console.error(err); } 
      finally { setCargando(false); }
    };
    cargarDatos();
  }, [userIdParam, router]);

  // 🕒 Lógica de Estado (Abierto/Cerrado) para el diseño visual
  const obtenerEstadoClub = (canchas: Cancha[]) => {
    if (!canchas || canchas.length === 0) return { texto: "SIN DATOS", color: "bg-gray-400" };
    const horaActual = new Date().getHours(); 
    const estaAbierto = canchas.some((c) => {
        const apertura = c.horaApertura; 
        const cierre = c.horaCierre;     
        if (cierre < apertura) return horaActual >= apertura || horaActual < cierre;
        else return horaActual >= apertura && horaActual < cierre;
    });
    return estaAbierto 
        ? { texto: "ABIERTO", color: "bg-green-500" } 
        : { texto: "CERRADO", color: "bg-red-500" };
  };

  // FUNCIÓN WHATSAPP
  const generarLinkWhatsApp = (telefono?: string) => {
      if (!telefono) return "#";
      const limpio = telefono.replace(/\D/g, "");
      const numeroFinal = limpio.length === 10 ? `549${limpio}` : limpio;
      return `https://wa.me/${numeroFinal}?text=Hola,%20quisiera%20hacer%20una%20consulta`;
  };

  if (userIdParam && cargando) return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 gap-4">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold animate-pulse">Entrando al club...</p>
      </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6  min-h-screen font-sans">
        
        <div className="mb-5 text-center md:text-left pt-6">
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Complejos Deportivos</h1>
            <p className="text-slate-500 font-medium">Selecciona el club para ver la grilla de turnos.</p>
        </div>

        {cargando ? (
             <div className="text-center py-20 text-gray-400 font-medium animate-pulse">Cargando clubes disponibles...</div>
        ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {clubes.map((club) => {
                    
                    const estado = obtenerEstadoClub(club.canchas);
                    const tienePortada = club.fotoUrl && club.fotoUrl.trim() !== "";
                    const imagenPortada = tienePortada ? club.fotoUrl : "https://deportes.cba.gov.ar/wp-content/uploads/2022/11/padel-e.jpg"; 
                    const logoUrl = (club.logoUrl && club.logoUrl !== "") ? club.logoUrl : `https://ui-avatars.com/api/?name=${club.nombreClub}&background=0f172a&color=fff&bold=true`;

                    return (
                        <Link 
                            key={club.clubId} 
                            href={`/reservar/${club.clubId}`}
                            className="group relative bg-white rounded-3xl p-3 flex flex-col gap-4 shadow-sm border border-slate-100 transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
                        >
                            {/* IMAGEN DE PORTADA */}
                            <div className="w-full h-48 relative shrink-0 rounded-2xl overflow-hidden bg-slate-900">
                                <img 
                                    src={imagenPortada} 
                                    alt={club.nombreClub} 
                                    className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition duration-700 ease-in-out"
                                />
                                <div className={`absolute top-3 left-3 ${estado.color} text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10 flex items-center gap-1 backdrop-blur-md bg-opacity-90`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                    {estado.texto}
                                </div>
                            </div>

                            {/* INFO */}
                            <div className="px-3 pb-3 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 pr-4">
                                        <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
                                            {club.nombreClub}
                                        </h3>
                                        
                                        {/*DATOS DE CONTACTO */}
                                        <div className="flex flex-col gap-1.5">
                                            {club.linkUbicacion ? (
                                                <a 
                                                    href={club.linkUbicacion} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase hover:text-blue-600 transition w-fit"
                                                    onClick={(e) => e.stopPropagation()} // Evita que al hacer clic aquí se abra la grilla
                                                >
                                                    <MapPin size={14} className="text-blue-500"/> Ver en Maps
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase">
                                                    <MapPin size={14}/> Sin ubicación
                                                </div>
                                            )}
                                            
                                            {club.telefono && (
                                                <a 
                                                    href={generarLinkWhatsApp(club.telefono)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase hover:text-green-600 transition w-fit"
                                                    onClick={(e) => e.stopPropagation()} // Evita que al hacer clic aquí se abra la grilla
                                                >
                                                    <Phone size={14} className="text-green-500"/> {club.telefono}
                                                </a>
                                            )}
                                        </div>

                                    </div>
                                    {/* LOGO FLOTANTE */}
                                    <img src={logoUrl} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover bg-white -mt-10 relative z-20"/>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded flex items-center gap-1">
                                        <Zap size={12} className="fill-slate-400"/> {club.canchas.length} Canchas
                                    </span>
                                    <span className="inline-flex items-center text-sm font-bold text-slate-900 group-hover:text-orange-600 transition gap-1">
                                        Ver Turnos <ArrowRight size={16}/>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        )}
    </div>
  );
}

// EXPORTACIÓN PRINCIPAL (Necesaria para Next.js con useSearchParams)
export default function ReservarPage() {
  return (
    <div className="bg-slate-50 min-h-screen pt-0"> 
      <Suspense fallback={<div className="p-10 text-center">Cargando...</div>}>
        <ListaDeClubes />
      </Suspense>
    </div>
  );
}