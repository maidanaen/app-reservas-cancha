"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Eye, MessageSquare, ClipboardList } from "lucide-react"; // Añadí ClipboardList
import { API_URL } from '@/utils/config';

interface CajaCerrada {
    id: number;
    fechaApertura: string;
    fechaCierre: string;
    montoInicial: number;
    totalEfectivo: number;
    totalTransferencia: number;
    montoFinal: number; 
    montoRealTransferencia: number;
    gastosRegistrados?: number;
    comentarios?: string;
}

export default function HistorialCajaPage() {
    const [historial, setHistorial] = useState<CajaCerrada[]>([]);
    const [cargando, setCargando] = useState(true);

    // Formateo simple: Si el horario viene mal, quita el .endsWith('Z') para que use la hora del servidor tal cual
    const formatearHoraLocal = (fechaString?: string) => {
        if (!fechaString) return "---";
        const fecha = new Date(fechaString);
        return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatearFechaLocal = (fechaString?: string) => {
        if (!fechaString) return "---";
        return new Date(fechaString).toLocaleDateString();
    };

    useEffect(() => {
        const cargarHistorial = async () => {
            const userId = localStorage.getItem("usuarioId");
            if (!userId) return;

            try {
                const res = await fetch(`${API_URL}/api/Cajas/historial?usuarioId=${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    setHistorial(data);
                }
            } catch (error) { 
                console.error("Error cargando historial:", error); 
            } finally { 
                setCargando(false); 
            }
        };
        cargarHistorial();
    }, []);

    return (
        <main className="max-w-7xl mx-auto p-4 md:p-6 font-sans bg-gray-50 min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/caja" className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-100 transition text-slate-600">
                    <ArrowLeft size={20}/>
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900">Historial de Cierres</h1>
                    <p className="text-sm text-gray-500 font-medium">Auditoría de turnos anteriores</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1100px]">
                        <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-400 border-b border-gray-100">
                            <tr>
                                <th className="p-5 pl-8">Apertura</th>
                                <th className="p-5">Cierre</th>
                                <th className="p-5 text-right">Sistema</th>
                                <th className="p-5 text-right">Real (Arqueo)</th>
                                <th className="p-5 text-center">Dif. Efectivo</th>
                                <th className="p-5 text-center">Dif. Transf.</th>
                                <th className="p-5 text-center">Gastos / Bitácora</th> {/* 🟢 TÍTULO CORREGIDO */}
                                <th className="p-5 text-center">Ver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {cargando ? (
                                <tr><td colSpan={8} className="p-10 text-center font-bold text-gray-400">Cargando historial...</td></tr>
                            ) : historial.map((caja) => {
                                const totalSistema = caja.totalEfectivo + caja.totalTransferencia;
                                const totalReal = caja.montoFinal + caja.montoRealTransferencia;
                                const difEfectivo = caja.montoFinal - caja.totalEfectivo;
                                const difTransf = caja.montoRealTransferencia - caja.totalTransferencia;
                                
                                return (
                                    <tr key={caja.id} className="hover:bg-blue-50/30 transition group">
                                        {/* APERTURA */}
                                        <td className="p-5 pl-8">
                                            <p className="font-bold text-slate-700">{formatearFechaLocal(caja.fechaApertura)}</p>
                                            <p className="text-xs text-gray-400">{formatearHoraLocal(caja.fechaApertura)}hs</p>
                                        </td>
                                        {/* CIERRE */}
                                        <td className="p-5">
                                            <p className="font-bold text-slate-700">{formatearFechaLocal(caja.fechaCierre)}</p>
                                            <p className="text-xs text-gray-400">{formatearHoraLocal(caja.fechaCierre)}hs</p>
                                        </td>
                                        
                                        <td className="p-5 text-right text-slate-500">${totalSistema.toLocaleString()}</td>
                                        <td className="p-5 text-right font-black text-slate-900">${totalReal.toLocaleString()}</td>

                                        {/* DIFERENCIAS */}
                                        <td className="p-5 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${difEfectivo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {difEfectivo > 0 ? '+' : ''}{difEfectivo.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${difTransf >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {difTransf > 0 ? '+' : ''}{difTransf.toLocaleString()}
                                            </span>
                                        </td>

                                        {/* 🟢 COLUMNA DE BITÁCORA / GASTOS */}
                                        <td className="p-5 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {caja.gastosRegistrados ? (
                                                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                        Gastos: ${caja.gastosRegistrados}
                                                    </span>
                                                ) : null}
                                                {caja.comentarios ? (
                                                    <div className="flex items-center gap-1 text-orange-500" title={caja.comentarios}>
                                                        <MessageSquare size={14} />
                                                        <span className="text-[10px] font-medium">Con Bitácora</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-5 text-center">
                                            <Link href={`/admin/caja/${caja.id}`}>
                                                <button className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-slate-900 hover:text-white transition">
                                                    <Eye size={18}/>
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}