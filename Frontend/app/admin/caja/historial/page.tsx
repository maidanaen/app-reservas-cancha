"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, AlertCircle, CheckCircle, Eye } from "lucide-react";

interface CajaCerrada {
    id: number;
    fechaApertura: string;
    fechaCierre: string;
    montoInicial: number;
    
    // Totales del Sistema (Teórico)
    totalEfectivo: number;
    totalTransferencia: number;
    
    // Totales Reales (Arqueo)
    montoFinal: number; // Efectivo Real
    montoRealTransferencia: number; // Transferencia Real
}

export default function HistorialCajaPage() {
    const [historial, setHistorial] = useState<CajaCerrada[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarHistorial = async () => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            try {
                const res = await fetch("https://localhost:7123/api/Cajas/historial");
                if (res.ok) setHistorial(await res.json());
            } catch (error) { console.error(error); } 
            finally { setCargando(false); }
        };
        cargarHistorial();
    }, []);

    return (
        <main className="max-w-7xl mx-auto p-6 font-sans bg-gray-50 min-h-screen">
            
            {/* HEADER */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/caja" className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-100 transition text-slate-600">
                    <ArrowLeft size={20}/>
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Historial de Cierres</h1>
                    <p className="text-sm text-gray-500 font-medium">Auditoría de turnos anteriores</p>
                </div>
            </div>

            {/* TABLA */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-400 border-b border-gray-100">
                        <tr>
                            <th className="p-5 pl-8">Fecha Apertura</th>
                            <th className="p-5 pl-8">Fecha Cierre</th>
                            <th className="p-5 text-right">Sistema (Total)</th>
                            <th className="p-5 text-right">Real (Arqueo)</th>
                            <th className="p-5 text-center">Dif. Efectivo</th>
                            <th className="p-5 text-center">Dif. Transf.</th>
                            <th className="p-5 text-center">Ver</th> {/* Columna de Acción */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                        {cargando ? (
                            <tr><td colSpan={7} className="p-10 text-center">Cargando...</td></tr>
                        ) : historial.length === 0 ? (
                            <tr><td colSpan={7} className="p-10 text-center text-gray-400">No hay cierres registrados.</td></tr>
                        ) : (
                            historial.map((caja) => {
                                const totalSistema = caja.totalEfectivo + caja.totalTransferencia;
                                const totalReal = caja.montoFinal + caja.montoRealTransferencia;
                                
                                const difEfectivo = caja.montoFinal - caja.totalEfectivo;
                                const difTransf = caja.montoRealTransferencia - caja.totalTransferencia;
                                
                                const esCuadrePerfecto = difEfectivo === 0 && difTransf === 0;

                                return (
                                    <tr key={caja.id} className="hover:bg-blue-50/30 transition group">
                                        <td className="p-5 pl-8 ">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 text-gray-500 rounded-lg">
                                                    <Calendar size={18}/>
                                                </div>
                                                <div>
                                                        <p className="font-bold text-slate-700">{new Date(caja.fechaApertura).toLocaleDateString()}</p>
                                                        <p className="text-xs text-gray-400">{new Date(caja.fechaApertura).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs</p>
                                                </div>
                                            </div>                                         
                                        </td>
                                        <td className="p-5 pl-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 text-gray-500 rounded-lg">
                                                    <Calendar size={18}/>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700">{new Date(caja.fechaCierre).toLocaleDateString()}</p>
                                                    <p className="text-xs text-gray-400">{new Date(caja.fechaCierre).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}hs</p>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="p-5 text-right font-medium text-slate-500">
                                            ${totalSistema.toLocaleString()}
                                        </td>
                                        
                                        <td className="p-5 text-right font-black text-slate-900">
                                            ${totalReal.toLocaleString()}
                                        </td>

                                        {/* DIFERENCIA EFECTIVO */}
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-black border ${
                                                difEfectivo === 0 ? 'bg-gray-100 text-gray-500 border-transparent' :
                                                difEfectivo > 0 ? 'bg-green-100 text-green-700 border-green-200' :
                                                'bg-red-100 text-red-600 border-red-200'
                                            }`}>
                                                {difEfectivo > 0 ? '+' : ''}{difEfectivo.toLocaleString()}
                                            </span>
                                        </td>

                                        {/* DIFERENCIA TRANSFERENCIA */}
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-black border ${
                                                difTransf === 0 ? 'bg-gray-100 text-gray-500 border-transparent' :
                                                difTransf > 0 ? 'bg-green-100 text-green-700 border-green-200' :
                                                'bg-red-100 text-red-600 border-red-200'
                                            }`}>
                                                {difTransf > 0 ? '+' : ''}{difTransf.toLocaleString()}
                                            </span>
                                        </td>

                                        
                                        {/* 🟢 BOTÓN DE ACCIÓN: ENLACE A LA PÁGINA DE DETALLE */}
                                        <td className="p-5 text-center">
                                            <Link href={`/admin/caja/${caja.id}`}>
                                                <button className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-slate-900 hover:text-white transition shadow-sm text-gray-400">
                                                    <Eye size={18}/>
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}