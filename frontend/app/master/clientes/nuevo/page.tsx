"use client";
import { useState, useEffect } from "react";
import { 
    Users, Plus, Lock, Unlock, Trash2, Edit, X, Save, Image as ImageIcon, LogOut, CheckCircle, AlertTriangle 
} from "lucide-react";
// Importamos la acción de cerrar sesión (asegúrate de tenerla en actions.ts)
import { logoutMaster } from "../../actions"; 
import { API_URL } from '@/utils/config';

interface Cliente {
    id: number;
    userName: string;
    nombreNegocio: string;
    logoUrl: string;
    fotoUrl: string;
    activo: boolean;
    fechaAlta: string;
}

export default function SuperAdminPanel() {
    // 1. ESTADOS (Ya no hay masterKey ni autorizado)
    const [clientes, setClientes] = useState<Cliente[]>([]);
    
    // Estados para crear
    const [newUser, setNewUser] = useState("");
    const [newPass, setNewPass] = useState("");
    const [newBusiness, setNewBusiness] = useState("");
    
    // Estados para editar
    const [editingClient, setEditingClient] = useState<Cliente | null>(null);
    const [editPass, setEditPass] = useState("");

    // 🟢 ESTADOS MODAL ELIMINAR (Diseño Personalizado Dark)
    const [clienteAEliminar, setClienteAEliminar] = useState<{ id: number, nombre: string } | null>(null);

    // 🟢 SISTEMA DE NOTIFICACIONES (TOAST)
    const [notificacion, setNotificacion] = useState<{ tipo: 'error' | 'exito', msj: string } | null>(null);

    const mostrarMensaje = (tipo: 'error' | 'exito', msj: string) => {
        setNotificacion({ tipo, msj });
        setTimeout(() => setNotificacion(null), 4000);
    };

    // 2. EFECTO DE CARGA AUTOMÁTICA
    // Como el Middleware ya nos protegió, cargamos los datos directo al entrar.
    useEffect(() => {
        cargarClientes();
    }, []);

    const cargarClientes = async () => { 
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        try { 
            const res = await fetch(`${API_URL}/api/SuperAdmin/clientes`); 
            if (res.ok) setClientes(await res.json()); 
        } catch (e) { console.error(e); } 
    };

    const crearCliente = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        
        if (!newUser || !newPass || !newBusiness) {
            mostrarMensaje('error', 'Debes completar todos los campos.');
            return;
        }

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        try {
            const res = await fetch(`${API_URL}/api/Auth/register`, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ username: newUser, password: newPass, nombreNegocio: newBusiness }) 
            }); 
            
            if (res.ok) {
                setNewUser(""); setNewPass(""); setNewBusiness(""); 
                cargarClientes(); 
                mostrarMensaje('exito', "✅ Cliente creado con éxito.");
            } else {
                mostrarMensaje('error', "No se pudo crear el cliente.");
            }
        } catch (error) {
            mostrarMensaje('error', "Error de conexión.");
        }
    };

    const toggleBloqueo = async (id: number, nombre: string, estadoActual: boolean) => { 
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        try {
            await fetch(`${API_URL}/api/SuperAdmin/toggle-estado/${id}`, { method: "PUT" });
            cargarClientes(); 
            mostrarMensaje('exito', estadoActual ? `🔒 ${nombre} bloqueado.` : `🔓 ${nombre} activado.`);
        } catch (error) {
            mostrarMensaje('error', "No se pudo cambiar el estado.");
        }
    };

    // 🟢 LÓGICA ELIMINAR CLIENTE
    const iniciarEliminarCliente = (id: number, nombre: string) => {
        setClienteAEliminar({ id, nombre });
    };

    const confirmarEliminarCliente = async () => { 
        if(!clienteAEliminar) return; 

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        try {
            const res = await fetch(`${API_URL}/api/SuperAdmin/eliminar/${clienteAEliminar.id}`, { method: "DELETE" }); 
            if(res.ok) { 
                mostrarMensaje('exito', `🗑️ Cliente eliminado.`); 
                cargarClientes(); 
            } else {
                mostrarMensaje('error', "Error al eliminar el cliente.");
            }
        } catch (error) {
            mostrarMensaje('error', "Error de conexión.");
        } finally {
            setClienteAEliminar(null);
        }
    };

    const guardarEdicion = async () => { 
        if(!editingClient) return; 
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        
        try {
            const res = await fetch(`${API_URL}/api/SuperAdmin/editar/${editingClient.id}`, { 
                method: "PUT", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ 
                    userName: editingClient.userName, 
                    nombreNegocio: editingClient.nombreNegocio, 
                    logoUrl: editingClient.logoUrl, 
                    fotoUrl: editingClient.fotoUrl,
                    password: editPass 
                }) 
            }); 
            
            if(res.ok) { 
                mostrarMensaje('exito', "✨ Datos actualizados correctamente."); 
                setEditingClient(null); 
                setEditPass(""); 
                cargarClientes(); 
            } else {
                mostrarMensaje('error', "Error al actualizar.");
            }
        } catch (error) {
            mostrarMensaje('error', "Error de conexión.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 font-sans text-white relative">
            
            {/* 🔔 NOTIFICACIÓN FLOTANTE (ESTILO DARK) */}
            {notificacion && (
                <div className={`fixed top-6 right-6 z-[70] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 border ${
                    notificacion.tipo === 'error' ? 'bg-red-950/80 text-red-400 border-red-900/50 backdrop-blur-md' : 'bg-green-950/80 text-green-400 border-green-900/50 backdrop-blur-md'
                }`}>
                    {notificacion.tipo === 'error' ? <AlertTriangle size={24}/> : <CheckCircle size={24}/>}
                    <div>
                        <h4 className="font-black text-sm uppercase text-white">{notificacion.tipo === 'error' ? 'Alerta' : 'Éxito'}</h4>
                        <p className="font-medium text-sm">{notificacion.msj}</p>
                    </div>
                    <button onClick={() => setNotificacion(null)} className="ml-4 text-gray-400 hover:text-white transition"><X size={18}/></button>
                </div>
            )}

            <main className="p-8 max-w-7xl mx-auto">
                
                {/* Header */}
                <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3 text-white"><Users className="text-blue-500"/> Mis Clientes</h1>
                        <p className="text-slate-400 mt-1">Administra las suscripciones de tu software.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-800 px-5 py-3 rounded-xl border border-slate-700 shadow-inner">
                            <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Total Clientes:</span>
                            <span className="text-2xl font-black ml-3 text-blue-400">{clientes.length}</span>
                        </div>
                    </div>
                </header>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* CREAR NUEVO */}
                    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 h-fit shadow-xl">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Plus size={20} className="text-green-400"/> Nuevo Cliente</h3>
                        <form onSubmit={crearCliente} className="space-y-5">
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 block">Negocio</label>
                                <input type="text" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" value={newBusiness} onChange={e => setNewBusiness(e.target.value)} placeholder="Ej: Padel Club"/>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 block">Usuario</label>
                                <input type="text" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="usuario123"/>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 block">Contraseña</label>
                                <input type="text" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="********"/>
                            </div>
                            <button className="w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-xl font-bold transition shadow-lg shadow-blue-900/50 mt-2 active:scale-95">Dar de Alta</button>
                        </form>
                    </div>

                    {/* LISTA DE CLIENTES */}
                    <div className="lg:col-span-2 bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900/80 text-xs uppercase text-slate-500 font-bold border-b border-slate-700">
                                    <tr>
                                        <th className="p-5">Negocio / Usuario</th>
                                        <th className="p-5 text-center">Alta</th>
                                        <th className="p-5 text-center">Estado</th>
                                        <th className="p-5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {clientes.length === 0 ? (
                                        <tr><td colSpan={4} className="p-10 text-center text-slate-500">No hay clientes registrados.</td></tr>
                                    ) : (
                                        clientes.map(c => (
                                            <tr key={c.id} className="hover:bg-slate-700/30 transition group">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-600 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                                                            {c.logoUrl ? (
                                                                <img src={c.logoUrl} alt="Logo" className="w-full h-full object-cover"/>
                                                            ) : (
                                                                <span className="text-sm font-black text-slate-500">{c.nombreNegocio ? c.nombreNegocio.substring(0,2).toUpperCase() : "CN"}</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white text-base">{c.nombreNegocio || "Sin nombre"}</div>
                                                            <div className="text-xs text-slate-400 font-mono mt-0.5">@{c.userName}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center text-sm text-slate-400 font-medium">{c.fechaAlta ? new Date(c.fechaAlta).toLocaleDateString() : "-"}</td>
                                                <td className="p-5 text-center">
                                                    {c.activo ? 
                                                        <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20 inline-block">Activo</span> : 
                                                        <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20 flex items-center justify-center gap-1 w-max mx-auto"><Lock size={12}/> Bloqueado</span>
                                                    }
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingClient(c)} className="p-2 bg-slate-700/50 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition border border-slate-600 hover:border-blue-500" title="Editar"><Edit size={16}/></button>
                                                        <button onClick={() => toggleBloqueo(c.id, c.nombreNegocio, c.activo)} className={`p-2 rounded-lg transition border ${c.activo ? 'bg-slate-700/50 text-yellow-400 hover:bg-yellow-500 hover:text-white border-slate-600 hover:border-yellow-500' : 'bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white border-green-500/30 hover:border-green-500'}`} title={c.activo ? "Bloquear Sistema" : "Reactivar Sistema"}>{c.activo ? <Lock size={16}/> : <Unlock size={16}/>}</button>
                                                        <button onClick={() => iniciarEliminarCliente(c.id, c.nombreNegocio)} className="p-2 bg-slate-700/50 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition border border-slate-600 hover:border-red-500" title="Eliminar Permanentemente"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* 🟢 MODAL DE CONFIRMACIÓN DE ELIMINACIÓN (Diseño Dark) */}
            {clienteAEliminar && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-4 border-red-500">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <Trash2 size={32}/>
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">¿Eliminar Cliente?</h3>
                        <p className="text-slate-400 mb-6 text-sm">
                            Estás a punto de borrar a <strong className="text-white">"{clienteAEliminar.nombre}"</strong>. Se perderán todas sus canchas, reservas y datos.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setClienteAEliminar(null)} className="flex-1 py-3 text-slate-300 font-bold hover:bg-slate-700 rounded-xl transition border border-slate-600">Cancelar</button>
                            <button onClick={confirmarEliminarCliente} className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-500 rounded-xl shadow-lg transition shadow-red-900/50">Sí, Borrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EDICIÓN (Sin Cambios Visuales) */}
            {editingClient && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-md border border-slate-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                            <h2 className="text-xl font-black text-white flex items-center gap-2"><Edit className="text-blue-500"/> Editar Cliente</h2>
                            <button onClick={() => {setEditingClient(null); setEditPass("")}} className="text-slate-400 hover:text-white transition"><X/></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 block">Negocio</label><input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white font-bold outline-none focus:border-blue-500" value={editingClient.nombreNegocio} onChange={e => setEditingClient({...editingClient, nombreNegocio: e.target.value})}/></div>
                            <div><label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 block">Usuario</label><input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white outline-none focus:border-blue-500" value={editingClient.userName} onChange={e => setEditingClient({...editingClient, userName: e.target.value})}/></div>
                            
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1 mb-1"><ImageIcon size={12}/> URL Logo</label>
                                <div className="flex gap-2">
                                    <input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-xs font-mono outline-none focus:border-blue-500" value={editingClient.logoUrl || ""} onChange={e => setEditingClient({...editingClient, logoUrl: e.target.value})} placeholder="https://..."/>
                                    <div className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {editingClient.logoUrl ? <img src={editingClient.logoUrl} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="text-slate-600"/>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><ImageIcon size={12}/> URL Foto Portada</label>
                                <div className="flex gap-2">
                                    <input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-xs font-mono outline-none focus:border-blue-500" value={editingClient.fotoUrl || ""} onChange={e => setEditingClient({...editingClient, fotoUrl: e.target.value})} placeholder="https://..."/>
                                    <div className="w-16 h-12 bg-slate-900 rounded-xl border border-slate-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {editingClient.fotoUrl ? <img src={editingClient.fotoUrl} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="text-slate-600"/>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30 mt-6">
                                <label className="text-xs text-blue-400 uppercase font-bold tracking-wider flex items-center gap-1"><Lock size={12}/> Resetear Contraseña</label>
                                <input type="text" className="w-full p-3 bg-slate-900 border border-blue-900/50 rounded-xl text-white mt-2 outline-none focus:border-blue-500 text-sm" placeholder="Dejar en blanco para no cambiar..." value={editPass} onChange={e => setEditPass(e.target.value)}/>
                            </div>
                            <button onClick={guardarEdicion} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2 mt-6 shadow-lg shadow-blue-900/50 active:scale-95"><Save size={18}/> Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}