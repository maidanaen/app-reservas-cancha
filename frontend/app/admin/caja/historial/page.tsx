"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, MessageSquare } from "lucide-react";
import { API_URL } from '@/utils/config';
import useSWR from 'swr';
import { fetcher } from '@/utils/fetcher';
import { useRouter } from 'next/navigation';

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
    totalGastos?: number; 
    observaciones?: string;
}

export default function HistorialCajaPage() {
    const router = useRouter();

    const userId = typeof window !== 'undefined' ? localStorage.getItem("usuarioId") : null;
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

    // --- CARGA CON SWR ---
    const { data: historialData, isLoading: cargando } = useSWR(
        userId && token ? `${API_URL}/api/Cajas/historial?usuarioId=${userId}` : null,
        fetcher
    );
    const historial: CajaCerrada[] = historialData || [];

    useEffect(() => {
        if (!token && typeof window !== 'undefined') {
            router.push("/admin/login");
        }
    }, [token, router]);

    // ✅ LÓGICA DE TIEMPO IGUAL A TU REPORTE DETALADO
    const formatearHoraLocal = (fechaString?: string) => {
        if (!fechaString) return "---";
        const utcString = fechaString.endsWith('Z') ? fechaString : `${fechaString}Z`;
        return new Date(utcString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatearFechaLocal = (fechaString?: string) => {
        if (!fechaString) return "---";
        const utcString = fechaString.endsWith('Z') ? fechaString : `${fechaString}Z`;
        return new Date(utcString).toLocaleDateString();
    };

    return (
        <main className="max-w-7xl mx-auto p-4 md:p-6 font-sans bg-gray-50 min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/caja" className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-100 transition text-slate-600">
                    <ArrowLeft size={20}/>
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900">Historial de Cierres</h1>
                    <p className="text-sm text-gray-500 font-medium">Auditoría y Bitácoras de Turno</p>
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
                                <th className="p-5 text-right">Arqueo Real</th>
                                <th className="p-5 text-center">Diferencias</th>
                                <th className="p-5 text-left">Bitácora / Comentarios</th>
                                <th className="p-5 text-center">Ver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {cargando ? (
                                <tr><td colSpan={7} className="p-10 text-center font-bold text-gray-400">Cargando historial...</td></tr>
                            ) : historial.map((caja) => {
                                const totalSistema = caja.totalEfectivo + caja.totalTransferencia;
                                const totalReal = caja.montoFinal + caja.montoRealTransferencia;
                                const difTotal = totalReal - totalSistema;
                                
                                const textoBitacora = caja.observaciones;

                                return (
                                    <tr key={caja.id} className="hover:bg-blue-50/30 transition group">
                                        <td className="p-5 pl-8">
                                            <p className="font-bold text-slate-700">{formatearFechaLocal(caja.fechaApertura)}</p>
                                            <p className="text-xs text-gray-400">{formatearHoraLocal(caja.fechaApertura)}hs</p>
                                        </td>
                                        <td className="p-5">
                                            <p className="font-bold text-slate-700">{formatearFechaLocal(caja.fechaCierre)}</p>
                                            <p className="text-xs text-gray-400">{formatearHoraLocal(caja.fechaCierre)}hs</p>
                                        </td>
                                        
                                        <td className="p-5 text-right text-slate-500">${totalSistema.toLocaleString()}</td>
                                        <td className="p-5 text-right font-black text-slate-900">${totalReal.toLocaleString()}</td>

                                        <td className="p-5 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${difTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {difTotal > 0 ? '+' : ''}{difTotal.toLocaleString()}
                                            </span>
                                        </td>

                                        <td className="p-5 text-left max-w-[250px]">
                                            <div className="flex flex-col gap-1">
                                                {/*  Usamos totalGastos */}
                                                {caja.totalGastos ? (
                                                    <span className="text-[10px] font-bold text-red-600 uppercase">Gasto Extra: -${caja.totalGastos.toLocaleString()}</span>
                                                ) : null}
                                                
                                                {textoBitacora ? (
                                                    <div className="flex gap-2 items-start bg-orange-50 p-2 rounded-lg border border-orange-100">
                                                        <MessageSquare size={14} className="text-orange-500 mt-0.5 shrink-0" />
                                                        <p className="text-xs text-orange-800 italic line-clamp-2">
                                                            {textoBitacora}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-xs italic">Sin anotaciones</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-5 text-center">
                                            <Link href={`/admin/caja/${caja.id}`}>
                                                <button className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-slate-900 hover:text-white transition shadow-sm">
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