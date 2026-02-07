"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Search, MapPin, ArrowRight, Star, 
  Trophy, Filter, Zap, Users
} from "lucide-react";
import { API_URL } from '@/utils/config';

interface Cancha {
  id: number;
  nombre: string;
  deporte: string;
  horaApertura: number;
  horaCierre: number;
}

interface Club {
  clubId: number;        // 🟢 Ojo: El endpoint nuevo usa 'clubId', no 'id'
  nombreClub: string;    // 🟢 'nombreClub', no 'nombreNegocio'
  direccion?: string;
  canchas: Cancha[];     // 🟢 Ahora sí tenemos las canchas con horarios
  logoUrl?: string; 
  fotoUrl?: string; 
}

export default function HomePage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarClubes = async () => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
        // 🟢 USAMOS EL ENDPOINT NUEVO QUE TRAE HORARIOS
        const res = await fetch(`${API_URL}/api/Publico/sedes`);
        if (res.ok) {
          const data = await res.json();
          setClubes(data);
        }
      } catch (err) { console.error(err); } 
      finally { setCargando(false); }
    };
    cargarClubes();
  }, []);

  const clubesFiltrados = clubes.filter(c => 
    c.nombreClub?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // 🕒 Función para saber si el club está abierto AHORA
  const obtenerEstadoClub = (canchas: Cancha[]) => {
    if (!canchas || canchas.length === 0) return { texto: "SIN DATOS", color: "bg-gray-400" };

    const ahora = new Date();
    const horaActual = ahora.getHours(); // Ej: 14, 20, 23...

    // Un club está abierto si AL MENOS UNA de sus canchas está operativa
    const estaAbierto = canchas.some((c) => {
        const apertura = c.horaApertura; // Ej: 14
        const cierre = c.horaCierre;     // Ej: 23 (o 2 si cierra de madrugada)

        if (cierre < apertura) {
            // Caso especial: Cierra después de medianoche (Ej: Abre 18, Cierra 02)
            return horaActual >= apertura || horaActual < cierre;
        } else {
            // Caso normal: (Ej: Abre 09, Cierra 22)
            return horaActual >= apertura && horaActual < cierre;
        }
    });

    return estaAbierto 
        ? { texto: "ABIERTO", color: "bg-green-500" } 
        : { texto: "CERRADO", color: "bg-red-500" };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-orange-500 selection:text-white ">
      
      {/* 1. HERO SECTION */}
      <header className="relative bg-slate-900 h-[450px] flex flex-col items-center justify-center px-4 overflow-hidden pb-20">
         <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

            <div className="relative z-10 w-full max-w-3xl text-center space-y-6 ">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-orange-400 font-bold text-xs uppercase tracking-widest mb-2 animate-in fade-in slide-in-from-bottom-4">
                    <Zap size={14} className="fill-orange-400"/> Reserva en segundos
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                    Tu próximo partido <br/> empieza <span className="text-orange-500">aquí.</span>
                </h1>
                
                <p className="text-lg text-slate-300 max-w-xl mx-auto hidden md:block">
                    La plataforma oficial para reservar canchas en tu ciudad. Rápido, fácil y seguro.
                </p>

                <div className="mt-8 bg-white p-2 rounded-2xl shadow-2xl shadow-orange-500/10 flex items-center gap-2 transform transition-all hover:scale-[1.02]">
                    <div className="pl-4"><Search className="text-slate-400" size={24}/></div>
                    <input 
                        type="text" 
                        placeholder="Busca tu club (Ej: Floyd, Obrero)" 
                        className="flex-1 h-12 outline-none text-slate-900 font-bold placeholder:font-medium placeholder:text-slate-400 bg-transparent text-lg"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        autoFocus
                    />
                    <button className="hidden md:flex bg-orange-600 hover:bg-orange-700 text-white h-12 px-8 rounded-xl font-bold transition items-center gap-2">
                        Buscar
                    </button>
                </div>
            </div>
      </header>

      {/* 2. RESULTADOS */}
      <main className="max-w-7xl mx-auto -mt-20 relative z-20 p-6 md:p-20">
        
        <div className="flex items-center justify-between mb-6  mt-20 ">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Trophy className="text-orange-500" size={24}/> 
                {busqueda ? "Resultados de búsqueda" : "Clubes Oficiales"}
            </h2>
        </div>

        {cargando ? (
            <div className="grid md:grid-cols-3 gap-8">{[1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-3xl shadow-sm animate-pulse"></div>)}</div>
        ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {clubesFiltrados.map((club) => {
                    
                    // 🟢 CALCULAMOS EL ESTADO REAL
                    const estado = obtenerEstadoClub(club.canchas);

                    const logoUrl = club.logoUrl && club.logoUrl.trim() !== "" 
                        ? club.logoUrl 
                        : `https://ui-avatars.com/api/?name=${club.nombreClub}&background=0f172a&color=fff&size=128&bold=true`;
                    
                    const tienePortada = club.fotoUrl && club.fotoUrl.trim() !== "";

                    // Obtenemos lista única de deportes
                    const deportesUnicos = Array.from(new Set(club.canchas.map(c => c.deporte)));

                    return (
                        <div key={club.clubId} className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 flex flex-col">
                            
                            {/* HEADER DEGRADADO O FOTO */}
                            <div className="relative h-32 bg-slate-900">
                                {tienePortada ? (
                                    <img 
                                        src={club.fotoUrl} 
                                        alt={club.nombreClub} 
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800">
                                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                    </div>
                                )}
                                
                                {/* 🟢 BADGE ESTADO DINÁMICO */}
                                <div className={`absolute top-4 right-4 ${estado.color} text-white backdrop-blur border border-white/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm z-10`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{estado.texto}</span>
                                </div>

                                {/* LOGO CIRCULAR */}
                                <div className="absolute -bottom-10 left-6 z-10">
                                    <img 
                                        src={logoUrl} 
                                        alt="Logo Club" 
                                        className="w-24 h-24 rounded-full border-[5px] border-white shadow-lg bg-slate-900 object-cover" 
                                    />
                                </div>
                            </div>

                            {/* INFO */}
                            <div className="p-6 pt-12 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 leading-tight">
                                            {club.nombreClub}
                                        </h3>
                                        <p className="text-slate-500 text-sm mt-1 flex items-center gap-1 font-medium">
                                            <MapPin size={14} className="text-orange-500"/>
                                            Corrientes Capital
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                        <Star size={14} className="text-yellow-400 fill-yellow-400"/>
                                        <span className="text-sm font-bold text-slate-800">5.0</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-3 mb-6 flex-wrap">
                                    {deportesUnicos.length > 0 ? deportesUnicos.map(d => (
                                        <span key={d} className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wide rounded-md">{d}</span>
                                    )) : (
                                        <span className="px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-wide rounded-md">Sin canchas</span>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-50">
                                    <Link 
                                        href={`/reservar/?userId=${club.clubId}`}
                                        className="flex items-center justify-between w-full bg-slate-900 text-white py-3.5 px-6 rounded-xl font-bold hover:bg-orange-600 transition group-hover:shadow-lg group-hover:shadow-orange-500/20"
                                    >
                                        <span>Reservar Turno</span>
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </main>

      {/* 3. BANNER COMUNIDAD */}
      <section className="bg-white py-16 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl">
                {/* Decoración */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                
                <div className="relative z-10 max-w-xl text-center md:text-left">
                    <h2 className="text-3xl font-black text-white mb-2">¿Te falta uno para el partido? 🏃🏻‍♂️</h2>
                    <p className="text-slate-300">
                        Únete a la comunidad de Nexus Sport. Crea partidos públicos, encuentra rivales de tu nivel y no dejes de jugar.
                    </p>
                </div>
                <div className="relative z-10">
                    <Link href="/partidos" className="bg-white text-slate-900 px-8 py-4 rounded-xl font-black hover:bg-orange-500 hover:text-white transition shadow-lg flex items-center gap-2">
                        <Users size={20}/>
                        Buscar Partidos
                    </Link>
                </div>
            </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 py-10 text-center border-t border-slate-200">
            <p className="text-slate-400 font-bold text-sm">© 2026 NEXUS SPORT. Hecho con pasión en San Luis del Palmar, Corrientes.</p>
      </footer>
    </div>
  );
}