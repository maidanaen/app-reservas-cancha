"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Megaphone, Send, Pencil, Eye, X, Save, Image as ImageIcon } from "lucide-react";

interface Noticia {
  id: number;
  titulo: string;
  cuerpo: string;
  fechaPublicacion: string;
  imagenUrl?: string; 
}

export default function AdminNoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [cargando, setCargando] = useState(false);

  // Estados nuevos para Editar, Ver Detalle y Archivo
  const [idEditar, setIdEditar] = useState<number | null>(null);
  const [noticiaVer, setNoticiaVer] = useState<Noticia | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);

  // 1. Cargar noticias
  const cargarNoticias = async () => {
    // 🟢 1. RECUPERAR ID (Llave maestra)
    const userId = localStorage.getItem("usuarioId");
    if (!userId) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        // 🟢 2. ENVIAR ID EN LA URL (Filtro por dueño)
        const res = await fetch(`https://localhost:7123/api/Noticias?usuarioId=${userId}`);
        if (res.ok) setNoticias(await res.json());
    } catch (error) { console.error("Error al cargar", error); }
  };

  useEffect(() => { cargarNoticias(); }, []);

  // 2. Manejar Envío (Crear o Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !cuerpo.trim()) return;

    // 🟢 RECUPERAMOS ID
    const userId = localStorage.getItem("usuarioId");
    if (!userId) return alert("Sesión expirada");

    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        // Usamos FormData para poder enviar archivos y texto
        const formData = new FormData();
        formData.append("Titulo", titulo); 
        formData.append("Cuerpo", cuerpo);
        
        // 🟢 3. IMPORTANTE: Agregamos el usuarioId al FormData
        formData.append("UsuarioId", userId);

        if (archivo) {
            formData.append("Imagen", archivo);
        }

        if (idEditar) {
            // MODO EDICIÓN (PUT)
            // Nota: Si tu backend soporta editar imagen, deberías usar PUT con FormData.
            // Por ahora mantenemos JSON para texto como tenías, pero agregando usuarioId.
            await fetch(`https://localhost:7123/api/Noticias/${idEditar}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    id: idEditar, 
                    titulo, 
                    cuerpo, 
                    fechaPublicacion: new Date().toISOString(),
                    usuarioId: Number(userId) // 🟢 Validamos propiedad al editar
                })
            });
            alert("✅ Noticia actualizada");
        } else {
            // MODO CREACIÓN (POST con Imagen)
            // Enviamos el FormData que ya incluye el UsuarioId dentro
            await fetch(`https://localhost:7123/api/Noticias?usuarioId=${userId}`, {
                method: "POST",
                body: formData 
            });
            alert("✅ Noticia publicada con éxito");
        }
        
        limpiarFormulario();
        cargarNoticias();

    } catch (error) {
        console.error(error);
        alert("Error al procesar");
    } finally {
        setCargando(false);
    }
  };

  const limpiarFormulario = () => {
      setTitulo("");
      setCuerpo("");
      setArchivo(null); 
      setIdEditar(null);
  };

  const iniciarEdicion = (n: Noticia) => {
      setTitulo(n.titulo);
      setCuerpo(n.cuerpo);
      setIdEditar(n.id);
      setArchivo(null); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const borrarNoticia = async (id: number) => {
    if (!confirm("¿Seguro que quieres borrar esta noticia?")) return;
    
    // 🟢 4. RECUPERAR ID PARA BORRADO SEGURO
    const userId = localStorage.getItem("usuarioId");
    if (!userId) return;

    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        // Enviamos ID en la URL para que el backend valide que es NUESTRA noticia
        await fetch(`https://localhost:7123/api/Noticias/${id}?usuarioId=${userId}`, { method: "DELETE" });
        cargarNoticias();
    } catch (error) { alert("Error al borrar"); }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 min-h-screen font-sans relative">
      
      {/* Encabezado */}
      <div className="flex items-center gap-4 mb-8 border-b pb-4 border-gray-200">
        <div className="p-3 bg-pink-100 text-pink-600 rounded-xl">
            <Megaphone size={32} />
        </div>
        <div>
            <h1 className="text-3xl font-black text-gray-900">Gestor de Noticias</h1>
            <p className="text-gray-500">Publica, edita y gestiona las novedades del club.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === FORMULARIO (Izquierda) === */}
        <div className="lg:col-span-1">
            <div className={`p-6 rounded-2xl shadow-sm border sticky top-24 transition-colors ${idEditar ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                <h2 className={`font-bold mb-4 flex items-center gap-2 ${idEditar ? 'text-blue-700' : 'text-gray-800'}`}>
                    {idEditar ? <><Pencil size={20}/> Editando Noticia #{idEditar}</> : <><Plus size={20}/> Nueva Publicación</>}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                        <input 
                            type="text" 
                            placeholder="Ej: 🏆 Torneo de Verano"
                            className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition font-bold text-gray-800"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contenido</label>
                        <textarea 
                            rows={6}
                            placeholder="Escribe aquí los detalles..."
                            className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition resize-none text-gray-700"
                            value={cuerpo}
                            onChange={(e) => setCuerpo(e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">Puedes usar emojis 🎾🔥🏆</p>
                    </div>

                    {/* === INPUT DE IMAGEN === */}
                    {!idEditar && (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition cursor-pointer relative group">
                            <input 
                                type="file" 
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setArchivo(e.target.files[0]);
                                    }
                                }}
                            />
                            <div className="flex flex-col items-center gap-1 text-gray-500 group-hover:text-pink-500 transition">
                                <ImageIcon size={24} className={archivo ? "text-green-500" : "text-gray-400"} />
                                <span className={`text-xs font-bold uppercase ${archivo ? "text-green-600" : ""}`}>
                                    {archivo ? "Foto seleccionada: " + archivo.name : "Subir foto (Opcional)"}
                                </span>
                            </div>
                            
                            {/* Botón para quitar foto */}
                            {archivo && (
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setArchivo(null); }} 
                                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 z-10"
                                    title="Quitar imagen"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        {idEditar && (
                            <button type="button" onClick={limpiarFormulario} className="px-4 py-3 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50">
                                Cancelar
                            </button>
                        )}
                        <button 
                            type="submit" 
                            disabled={cargando}
                            className={`flex-1 text-white py-3 rounded-xl font-bold transition flex justify-center items-center gap-2 shadow-lg 
                                ${idEditar ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
                        >
                            {cargando ? "Procesando..." : idEditar ? <><Save size={18}/> Guardar Cambios</> : <><Send size={18}/> Publicar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        {/* === LISTA DE NOTICIAS (Derecha) === */}
        <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-gray-800 mb-2">Publicaciones Activas ({noticias.length})</h2>
            
            {noticias.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                    <p className="text-gray-400 font-medium">No hay noticias publicadas.</p>
                </div>
            ) : (
                noticias.map((noticia) => (
                    <div key={noticia.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start gap-4 group hover:shadow-md transition">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg text-gray-900">{noticia.titulo}</h3>
                                {noticia.imagenUrl && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                        <ImageIcon size={12}/> Foto
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-600 text-sm whitespace-pre-line line-clamp-2 mb-2">{noticia.cuerpo}</p>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {new Date(noticia.fechaPublicacion).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setNoticiaVer(noticia)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Ver detalles"
                            >
                                <Eye size={20} />
                            </button>
                            <button 
                                onClick={() => iniciarEdicion(noticia)}
                                className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition"
                                title="Editar noticia"
                            >
                                <Pencil size={20} />
                            </button>
                            <button 
                                onClick={() => borrarNoticia(noticia.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>

      </div>

      {/* === MODAL VER DETALLES (Popup) === */}
      {noticiaVer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                
                <div className="bg-pink-50 p-6 border-b border-pink-100 flex justify-between items-start shrink-0">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900">{noticiaVer.titulo}</h3>
                        <p className="text-pink-600 text-sm font-bold mt-1">
                            Publicado el {new Date(noticiaVer.fechaPublicacion).toLocaleDateString()}
                        </p>
                    </div>
                    <button onClick={() => setNoticiaVer(null)} className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-500 transition shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-0 overflow-y-auto">
                    {/* Si tiene imagen, la mostramos en grande aquí */}
                    {noticiaVer.imagenUrl && (
                        <div className="w-full height-50% bg-gray-100">
                            <img 
                                src={noticiaVer.imagenUrl} 
                                alt={noticiaVer.titulo} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    
                    <div className="p-8">
                        <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-line">
                            {noticiaVer.cuerpo}
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 text-right shrink-0">
                    <button onClick={() => setNoticiaVer(null)} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}

    </main>
  );
}