"use client";
import { useEffect, useState } from "react";
import { Trophy, CalendarDays, Newspaper, X, Clock, Image as ImageIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { API_URL } from '@/utils/config';

interface Noticia {
  id: number;
  titulo: string;
  cuerpo: string;
  fechaPublicacion: string;
  imagenUrl?: string; // <--- Agregamos esto para leer la foto
}

export default function TorneosPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noticiaSeleccionada, setNoticiaSeleccionada] = useState<Noticia | null>(null);

  // 🟢 2. Obtenemos los parámetros de la URL
  const searchParams = useSearchParams();
  // Si la URL es /torneos?clubId=4, esto vale "4". Si no, vale "0" (Feed Global).
  const clubId = searchParams.get("clubId") || "0"; 

  useEffect(() => {
    // Nota: process.env no suele funcionar dentro del navegador (useEffect), 
    // pero si lo tienes configurado en Next.js ignora este comentario.
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 

    setCargando(true);

    // 🟢 3. FETCH AL NUEVO ENDPOINT PÚBLICO
    // Usamos /api/Noticias/publicas y le pasamos el ID (0 o el del club)
    fetch(`${API_URL}/api/Noticias/publicas?usuarioId=${clubId}`)
      .then(res => {
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        return res.json();
      })
      .then(data => {
        setNoticias(data);
        setCargando(false);
      })
      .catch(err => {
        console.error(err);
        setCargando(false);
      });

  }, [clubId]);
  return (
    <main className="max-w-5xl mx-auto p-6 min-h-screen font-sans relative">
      
      {/* Encabezado */}
      <div className="flex items-center gap-4 mb-10 border-b pb-6 border-gray-100">
        <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl shadow-sm">
            <Trophy size={40} strokeWidth={1.5} />
        </div>
        <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Torneos y Noticias</h1>
            <p className="text-slate-500 font-medium mt-1">Novedades exclusivas de Nexus Sport</p>
        </div>
      </div>

      {cargando ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 animate-pulse">
            <Newspaper size={48} className="mb-4 opacity-20"/>
            <p>Cargando novedades...</p>
        </div>
      ) : noticias.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-700">Sin noticias recientes</h3>
            <p className="text-gray-400">Pronto publicaremos los próximos torneos.</p>
        </div>
      ) : (
        /* Lista de Noticias */
        <div className="grid gap-8">
          {noticias.map((noticia) => (
            <article key={noticia.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col md:flex-row">
                
                {/* LÓGICA VISUAL: ¿Tiene foto? */}
                {noticia.imagenUrl ? (
                    // OPCIÓN A: CON FOTO (Imagen a la izquierda/arriba)
                    <div className="w-full md:w-1/3 h-64 md:h-auto relative overflow-hidden bg-gray-100 cursor-pointer" onClick={() => setNoticiaSeleccionada(noticia)}>
                        <img 
                            src={noticia.imagenUrl} 
                            alt={noticia.titulo}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <ImageIcon size={12}/> {new Date(noticia.fechaPublicacion).toLocaleDateString()}
                        </div>
                    </div>
                ) : (
                    // OPCIÓN B: SIN FOTO (Diseño de fecha original)
                    <div className="bg-slate-900 text-white p-6 flex flex-col justify-center items-center md:min-w-[140px] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <span className="text-4xl font-black tracking-tighter">
                            {new Date(noticia.fechaPublicacion).getDate()}
                        </span>
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-400 mt-1">
                            {new Date(noticia.fechaPublicacion).toLocaleDateString('es-ES', { month: 'short' })}
                        </span>
                    </div>
                )}

                {/* Contenido Texto */}
                <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                        <h2 
                            className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors cursor-pointer"
                            onClick={() => setNoticiaSeleccionada(noticia)}
                        >
                            {noticia.titulo}
                        </h2>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line line-clamp-3">
                            {noticia.cuerpo}
                        </p>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                        <button 
                            onClick={() => setNoticiaSeleccionada(noticia)}
                            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition hover:underline"
                        >
                            Leer nota completa <span className="text-lg">→</span>
                        </button>
                    </div>
                </div>
            </article>
          ))}
        </div>
      )}

      {/* === MODAL DE LECTURA (POPUP) === */}
      {noticiaSeleccionada && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Cabecera / Imagen del Modal */}
                {noticiaSeleccionada.imagenUrl ? (
                    // Si hay imagen, la ponemos gigante arriba
                    <div className="w-full h-64 md:h-80 bg-gray-100 relative shrink-0">
                        <img 
                            src={noticiaSeleccionada.imagenUrl} 
                            alt={noticiaSeleccionada.titulo}
                            className="w-full h-full object-cover"
                        />
                        <button 
                            onClick={() => setNoticiaSeleccionada(null)}
                            className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition backdrop-blur-md"
                        >
                            <X size={24} />
                        </button>
                        {/* Gradiente para que el título se lea si decidimos ponerlo encima (opcional) */}
                    </div>
                ) : (
                    // Si no hay imagen, cabecera oscura simple
                    <div className="bg-slate-900 p-6 flex justify-between items-center shrink-0">
                        <span className="text-slate-400 font-bold">Novedades</span>
                        <button 
                            onClick={() => setNoticiaSeleccionada(null)}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}

                {/* Contenido del Modal */}
                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="p-8">
                        {/* Fecha */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-bold uppercase tracking-wider">
                                {new Date(noticiaSeleccionada.fechaPublicacion).toLocaleDateString()}
                            </span>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-6">
                            {noticiaSeleccionada.titulo}
                        </h2>

                        <div className="prose prose-lg max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
                            {noticiaSeleccionada.cuerpo}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 text-center shrink-0">
                    <button 
                        onClick={() => setNoticiaSeleccionada(null)}
                        className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200 transform hover:-translate-y-0.5"
                    >
                        Cerrar Noticia
                    </button>
                </div>
            </div>
        </div>
      )}

    </main>
  );
}