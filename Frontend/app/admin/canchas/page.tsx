"use client";
import { useEffect, useState } from "react";
import { 
    Plus, Edit2, Trash2, LayoutGrid, Users, 
    Trophy, X, Save, Image as ImageIcon, Clock, Lock, Phone, User, Activity, CheckCircle,
    PauseCircle, PlayCircle, AlertTriangle // Importamos los iconos necesarios
} from "lucide-react";

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
    const [activeTab, setActiveTab] = useState<'infra' | 'salas'>('infra');

    // --- ESTADOS: CANCHAS ---
    const [canchas, setCanchas] = useState<Cancha[]>([]);
    const [showModalCancha, setShowModalCancha] = useState(false);
    
    // 🟢 ACTUALIZADO: Inicializamos activa en true
    const [canchaForm, setCanchaForm] = useState<Partial<Cancha>>({ 
        nombre: "", deporte: "Padel", precioPorHora: 0, techada: false,
        imgUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1000&auto=format&fit=crop", 
        horaApertura: 8, horaCierre: 23, activa: true
    });
    const [isEditingCancha, setIsEditingCancha] = useState(false);

    // --- ESTADOS: SALAS (PARTIDOS) ---
    const [salas, setSalas] = useState<SalaPartido[]>([]);
    const [showModalSala, setShowModalSala] = useState(false); 
    const [salaForm, setSalaForm] = useState<Partial<SalaPartido>>({}); 

    useEffect(() => {
        if (activeTab === 'infra') cargarCanchas();
        if (activeTab === 'salas') cargarSalas();
    }, [activeTab]);

    // --- CARGAR DATOS ---
    const cargarCanchas = async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const res = await fetch("https://localhost:7123/api/Canchas");
            if (res.ok) setCanchas(await res.json());
        } catch (error) { console.error(error); }
    };

    const cargarSalas = async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const res = await fetch("https://localhost:7123/api/Partidos?todo=true"); 
            if (res.ok) {
                const data = await res.json();
                const partidosMapeados = data.map((p: any) => ({
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
                setSalas(partidosMapeados);
            }
        } catch (error) { console.error(error); }
    };

    // --- LOGICA CANCHAS ---
    const guardarCancha = async () => {
        if (!canchaForm.nombre || !canchaForm.precioPorHora) return alert("Faltan datos");
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const url = isEditingCancha ? `https://localhost:7123/api/Canchas/${canchaForm.id}` : "https://localhost:7123/api/Canchas";
        const method = isEditingCancha ? "PUT" : "POST";
        try {
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(canchaForm) });
            if (res.ok) { setShowModalCancha(false); cargarCanchas(); }
        } catch (e) { console.error(e); }
    };

    const eliminarCancha = async (id: number) => {
        if (!confirm("Se borrará la cancha. ¿Seguir?")) return;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        await fetch(`https://localhost:7123/api/Canchas/${id}`, { method: "DELETE" });
        cargarCanchas();
    };

    // 🟢 NUEVA LÓGICA: Alternar estado Activa/Pausada
    const toggleEstadoCancha = async (cancha: Cancha) => {
        const nuevoEstado = !cancha.activa;
        const confirmacion = confirm(nuevoEstado 
            ? `¿Reactivar "${cancha.nombre}"?` 
            : `¿Pausar "${cancha.nombre}"? No se podrá reservar.`);
        
        if (!confirmacion) return;

        // Copiamos la cancha y cambiamos solo el estado
        const canchaActualizada = { ...cancha, activa: nuevoEstado };

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const res = await fetch(`https://localhost:7123/api/Canchas/${cancha.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(canchaActualizada)
            });

            if (res.ok) cargarCanchas();
        } catch (error) { console.error(error); }
    };

    const abrirModalCancha = (cancha?: Cancha) => {
        if (cancha) { setCanchaForm(cancha); setIsEditingCancha(true); }
        else { 
            // 🟢 Reseteamos el formulario incluyendo activa: true
            setCanchaForm({ 
                nombre: "", deporte: "Padel", precioPorHora: 0, techada: false, 
                imgUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1000&auto=format&fit=crop", 
                horaApertura: 8, horaCierre: 23, activa: true 
            }); 
            setIsEditingCancha(false); 
        }
        setShowModalCancha(true);
    };

    // --- LOGICA SALAS (PARTIDOS) ---
    const abrirEditarSala = (sala: SalaPartido) => { setSalaForm(sala); setShowModalSala(true); };

    const guardarSala = async () => {
        if (!salaForm.id) return;
        const partidoBackend = {
            id: salaForm.id,
            creador: salaForm.organizador,
            contacto: salaForm.contacto || "",
            fecha: salaForm.fecha,
            hora: salaForm.hora,
            nivel: salaForm.nivel || "Amateur",
            jugadoresFaltantes: salaForm.faltan,
            claveBorrado: salaForm.clave,
            deporte: salaForm.deporte,
            lugar: salaForm.canchaNombre
        };

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const res = await fetch(`https://localhost:7123/api/Partidos/${salaForm.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(partidoBackend)
            });
            if (res.ok) { setShowModalSala(false); cargarSalas(); }
        } catch (error) { console.error(error); }
    };

    const eliminarSala = async (id: number) => {
        if(!confirm("¿Eliminar este partido público?")) return;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        await fetch(`https://localhost:7123/api/Partidos/admin/${id}`, { method: "DELETE" });
        cargarSalas();
    };

    return (
        <main className="max-w-7xl mx-auto p-6 font-sans bg-gray-50 min-h-screen">
            
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

            {/* PESTAÑA 1: INFRAESTRUCTURA */}
            {activeTab === 'infra' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => abrirModalCancha()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200">
                            <Plus size={18}/> Nueva Cancha
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-400 border-b border-gray-100">
                                <tr>
                                    <th className="p-5 pl-8">Cancha</th>
                                    <th className="p-5">Horario</th>
                                    <th className="p-5">Precio Hora</th>
                                    {/* 🟢 NUEVO HEADER */}
                                    <th className="p-5">Estado</th>
                                    <th className="p-5  text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {canchas.map(c => (
                                    // 🟢 ROW CON ESTILO GRIS SI ESTÁ PAUSADA
                                    <tr key={c.id} className={`transition group ${c.activa ? 'hover:bg-blue-50/30' : 'bg-gray-50/80 grayscale'}`}>
                                        <td className="p-5 pl-8">
                                            <div className="flex items-center gap-3">
                                                {/* 🟢 IMAGEN OPACA SI ESTÁ PAUSADA */}
                                                <img src={c.imgUrl} alt={c.nombre} className="w-20 h-14 rounded-full object-cover bg-gray-200"/>
                                                <div>
                                                    <div className="font-bold text-slate-900">{c.nombre}</div>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">{c.deporte}</span>
                                                        {c.techada && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Techada 🏠</span>}
                                                        {!c.techada && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Descubierta☀️s</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-gray-500 font-medium">{c.horaApertura}:00 - {c.horaCierre}:00</td>
                                        <td className="p-8 font-mono font-bold text-slate-900">${(c.precioPorHora || 0).toLocaleString()}</td>
                                        
                                        {/* 🟢 NUEVA COLUMNA ESTADO */}
                                        <td className="p-5">
                                            {c.activa ? (
                                                <span className="text-xs font-bold text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded w-fit">
                                                    Disponible
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded w-fit border border-orange-100">
                                                    <AlertTriangle size={12}/> Mantenimiento
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-5 text-right flex justify-end gap-2 items-center">
                                            {/* 🟢 BOTÓN DE PAUSA/PLAY */}
                                            <button 
                                                onClick={() => toggleEstadoCancha(c)} 
                                                className={`p-2 rounded-lg transition flex items-center gap-2 ${c.activa ? 'text-orange-400 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50 bg-white shadow-sm border border-green-100'}`}
                                                title={c.activa ? "Pausar Cancha" : "Activar Cancha"}
                                            >
                                                {c.activa ? <PauseCircle size={20}/> : <><PlayCircle size={20}/><span className="text-xs font-bold">Activar</span></>}
                                            </button>

                                            <div className="w-px h-4 bg-gray-200 mx-1"></div>

                                            <button onClick={() => abrirModalCancha(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18}/></button>
                                            <button onClick={() => eliminarCancha(c.id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PESTAÑA 2: PARTIDOS PÚBLICOS (SALAS) */}
            {activeTab === 'salas' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                         <div className="p-6 border-b border-gray-100 bg-yellow-50/50 flex gap-3 items-center">
                            <Trophy className="text-yellow-600" size={24}/>
                            <div>
                                <h3 className="font-bold text-slate-900">Partidos Públicos</h3>
                                <p className="text-xs text-gray-500">Partidos creados por usuarios. Puedes editar sus datos o borrarlos.</p>
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-400 border-b border-gray-100">
                                <tr>
                                    <th className="p-5 pl-8">Fecha/Hora</th>
                                    <th className="p-5">Cancha/Lugar</th>
                                    <th className="p-5">Organizador</th>
                                    <th className="p-5 text-center">Faltan</th>
                                    <th className="p-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {salas.length === 0 ? (
                                    <tr><td colSpan={5} className="p-10 text-center text-gray-400">No hay partidos públicos activos.</td></tr>
                                ) : (
                                    salas.map(s => (
                                        <tr key={s.id} className="hover:bg-yellow-50/30 transition">
                                            <td className="p-5 pl-8">
                                                <div className="font-bold text-slate-900">{new Date(s.fecha).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-500 font-bold">{s.hora ? `${s.hora}hs` : "---"}</div>
                                            </td>
                                            <td className="p-5">
                                                <div className="font-bold text-slate-700">{s.canchaNombre}</div>
                                                <span className="text-[10px] text-gray-400 uppercase font-bold">{s.deporte}</span>
                                            </td>
                                            <td className="p-5 text-blue-600 font-bold">{s.organizador}</td>
                                            <td className="p-5 text-center">
                                                {s.faltan <= 0 ? (
                                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-black text-xs flex items-center justify-center gap-1">
                                                        <CheckCircle size={12}/> Completo
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full font-black text-xs">
                                                        -{s.faltan}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-5 text-right flex justify-end gap-2">
                                                <button onClick={() => abrirEditarSala(s)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg" title="Editar / Ver Clave">
                                                    <Edit2 size={18}/>
                                                </button>
                                                <button onClick={() => eliminarSala(s.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg" title="Borrar">
                                                    <Trash2 size={18}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL CANCHA (CREAR/EDITAR) */}
            {showModalCancha && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900">{isEditingCancha ? "Editar Cancha" : "Nueva Cancha"}</h2>
                            <button onClick={() => setShowModalCancha(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                             <div><label className="text-xs font-bold text-gray-400 uppercase">Nombre</label><input type="text" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={canchaForm.nombre} onChange={e => setCanchaForm({...canchaForm, nombre: e.target.value})}/></div>
                             <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-400 uppercase">Deporte</label><select className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={canchaForm.deporte} onChange={e => setCanchaForm({...canchaForm, deporte: e.target.value})}><option value="Padel">Padel</option><option value="Futbol">Fútbol</option><option value="Tenis">Tenis</option></select></div>
                                <div><label className="text-xs font-bold text-gray-400 uppercase">Precio</label><input type="number" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={canchaForm.precioPorHora} onChange={e => setCanchaForm({...canchaForm, precioPorHora: Number(e.target.value)})}/></div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-gray-400 uppercase">Apertura</label><input type="number" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={canchaForm.horaApertura} onChange={e => setCanchaForm({...canchaForm, horaApertura: Number(e.target.value)})}/></div>
                                <div><label className="text-xs font-bold text-gray-400 uppercase">Cierre</label><input type="number" className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={canchaForm.horaCierre} onChange={e => setCanchaForm({...canchaForm, horaCierre: Number(e.target.value)})}/></div>
                             </div>
                             <div><label className="text-xs font-bold text-gray-400 uppercase">Imagen URL</label><input type="text" className="w-full p-3 bg-gray-50 rounded-xl font-medium text-xs" value={canchaForm.imgUrl} onChange={e => setCanchaForm({...canchaForm, imgUrl: e.target.value})}/></div>
                             
                             {/* 🟢 NUEVO: Selector de Estado en el Modal */}
                             <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer" onClick={() => setCanchaForm({...canchaForm, activa: !canchaForm.activa})}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${canchaForm.activa ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                    {canchaForm.activa && <span className="text-white text-xs">✓</span>}
                                </div>
                                <span className="text-sm font-bold text-slate-700">Cancha Activa (Disponible para reservas)</span>
                            </div>

                             <button onClick={guardarCancha} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition flex justify-center items-center gap-2 mt-2"><Save size={20}/> Guardar</button>
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
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                        <Activity size={12}/> Nivel
                                    </label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-900" 
                                        value={salaForm.nivel || ""} 
                                        onChange={e => setSalaForm({...salaForm, nivel: e.target.value})}
                                        placeholder="Ej: 5ta, Amateur..."
                                    />
                                </div>
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