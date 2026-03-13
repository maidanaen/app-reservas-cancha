"use client";
import { useEffect, useState } from "react";
import { 
    Plus, Edit2, Trash2, LayoutGrid, Users, 
    X, Save, PauseCircle, PlayCircle, AlertCircle, Sun, Warehouse, 
    Calendar, Phone, User, CheckCircle, Lock
} from "lucide-react";
import { API_URL } from '@/utils/config';
import useSWR from 'swr';
import { fetcher } from '@/utils/fetcher';
import { useRouter } from 'next/navigation';

// --- INTERFACES ---
interface Cancha {
    id: number;
    nombre: string;
    deporte: string; 
    precioPorHora: number;
    techada: boolean;
    imgUrl: string;
    horaApertura: number;
    horaCierre: number;
    activa: boolean;
    usuarioId: number; 
}

interface SalaPartido {
    id: number;
    fecha: string;
    hora: string;       
    canchaNombre: string; 
    deporte: string;
    organizador: string; 
    faltan: number;      
    clave: string;       
    contacto?: string;   
    nivel?: string;      
}

export default function GestionCanchasPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'infra' | 'salas'>('infra');

    // --- ESTADOS: CANCHAS ---
    const [showModalCancha, setShowModalCancha] = useState(false);
    
    const [canchaForm, setCanchaForm] = useState<Partial<Cancha>>({ 
        nombre: "", deporte: "Padel", precioPorHora: 0, techada: false,
        imgUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1000&auto=format&fit=crop", 
        horaApertura: 8, horaCierre: 23, activa: true
    });
    const [isEditingCancha, setIsEditingCancha] = useState(false);

    // --- ESTADOS: MODALES DE CONFIRMACIÓN (Canchas) ---
    const [canchaAEditarEstado, setCanchaAEditarEstado] = useState<Cancha | null>(null);
    const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
    
    const [canchaAEliminar, setCanchaAEliminar] = useState<Cancha | null>(null);
    const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);

    // --- ESTADOS: MODALES DE CONFIRMACIÓN (Salas/Partidos)
    const [salaAEliminar, setSalaAEliminar] = useState<SalaPartido | null>(null);
    const [mostrarModalEliminarSala, setMostrarModalEliminarSala] = useState(false);

    // --- NOTIFICACIONES ---
    const [notificacion, setNotificacion] = useState<{ tipo: 'error' | 'exito', msj: string } | null>(null);

    // --- ESTADOS: SALAS (PARTIDOS) ---
    const [showModalSala, setShowModalSala] = useState(false); 
    const [salaForm, setSalaForm] = useState<Partial<SalaPartido>>({}); 

    const userId = typeof window !== 'undefined' ? localStorage.getItem("usuarioId") : null;
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

    // --- CARGA CON SWR ---
    const { data: canchasData, mutate: recargarCanchas } = useSWR(
        userId && token ? `${API_URL}/api/Canchas?usuarioId=${userId}` : null,
        fetcher
    );
    const canchas: Cancha[] = canchasData || [];

    const { data: salasData, mutate: recargarSalas } = useSWR(
        userId && token ? `${API_URL}/api/Partidos?usuarioId=${userId}` : null,
        fetcher
    );
    const salasRaw: any[] = salasData || [];
    const salas: SalaPartido[] = salasRaw.map((p: any) => ({
        id: p.id,
        fecha: p.fecha,
        hora: p.hora,
        canchaNombre: p.lugar || "Sin ubicación",
        deporte: p.deporte || "Padel",
        organizador: p.creador || "Anónimo",
        faltan: p.jugadoresFaltantes,
        clave: p.claveBorrado,
        contacto: p.contacto,
        nivel: p.nivel
    }));

    useEffect(() => {
        if (!token && typeof window !== 'undefined') {
            router.push("/admin/login");
        }
    }, [token, router]);

    const mostrarMensaje = (tipo: 'error' | 'exito', msj: string) => {
        setNotificacion({ tipo, msj });
        setTimeout(() => setNotificacion(null), 4000);
    };

    const cargarCanchas = () => recargarCanchas();
    const cargarSalas = () => recargarSalas();

    // --- LOGICA CANCHAS ---
    
    const guardarCancha = async () => {
        if (!canchaForm.nombre || !canchaForm.precioPorHora) return mostrarMensaje('error', "Faltan datos");

        const userId = localStorage.getItem("usuarioId");
        const token = localStorage.getItem("token");
        if (!userId || !token) {
            mostrarMensaje('error', "Sesión expirada.");
            return;
        }

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const url = isEditingCancha ? `${API_URL}/api/Canchas/${canchaForm.id}` : `${API_URL}/api/Canchas`;
        const method = isEditingCancha ? "PUT" : "POST";

        const canchaParaGuardar = {
            ...canchaForm,
            usuarioId: Number(userId) 
        };

        try {
            const res = await fetch(url, { 
                method, 
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                }, 
                body: JSON.stringify(canchaParaGuardar) 
            });
            if (res.ok) { 
                setShowModalCancha(false); 
                cargarCanchas(); 
                mostrarMensaje('exito', isEditingCancha ? "Cancha actualizada" : "Cancha creada");
            }
            else { mostrarMensaje('error', "Error al guardar"); }
        } catch (e) { console.error(e); }
    };

    const iniciarEliminacion = (cancha: Cancha) => {
        setCanchaAEliminar(cancha);
        setMostrarModalEliminar(true);
    };

    const confirmarEliminacion = async () => {
        if (!canchaAEliminar) return;
        const userId = localStorage.getItem("usuarioId");
        const token = localStorage.getItem("token");
        if(!userId || !token) return;

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            await fetch(`${API_URL}/api/Canchas/${canchaAEliminar.id}?usuarioId=${userId}`, { 
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` } 
            });
            mostrarMensaje('exito', "Cancha eliminada correctamente");
            cargarCanchas();
        } catch (error) { mostrarMensaje('error', "Error al eliminar"); } 
        finally { setMostrarModalEliminar(false); setCanchaAEliminar(null); }
    };

    const iniciarToggleEstado = (cancha: Cancha) => {
        setCanchaAEditarEstado(cancha);
        setMostrarModalConfirmacion(true);
    };

    const confirmarToggleEstado = async () => {
        if(!canchaAEditarEstado) return;
        const userId = localStorage.getItem("usuarioId");
        const token = localStorage.getItem("token");
        if(!userId || !token) return;

        const nuevoEstado = !canchaAEditarEstado.activa;
        const canchaActualizada = { ...canchaAEditarEstado, activa: nuevoEstado, usuarioId: Number(userId) };

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const res = await fetch(`${API_URL}/api/Canchas/${canchaAEditarEstado.id}`, {
                method: "PUT", 
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                }, 
                body: JSON.stringify(canchaActualizada)
            });
            if (res.ok) { cargarCanchas(); mostrarMensaje('exito', nuevoEstado ? "Cancha Habilitada" : "Cancha Pausada"); }
        } catch (error) { console.error(error); }
        finally { setMostrarModalConfirmacion(false); setCanchaAEditarEstado(null); }
    };

    const abrirModalCancha = (cancha?: Cancha) => {
        if (cancha) { setCanchaForm(cancha); setIsEditingCancha(true); }
        else { 
            setCanchaForm({ nombre: "", deporte: "Padel", precioPorHora: 0, techada: false, imgUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1000&auto=format&fit=crop", horaApertura: 8, horaCierre: 23, activa: true }); 
            setIsEditingCancha(false); 
        }
        setShowModalCancha(true);
    };

    // --- LOGICA SALAS (PARTIDOS) ---
    const abrirEditarSala = (sala: SalaPartido) => { setSalaForm(sala); setShowModalSala(true); };

    const guardarSala = async () => {
        if (!salaForm.id) return;
        const token = localStorage.getItem("token");
        if (!token) return;

        const partidoBackend = {
            id: salaForm.id,
            creador: salaForm.organizador,
            contacto: salaForm.contacto || "",
            fecha: salaForm.fecha,
            hora: salaForm.hora,
            jugadoresFaltantes: salaForm.faltan,
            claveBorrado: salaForm.clave,
            deporte: salaForm.deporte,
            lugar: salaForm.canchaNombre
        };

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const res = await fetch(`${API_URL}/api/Partidos/${salaForm.id}`, {
                method: "PUT", 
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                }, 
                body: JSON.stringify(partidoBackend)
            });
            if (res.ok) { setShowModalSala(false); cargarSalas(); mostrarMensaje('exito', "Partido actualizado"); }
        } catch (error) { console.error(error); }
    };

    // 🟢 NUEVA LÓGICA DE ELIMINACIÓN DE SALA (Con Modal)
    const iniciarEliminacionSala = (sala: SalaPartido) => {
        setSalaAEliminar(sala);
        setMostrarModalEliminarSala(true);
    };

    const confirmarEliminacionSala = async () => {
        if (!salaAEliminar) return;
        const token = localStorage.getItem("token");
        if (!token) return;

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            await fetch(`${API_URL}/api/Partidos/admin/${salaAEliminar.id}`, { 
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            mostrarMensaje('exito', "Partido público eliminado");
            cargarSalas();
        } catch (error) { mostrarMensaje('error', "Error al eliminar"); }
        finally { setMostrarModalEliminarSala(false); setSalaAEliminar(null); }
    };

    return (
        <main className="max-w-7xl mx-auto p-6 font-sans bg-gray-50 min-h-screen">
            
            {/* 🔔 NOTIFICACIÓN FLOTANTE */}
            {notificacion && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 border ${
                    notificacion.tipo === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'
                }`}>
                    {notificacion.tipo === 'error' ? <AlertCircle size={24}/> : <CheckCircle size={24}/>}
                    <p className="font-bold">{notificacion.msj}</p>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Gestión de Canchas</h1>
                    <p className="text-gray-500 font-medium">Administra tu infraestructura y supervisa partidos.</p>
                </div>
                
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                    <button onClick={() => setActiveTab('infra')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'infra' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <LayoutGrid size={16}/> Mis Canchas
                    </button>
                    <button onClick={() => setActiveTab('salas')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'salas' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Users size={16}/> Partidos Públicos
                    </button>
                </div>
            </div>

            {/* PESTAÑA 1: INFRAESTRUCTURA (Tarjetas) */}
            {activeTab === 'infra' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => abrirModalCancha()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200">
                            <Plus size={18}/> Nueva Cancha
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {canchas.map((c) => (
                            <div key={c.id} className={`bg-white p-4 rounded-2xl border flex flex-col md:flex-row items-center gap-6 transition-all duration-300 ${!c.activa ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
                                <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden relative shrink-0">
                                    <img src={c.imgUrl || "https://via.placeholder.com/300"} alt={c.nombre} className={`w-full h-full object-cover ${!c.activa && 'grayscale opacity-70'}`} />
                                    {!c.activa && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                            <span className="bg-orange-500 text-white text-xs font-black px-2 py-1 rounded shadow-sm">EN MANTENIMIENTO</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 w-full md:w-auto text-center md:text-left">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                        <h3 className="text-xl font-black text-slate-900">{c.nombre}</h3>
                                        <div className="flex justify-center md:justify-start gap-1">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded">{c.deporte}</span>
                                            {c.techada ? <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold uppercase rounded flex items-center gap-1"><Warehouse size={10}/> Techada</span> : <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold uppercase rounded flex items-center gap-1"><Sun size={10}/> Aire Libre</span>}
                                        </div>
                                    </div>
                                    <div className="flex justify-center md:justify-start gap-6 text-sm text-slate-500 font-medium mb-4">
                                        <span>⏱ {c.horaApertura}:00 - {c.horaCierre}:00 hs</span>
                                        <span className="text-slate-900 font-bold">${c.precioPorHora.toLocaleString()} /hr</span>
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-2">
                                        <button onClick={() => iniciarToggleEstado(c)} className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border transition ${c.activa ? 'bg-white border-gray-200 text-gray-500 hover:text-orange-500 hover:border-orange-200' : 'bg-green-500 text-white border-green-500 hover:bg-green-600'}`}>
                                            {c.activa ? <><PauseCircle size={16}/> Pausar</> : <><PlayCircle size={16}/> Activar</>}
                                        </button>
                                        <button onClick={() => abrirModalCancha(c)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={18}/></button>
                                        <button onClick={() => iniciarEliminacion(c)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PESTAÑA 2: PARTIDOS PÚBLICOS (Diseño Mejorado) */}
            {activeTab === 'salas' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid gap-4">
                        {salas.length === 0 ? (
                            <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-gray-300 text-gray-400">
                                No hay partidos públicos activos en tus canchas.
                            </div>
                        ) : (
                            salas.map(s => (
                                <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col md:flex-row items-center gap-6">
                                    {/* FECHA Y HORA */}
                                    <div className="flex flex-col items-center md:items-start min-w-[120px] text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
                                        <div className="text-sm font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wide">
                                            <Calendar size={14}/> {new Date(s.fecha).toLocaleDateString()}
                                        </div>
                                        <div className="text-3xl font-black text-slate-900">{s.hora}hs</div>
                                    </div>

                                    {/* INFO PRINCIPAL */}
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <h3 className="text-lg font-black text-slate-900 mb-1">{s.canchaNombre}</h3>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-slate-500 font-medium">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold uppercase">{s.deporte}</span>
                                            <span className="flex items-center gap-1"><User size={14} className="text-blue-500"/> Org: <strong className="text-blue-600">{s.organizador}</strong></span>
                                            
                                        </div>
                                    </div>

                                    {/* ESTADO Y CLAVE */}
                                    <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                        {s.faltan <= 0 ? (
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-black text-xs flex items-center gap-1 w-full md:w-auto justify-center">
                                                <CheckCircle size={12}/> Completo
                                            </span>
                                        ) : (
                                            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full font-black text-xs w-full md:w-auto text-center border border-red-100">
                                                Faltan {s.faltan}
                                            </span>
                                        )}
                                        
                                        <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100" title="Clave de borrado">
                                            <Lock size={12} className="text-yellow-600"/>
                                            <span className="text-xs font-mono font-bold text-yellow-700">{s.clave}</span>
                                        </div>
                                    </div>

                                    {/* ACCIONES */}
                                    <div className="flex gap-2 w-full md:w-auto justify-center border-t md:border-t-0 pt-4 md:pt-0">
                                        <button onClick={() => abrirEditarSala(s)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition"><Edit2 size={18}/></button>
                                        <button onClick={() => iniciarEliminacionSala(s)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN (TOGGLE ESTADO CANCHA) */}
            {mostrarModalConfirmacion && canchaAEditarEstado && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${canchaAEditarEstado.activa ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            {canchaAEditarEstado.activa ? <PauseCircle size={32}/> : <PlayCircle size={32}/>}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">{canchaAEditarEstado.activa ? "¿Pausar esta cancha?" : "¿Reactivar cancha?"}</h3>
                        <p className="text-gray-500 mb-6 text-sm">El estado de la cancha cambiará inmediatamente.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setMostrarModalConfirmacion(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                            <button onClick={confirmarToggleEstado} className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition ${canchaAEditarEstado.activa ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>{canchaAEditarEstado.activa ? "Sí, Pausar" : "Sí, Activar"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR CANCHA */}
            {mostrarModalEliminar && canchaAEliminar && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-red-500">
                        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">¿Eliminar cancha?</h3>
                        <p className="text-gray-500 mb-6 text-sm">Esta acción es irreversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setMostrarModalEliminar(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                            <button onClick={confirmarEliminacion} className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl shadow-lg transition">Sí, Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR SALA (PARTIDO) */}
            {mostrarModalEliminarSala && salaAEliminar && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-red-500">
                        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">¿Borrar Partido?</h3>
                        <p className="text-gray-500 mb-6 text-sm">Estás a punto de cancelar el partido organizado por <strong>{salaAEliminar.organizador}</strong>.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setMostrarModalEliminarSala(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                            <button onClick={confirmarEliminacionSala} className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl shadow-lg transition">Sí, Borrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CANCHA (CREAR/EDITAR) - Mismo código... */}
            {showModalCancha && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900">{isEditingCancha ? "Editar Cancha" : "Nueva Cancha"}</h2>
                            <button onClick={() => setShowModalCancha(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            {/* FORMULARIO DE CANCHA... (Igual que antes) */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
                                <input type="text" className="w-full p-3 bg-gray-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-slate-900" value={canchaForm.nombre} onChange={e => setCanchaForm({...canchaForm, nombre: e.target.value})}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Deporte</label>
                                    <select className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none" value={canchaForm.deporte} onChange={e => setCanchaForm({...canchaForm, deporte: e.target.value})}>
                                        <option value="Padel">Padel</option>
                                        <option value="Futbol">Fútbol</option>
                                        <option value="Tenis">Tenis</option>
                                        <option value="Voley">Voley</option>
                                        <option value="Basket">Basket</option>
                                        <option value="Others">Otros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Cobertura</label>
                                    <select className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none" value={canchaForm.techada ? "true" : "false"} onChange={e => setCanchaForm({...canchaForm, techada: e.target.value === "true"})}>
                                        <option value="false">☀️ Descubierta</option>
                                        <option value="true">🏠 Techada</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Precio por Hora</label>
                                <input type="number" className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-slate-900" value={canchaForm.precioPorHora} onChange={e => setCanchaForm({...canchaForm, precioPorHora: Number(e.target.value)})}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Apertura</label>
                                    <input type="number" className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none" value={canchaForm.horaApertura} onChange={e => setCanchaForm({...canchaForm, horaApertura: Number(e.target.value)})}/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Cierre</label>
                                    <input type="number" className="w-full p-3 bg-gray-50 rounded-xl font-bold outline-none" value={canchaForm.horaCierre} onChange={e => setCanchaForm({...canchaForm, horaCierre: Number(e.target.value)})}/>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Imagen URL</label>
                                <input type="text" className="w-full p-3 bg-gray-50 rounded-xl font-medium text-xs outline-none" value={canchaForm.imgUrl} onChange={e => setCanchaForm({...canchaForm, imgUrl: e.target.value})}/>
                            </div>
                            <button onClick={guardarCancha} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition flex justify-center items-center gap-2 mt-2">
                                <Save size={20}/> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SALA (EDITAR PARTIDO) */}
            {showModalSala && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900">Editar Partido</h2>
                            <button onClick={() => setShowModalSala(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
                        </div>
                        {/* FORMULARIO DE SALA... (Igual que antes) */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><User size={12}/> Creador</label>
                                    <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-900" value={salaForm.organizador} onChange={e => setSalaForm({...salaForm, organizador: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Phone size={12}/> Contacto</label>
                                    <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-900" value={salaForm.contacto} onChange={e => setSalaForm({...salaForm, contacto: e.target.value})}/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Lugar</label>
                                    <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={salaForm.canchaNombre} onChange={e => setSalaForm({...salaForm, canchaNombre: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Hora</label>
                                    <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={salaForm.hora} onChange={e => setSalaForm({...salaForm, hora: e.target.value})}/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-400 uppercase">Faltan</label><input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={salaForm.faltan} onChange={e => setSalaForm({...salaForm, faltan: Number(e.target.value)})}/></div>
                                
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                <label className="block text-xs font-black text-yellow-600 uppercase mb-1 flex items-center gap-1"><Lock size={12}/> Contraseña del Cliente</label>
                                <input type="text" className="w-full p-3 bg-white border border-yellow-200 rounded-xl font-mono text-lg font-bold text-slate-900 tracking-wider text-center focus:ring-2 focus:ring-yellow-400 outline-none" value={salaForm.clave} onChange={e => setSalaForm({...salaForm, clave: e.target.value})}/>
                                <p className="text-[10px] text-yellow-600 mt-2 text-center font-medium">Esta es la clave que el usuario usa para borrar el partido.</p>
                            </div>
                            <button onClick={guardarSala} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition flex justify-center items-center gap-2 mt-4 shadow-lg"><Save size={20}/> Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}