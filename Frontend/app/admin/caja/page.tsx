"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, Lock, Unlock, History, Eye, Banknote, Smartphone, TrendingUp, Calendar, Clock, X, CheckCircle, List, User, ShoppingBag, Utensils, Activity } from "lucide-react";

// --- INTERFACES ---
interface Movimiento {
    id: number;
    hora: string;
    concepto: string; 
    detalle: string;  
    metodo: string;
    monto: number;
    tipo: string;
    items?: { producto: string; precio: number; cantidad?: number }[];
    desglose?: { efectivo: number; transferencia: number };
}

interface Caja {
    id: number;
    fechaApertura: string;
    fechaCierre?: string;
    montoInicial: number;
    totalEfectivo: number;
    totalTransferencia: number;
}

interface DetalleMetodos {
    efectivo: number;
    transferencia: number;
}

interface ReporteCaja {
    caja: Caja;
    resumen: {
        totalEfectivo: number;
        totalTransferencia: number;
        totalSistema: number;
        detalle: {
            canchas: DetalleMetodos;
            barra: DetalleMetodos;
            mesas: DetalleMetodos;
        };
    };
    movimientos: Movimiento[];
}

export default function CajaPage() {
    const [reporteActual, setReporteActual] = useState<ReporteCaja | null>(null);
    const [cargando, setCargando] = useState(true);
    
    // Estados Inputs
    const [montoInicial, setMontoInicial] = useState("");
    const [showModalCierre, setShowModalCierre] = useState(false);
    const [arqueoEfectivo, setArqueoEfectivo] = useState("");
    const [arqueoTransf, setArqueoTransf] = useState("");

    // Modal Detalle
    const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<Movimiento | null>(null);

    const cargarDatos = async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const resActual = await fetch("https://localhost:7123/api/Cajas/actual");
            if (resActual.ok) {
                setReporteActual(await resActual.json());
            } else {
                setReporteActual(null);
            }
        } catch (error) { console.error(error); } finally { setCargando(false); }
    };

    useEffect(() => { cargarDatos(); }, []);

    const abrirCaja = async () => {
        if (!montoInicial) return alert("Ingresa el monto inicial");
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        await fetch("https://localhost:7123/api/Cajas/abrir", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: montoInicial
        });
        setMontoInicial("");
        cargarDatos();
    };

    const confirmarCierre = async () => {
        if (!reporteActual) return;
        if (arqueoEfectivo === "" || arqueoTransf === "") return alert("Ingresa los montos del arqueo.");
        if (!confirm("¿Confirmar cierre de turno?")) return;
        
        const dto = { efectivoReal: Number(arqueoEfectivo), transferenciaReal: Number(arqueoTransf) };

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const res = await fetch(`https://localhost:7123/api/Cajas/cerrar`, { 
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dto)
        });

        if(res.ok){
            setShowModalCierre(false);
            setArqueoEfectivo(""); setArqueoTransf("");
            cargarDatos();
        } else {
            alert("Error al cerrar la caja");
        }
    };

    if (cargando) return <div className="p-10 text-center animate-pulse">Cargando sistema...</div>;

    const { caja, resumen, movimientos } = reporteActual || {} as any;
    const difEfectivo = reporteActual ? (Number(arqueoEfectivo) - resumen.totalEfectivo) : 0;
    const difTransf = reporteActual ? (Number(arqueoTransf) - resumen.totalTransferencia) : 0;

    const getIconoConcepto = (concepto: string) => {
        if (concepto.includes("Cancha")) return <Activity size={18} className="text-blue-500"/>;
        if (concepto.includes("Restaurante")) return <Utensils size={18} className="text-orange-500"/>;
        return <ShoppingBag size={18} className="text-pink-500"/>;
    };

    return (
        <main className="max-w-7xl mx-auto p-6 font-sans bg-gray-50 min-h-screen relative">
            
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
                    <DollarSign className="text-green-600" size={32}/> Gestión de Caja
                </h1>
                <Link href="/admin/caja/historial" className="text-sm font-bold text-gray-500 hover:text-slate-900 flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                    <History size={16}/> Ver Cierres Anteriores
                </Link>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden mb-10 transition-all">
                {reporteActual ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {/* HEADER CAJA */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-2xl font-black text-green-600 flex items-center gap-2 mb-1">
                                    <Unlock size={24}/> Turno Abierto
                                </h2>
                                <div className="flex gap-4 text-sm font-bold text-gray-400">
                                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(caja.fechaApertura).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Clock size={14}/> {new Date(caja.fechaApertura).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs</span>
                                </div>
                            </div>
                            <button onClick={() => setShowModalCierre(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center gap-2">
                                <Lock size={18}/> CERRAR TURNO
                            </button>
                        </div>

                        {/* KPIS */}
                        <div className="p-8 grid md:grid-cols-3 gap-6 bg-gray-50/50 border-b border-gray-100">
                            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Sistema</p>
                                <h2 className="text-4xl font-black tracking-tight mb-2">${resumen.totalSistema.toLocaleString()}</h2>
                                <p className="text-[10px] text-slate-400 font-medium">Teórico Acumulado</p>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Efectivo Físico</p>
                                        <h3 className="text-3xl font-black text-slate-900 mt-1">${resumen.totalEfectivo.toLocaleString()}</h3>
                                    </div>
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Banknote size={24}/></div>
                                </div>
                                <div className="pt-4 border-t border-gray-100 text-xs font-bold text-gray-500 flex justify-between">
                                    <span>Fondo Inicial:</span> <span className="text-slate-900">${caja.montoInicial.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Transferencia</p>
                                        <h3 className="text-3xl font-black text-slate-900 mt-1">${resumen.totalTransferencia.toLocaleString()}</h3>
                                    </div>
                                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Smartphone size={24}/></div>
                                </div>
                                <div className="pt-4 border-t border-gray-100 text-xs font-bold text-gray-400">Confirmados en cuenta</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 animate-in zoom-in-95 bg-white">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 border-4 border-gray-100"><Lock size={40} /></div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Turno Cerrado</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">Ingresa el cambio inicial para comenzar.</p>
                        <div className="max-w-sm mx-auto flex gap-3 px-4">
                            <input type="number" className="w-full p-4 border-2 border-gray-200 rounded-2xl font-bold text-lg outline-none focus:border-blue-500 transition text-slate-900" placeholder="$0.00" value={montoInicial} onChange={e => setMontoInicial(e.target.value)}/>
                            <button onClick={abrirCaja} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition">Abrir</button>
                        </div>
                    </div>
                )}
            </div>

            {/* 🟢 SECCIÓN RESTAURADA: DESGLOSE POR ACTIVIDAD */}
            {reporteActual && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-10">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-slate-900"/> DESGLOSE POR ACTIVIDAD
                        </h3>
                    </div>
                    <div className="p-6">
                        {/* Encabezados */}
                        <div className="grid grid-cols-4 text-xs font-bold text-gray-400 uppercase mb-4 px-4">
                            <div>Concepto</div>
                            <div className="text-right">Efectivo</div>
                            <div className="text-right">Transferencia</div>
                            <div className="text-right text-slate-800">Subtotal</div>
                        </div>

                        {/* Fila Canchas */}
                        <div className="grid grid-cols-4 text-sm py-3 border-b border-gray-50 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                            <span className="font-bold text-slate-700 flex items-center gap-2">Alquiler de Canchas</span>
                            <span className="text-right font-medium text-green-600">+ ${resumen.detalle.canchas.efectivo.toLocaleString()}</span>
                            <span className="text-right font-medium text-violet-600">+ ${resumen.detalle.canchas.transferencia.toLocaleString()}</span>
                            <span className="text-right font-black text-slate-900">${(resumen.detalle.canchas.efectivo + resumen.detalle.canchas.transferencia).toLocaleString()}</span>
                        </div>

                        {/* Fila Restaurante */}
                        <div className="grid grid-cols-4 text-sm py-3 border-b border-gray-50 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                            <span className="font-bold text-slate-700">Restaurante (Mesas)</span>
                            <span className="text-right font-medium text-green-600">+ ${resumen.detalle.mesas.efectivo.toLocaleString()}</span>
                            <span className="text-right font-medium text-violet-600">+ ${resumen.detalle.mesas.transferencia.toLocaleString()}</span>
                            <span className="text-right font-black text-slate-900">${(resumen.detalle.mesas.efectivo + resumen.detalle.mesas.transferencia).toLocaleString()}</span>
                        </div>

                        {/* Fila Cantina */}
                        <div className="grid grid-cols-4 text-sm py-3 border-b border-gray-50 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                            <span className="font-bold text-slate-700">Cantina Express</span>
                            <span className="text-right font-medium text-green-600">+ ${resumen.detalle.barra.efectivo.toLocaleString()}</span>
                            <span className="text-right font-medium text-violet-600">+ ${resumen.detalle.barra.transferencia.toLocaleString()}</span>
                            <span className="text-right font-black text-slate-900">${(resumen.detalle.barra.efectivo + resumen.detalle.barra.transferencia).toLocaleString()}</span>
                        </div>

                        {/* Fila Fondo Inicial */}
                        <div className="grid grid-cols-4 text-sm py-3 px-4 bg-yellow-50/50 rounded-lg mt-2 border border-yellow-100">
                            <span className="font-bold text-yellow-700 flex items-center gap-2">● Fondo Inicial (Cambio)</span>
                            <span className="text-right font-bold text-yellow-700">$ {caja.montoInicial.toLocaleString()}</span>
                            <span className="text-right text-gray-300">-</span>
                            <span className="text-right font-black text-yellow-800">$ {caja.montoInicial.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* LISTA MOVIMIENTOS */}
            {reporteActual && (
                <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2"><List size={24} className="text-gray-400"/> Movimientos del Turno</h3>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500 border-b border-gray-100">
                                <tr>
                                    <th className="p-5 pl-8">Hora</th>
                                    <th className="p-5">Concepto</th>
                                    <th className="p-5">Detalle / Cliente</th>
                                    <th className="p-5 text-center">Método</th>
                                    <th className="p-5 text-right">Monto</th>
                                    <th className="p-5 text-center">Ticket</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {movimientos.length === 0 ? (
                                    <tr><td colSpan={6} className="p-10 text-center text-gray-400">No hay movimientos.</td></tr>
                                ) : (
                                    movimientos.map((m: Movimiento) => (
                                        <tr key={m.id} className="hover:bg-blue-50/30 transition group">
                                            <td className="p-4 pl-8 font-mono text-gray-500">{new Date(m.hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                            <td className="p-4 font-bold text-slate-700 flex items-center gap-2">{getIconoConcepto(m.concepto)}{m.concepto}</td>
                                            <td className="p-4 text-gray-600 font-medium">{m.detalle}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${m.metodo.includes('Efectivo') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-violet-50 text-violet-700 border-violet-100'}`}>{m.metodo}</span>
                                            </td>
                                            <td className="p-4 text-right font-black text-slate-900">${m.monto.toLocaleString()}</td>
                                            <td className="p-4 text-center"><button onClick={() => setMovimientoSeleccionado(m)} className="text-gray-300 hover:text-blue-600 transition"><Eye size={18}/></button></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL CIERRE */}
            {showModalCierre && reporteActual && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Lock size={20} className="text-red-500"/> Confirmar Cierre</h3>
                            <button onClick={() => setShowModalCierre(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <p className="text-sm text-gray-500 text-center mb-4">Ingresa los montos reales contados.</p>
                            <div className="space-y-2">
                                <label className="flex justify-between text-sm font-bold text-green-700"><span>Efectivo en Caja</span><span className="text-gray-400 font-normal">Teórico: ${resumen.totalEfectivo.toLocaleString()}</span></label>
                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span><input type="number" autoFocus className="w-full p-4 pl-8 text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" value={arqueoEfectivo} onChange={e => setArqueoEfectivo(e.target.value)}/></div>
                                {arqueoEfectivo && <div className={`text-xs font-bold text-right ${difEfectivo >= 0 ? 'text-green-600' : 'text-red-500'}`}>Diferencia: {difEfectivo >= 0 ? '+' : ''}${difEfectivo.toLocaleString()}</div>}
                            </div>
                            <div className="space-y-2">
                                <label className="flex justify-between text-sm font-bold text-violet-700"><span>Banco / MP</span><span className="text-gray-400 font-normal">Teórico: ${resumen.totalTransferencia.toLocaleString()}</span></label>
                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span><input type="number" className="w-full p-4 pl-8 text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" value={arqueoTransf} onChange={e => setArqueoTransf(e.target.value)}/></div>
                                {arqueoTransf && <div className={`text-xs font-bold text-right ${difTransf >= 0 ? 'text-green-600' : 'text-red-500'}`}>Diferencia: {difTransf >= 0 ? '+' : ''}${difTransf.toLocaleString()}</div>}
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button onClick={() => setShowModalCierre(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition">Cancelar</button>
                            <button onClick={confirmarCierre} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition flex justify-center items-center gap-2"><CheckCircle size={18}/> FINALIZAR TURNO</button>
                        </div>
                    </div>
                </div>
            )}

           {/* --- 🟢 MODAL DETALLE INTELIGENTE --- */}
            {movimientoSeleccionado && (
                 <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setMovimientoSeleccionado(null)}>
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        
                        <div className="p-6 bg-slate-50 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                    {getIconoConcepto(movimientoSeleccionado.concepto)}
                                    {movimientoSeleccionado.concepto}
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    {new Date(movimientoSeleccionado.hora).toLocaleDateString()} • {new Date(movimientoSeleccionado.hora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs
                                </p>
                            </div>
                            <button onClick={() => setMovimientoSeleccionado(null)} className="bg-white p-1 rounded-full text-gray-400 hover:text-red-500 shadow-sm border border-gray-100 transition"><X size={18}/></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            
                            {/* CLIENTE */}
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">Cliente / Detalle</span>
                                        <span className="font-bold text-slate-800 text-sm">{movimientoSeleccionado.detalle}</span>
                                    </div>
                                    <div className="text-right">
                                         <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${movimientoSeleccionado.metodo.includes('Efectivo') ? 'bg-green-50 text-green-700 border-green-100' : movimientoSeleccionado.metodo.includes('Transferencia') ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            {movimientoSeleccionado.metodo}
                                        </span>
                                    </div>
                                </div>
                            </div>

                           {/* 🟢 LISTA DE ITEMS (AGRUPADA Y LIMPIA) */}
                            {movimientoSeleccionado.items && movimientoSeleccionado.items.length > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1 border-b border-gray-100 pb-2">
                                        <ShoppingBag size={12}/> Detalle del Consumo
                                    </h4>
                                    
                                    <div className="space-y-2">
                                        {(() => {
                                            // 1. Separar Alquileres
                                            const esAlquiler = (nombre: string) => nombre.toLowerCase().includes('alquiler') || nombre.toLowerCase().includes('pista') || nombre.toLowerCase().includes('luz');
                                            const totalAlquiler = movimientoSeleccionado.items.filter(i => esAlquiler(i.producto)).reduce((acc, i) => acc + i.precio, 0);

                                            // 2. Agrupar Productos
                                            const itemsRaw = movimientoSeleccionado.items.filter(i => !esAlquiler(i.producto) && i.precio > 0);
                                            
                                            // 🧠 MAGIA DE AGRUPACIÓN (Soporta Cantina y Restaurante)
                                            const itemsAgrupados = itemsRaw.reduce((acc: any[], curr) => {
                                                const existing = acc.find((i: any) => i.producto === curr.producto);
                                                
                                                const cantidadReal = curr.cantidad || 1; 

                                                if (existing) {
                                                    existing.cantidad += cantidadReal;
                                                    existing.total += curr.precio;
                                                } else {
                                                    acc.push({
                                                        producto: curr.producto,
                                                        cantidad: cantidadReal,
                                                        total: curr.precio
                                                    });
                                                }
                                                return acc;
                                            }, []);

                                            return (
                                                <>
                                                    {totalAlquiler > 0 && (
                                                        <div className="flex justify-between items-start py-1 hover:bg-gray-50 rounded px-1 transition-colors">
                                                            <div className="flex items-start gap-2 text-slate-800 font-bold pr-4">
                                                                <span className="text-[10px] mt-[3px]">🎾</span>
                                                                <span className="leading-tight">Alquiler de Pista</span>
                                                            </div>
                                                            <div className="font-mono font-bold text-slate-900 whitespace-nowrap">${totalAlquiler.toLocaleString()}</div>
                                                        </div>
                                                    )}

                                                    {itemsAgrupados.map((item, index) => (
                                                        <div key={index} className="flex justify-between items-start py-1 hover:bg-gray-50 rounded px-1 transition-colors group">
                                                            <div className="flex items-start gap-2 text-slate-600 font-medium pr-4 group-hover:text-slate-900 transition-colors">
                                                                <span className="text-[10px] mt-[3px] text-gray-300">●</span>
                                                                <span className="leading-tight">
                                                                    {/* BADGE AZUL SI ES MAS DE 1 */}
                                                                    {item.cantidad > 1 && <span className="text-blue-600 font-bold mr-1">{item.cantidad}x</span>}
                                                                    {item.producto}
                                                                </span>
                                                            </div>
                                                            <div className="font-mono font-bold text-slate-900 whitespace-nowrap">
                                                                ${item.total.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    
                                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100 font-bold text-slate-800 text-sm">
                                        <span>Total Consumo</span>
                                        <span className="font-mono text-base text-slate-900">${movimientoSeleccionado.items.reduce((acc, item) => acc + item.precio, 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {movimientoSeleccionado.desglose && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><DollarSign size={12}/> Desglose de Pago</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-3 bg-green-50/50 border border-green-100 rounded-xl flex flex-col items-center justify-center">
                                            <span className="text-[10px] text-green-700 font-bold uppercase">Efectivo</span>
                                            <span className="text-sm font-black text-green-800">${movimientoSeleccionado.desglose.efectivo.toLocaleString()}</span>
                                        </div>
                                        <div className="p-3 bg-violet-50/50 border border-violet-100 rounded-xl flex flex-col items-center justify-center">
                                            <span className="text-[10px] text-violet-700 font-bold uppercase">Transferencia</span>
                                            <span className="text-sm font-black text-violet-800">${movimientoSeleccionado.desglose.transferencia.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center mt-auto">
                            <span className="text-sm font-medium text-slate-400">Total Cobrado</span>
                            <span className="text-2xl font-black tracking-tight">${movimientoSeleccionado.monto.toLocaleString()}</span>
                        </div>
                    </div>
                 </div>
            )}
        </main>
    );
}