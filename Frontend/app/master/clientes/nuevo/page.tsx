"use client";
import { useState, useEffect } from "react";
import { 
    Users, Plus, Lock, Unlock, Trash2, Edit, X, Save, Image as ImageIcon, LogOut 
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
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        await fetch(`${API_URL}/api/Auth/register`, { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ username: newUser, password: newPass, nombreNegocio: newBusiness }) 
        }); 
        setNewUser(""); setNewPass(""); setNewBusiness(""); cargarClientes(); alert("Cliente Creado ✅"); 
    };

    const toggleBloqueo = async (id: number, nombre: string, estadoActual: boolean) => { 
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        await fetch(`${API_URL}/api/SuperAdmin/toggle-estado/${id}`, { method: "PUT" });
        cargarClientes(); 
    };

    const eliminarCliente = async (id: number, nombre: string) => { 
        if(!confirm(`⚠️ PELIGRO:\n¿Estás seguro de eliminar a "${nombre}"?`)) return; 
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        const res = await fetch(`${API_URL}/api/SuperAdmin/eliminar/${id}`, { method: "DELETE" }); 
        if(res.ok) { alert("Eliminado 🗑️"); cargarClientes(); } 
    };

    const guardarEdicion = async () => { 
        if(!editingClient) return; 
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
        
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
            alert("Actualizado ✨"); 
            setEditingClient(null); 
            setEditPass(""); 
            cargarClientes(); 
        } 
    };

    // 3. RENDERIZADO DIRECTO (Sin pantalla de bloqueo)
    return (
        <div className="min-h-screen bg-slate-900 font-sans text-white">
            
            <main className="p-8 max-w-7xl mx-auto">
                
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3"><Users className="text-blue-500"/> Mis Clientes</h1>
                        <p className="text-slate-400">Administra las suscripciones de tu software.</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                            <span className="text-slate-400 text-sm">Total:</span>
                            <span className="text-2xl font-bold ml-2 text-white">{clientes.length}</span>
                        </div>
                    </div>
                </header>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* CREAR NUEVO */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-fit shadow-xl">
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Plus size={18} className="text-green-400"/> Nuevo Cliente</h3>
                        <form onSubmit={crearCliente} className="space-y-4">
                            <div><label className="text-xs text-slate-400 uppercase font-bold">Negocio</label><input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white" value={newBusiness} onChange={e => setNewBusiness(e.target.value)} placeholder="Ej: Padel Club"/></div>
                            <div><label className="text-xs text-slate-400 uppercase font-bold">Usuario</label><input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white" value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="usuario123"/></div>
                            <div><label className="text-xs text-slate-400 uppercase font-bold">Contraseña</label><input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="********"/></div>
                            <button className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-bold transition shadow-lg shadow-blue-900/50">Dar de Alta</button>
                        </form>
                    </div>

                    {/* LISTA DE CLIENTES */}
                    <div className="lg:col-span-2 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400 font-bold border-b border-slate-700">
                                <tr>
                                    <th className="p-4">Negocio / Usuario</th>
                                    <th className="p-4">Alta</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {clientes.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-700/50 transition">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                    {c.logoUrl ? (
                                                        <img src={c.logoUrl} alt="Logo" className="w-full h-full object-cover"/>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-500">{c.nombreNegocio ? c.nombreNegocio.substring(0,2).toUpperCase() : "CN"}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{c.nombreNegocio || "Sin nombre"}</div>
                                                    <div className="text-xs text-slate-400">User: {c.userName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">{c.fechaAlta ? new Date(c.fechaAlta).toLocaleDateString() : "-"}</td>
                                        <td className="p-4 text-center">
                                            {c.activo ? 
                                                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30">Activo</span> : 
                                                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30 flex items-center justify-center gap-1"><Lock size={10}/> Bloqueado</span>
                                            }
                                        </td>
                                        <td className="p-4 text-right flex items-center justify-end gap-2">
                                            <button onClick={() => setEditingClient(c)} className="p-2 bg-slate-700 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition" title="Editar"><Edit size={18}/></button>
                                            <button onClick={() => toggleBloqueo(c.id, c.userName, c.activo)} className={`p-2 rounded-lg transition ${c.activo ? 'bg-slate-700 text-yellow-400 hover:bg-yellow-500 hover:text-white' : 'bg-green-600 text-white hover:bg-green-700'}`} title={c.activo ? "Bloquear" : "Reactivar"}>{c.activo ? <Lock size={18}/> : <Unlock size={18}/>}</button>
                                            <button onClick={() => eliminarCliente(c.id, c.nombreNegocio)} className="p-2 bg-slate-700 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition" title="Eliminar"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* MODAL DE EDICIÓN (Sin Cambios Visuales) */}
            {editingClient && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-md border border-slate-600 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Edit className="text-blue-500"/> Editar Cliente</h2>
                            <button onClick={() => {setEditingClient(null); setEditPass("")}} className="p-1 hover:bg-slate-700 rounded-full"><X/></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="text-xs text-slate-400 uppercase font-bold">Negocio</label><input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-bold" value={editingClient.nombreNegocio} onChange={e => setEditingClient({...editingClient, nombreNegocio: e.target.value})}/></div>
                            <div><label className="text-xs text-slate-400 uppercase font-bold">Usuario</label><input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white" value={editingClient.userName} onChange={e => setEditingClient({...editingClient, userName: e.target.value})}/></div>
                            
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1 mb-1"><ImageIcon size={12}/> URL Logo</label>
                                <div className="flex gap-2">
                                    <input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs font-mono" value={editingClient.logoUrl || ""} onChange={e => setEditingClient({...editingClient, logoUrl: e.target.value})} placeholder="https://..."/>
                                    <div className="w-11 h-11 bg-slate-900 rounded-lg border border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {editingClient.logoUrl ? <img src={editingClient.logoUrl} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="text-slate-600"/>}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                <label className="text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><ImageIcon size={12}/> URL Foto Portada</label>
                                <div className="flex gap-2">
                                    <input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs font-mono" value={editingClient.fotoUrl || ""} onChange={e => setEditingClient({...editingClient, fotoUrl: e.target.value})} placeholder="https://..."/>
                                    <div className="w-16 h-11 bg-slate-900 rounded-lg border border-slate-600 overflow-hidden flex-shrink-0">
                                        {editingClient.fotoUrl && <img src={editingClient.fotoUrl} className="w-full h-full object-cover"/>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                <label className="text-xs text-blue-400 uppercase font-bold flex items-center gap-1"><Lock size={12}/> Resetear Contraseña (Opcional)</label>
                                <input type="text" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white mt-1" placeholder="Escribe nueva pass" value={editPass} onChange={e => setEditPass(e.target.value)}/>
                            </div>
                            <button onClick={guardarEdicion} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mt-4"><Save size={18}/> Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}