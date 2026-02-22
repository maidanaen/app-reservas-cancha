"use client";
import { useEffect, useState, useRef } from "react"; // 1. Agregamos useRef
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Unlock, Lock, Banknote, Smartphone, Calendar, Activity, Utensils, ShoppingBag, List, X, TrendingUp, MessageSquare, TrendingDown, Download } from "lucide-react";
import { API_URL } from '@/utils/config';

// 2. Importamos las librerías para el reporte
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// --- INTERFACES ---
interface DetalleMetodos { efectivo: number; transferencia: number; }

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

interface ReporteCaja {
    caja: {
        id: number;
        fechaApertura: string;
        fechaCierre?: string;
        montoInicial: number;
        montoFinal?: number;            
        montoRealTransferencia?: number; 
        totalGastos?: number;
        observaciones?: string;
    };
    resumen: {
        totalEfectivo: number;      
        totalTransferencia: number; 
        totalSistema: number;
        detalle: {
            canchas: DetalleMetodos;
            mesas: DetalleMetodos;
            barra: DetalleMetodos;
        };
    };
    movimientos: Movimiento[];
}

export default function DetalleCajaPage() {
    const params = useParams();
    const id = params?.id; 
    const reporteRef = useRef<HTMLDivElement>(null); // 3. Referencia para capturar el reporte

    const [reporte, setReporte] = useState<ReporteCaja | null>(null);
    const [cargando, setCargando] = useState(true);
    const [descargando, setDescargando] = useState(false); // Estado para el loader
    const [error, setError] = useState("");
    const [showModalMovimientos, setShowModalMovimientos] = useState(false);

    // --- FUNCIÓN PARA GENERAR EL PDF ---
    const descargarPDF = async () => {
        if (!reporteRef.current) return;
        setDescargando(true);
        
        try {
            const element = reporteRef.current;
            const canvas = await html2canvas(element, {
                scale: 2, // Mejora la nitidez del texto
                logging: false,
                useCORS: true,
                backgroundColor: "#FFFFFF"
            });
            
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Reporte_Caja_${id}_NexusSport.pdf`);
        } catch (err) {
            console.error("Error generando PDF:", err);
            alert("No se pudo generar el PDF. Intenta nuevamente.");
        } finally {
            setDescargando(false);
        }
    };

    // 🟢 FUNCIONES DE FORMATO
    const formatearHoraLocal = (fechaString?: string) => {
        if (!fechaString) return "---";
        const utcString = fechaString.endsWith('Z') ? fechaString : `${fechaString}Z`;
        return new Date(utcString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatearFechaLocal = (fechaString?: string) => {
        if (!fechaString) return "---";
        const utcString = fechaString.endsWith('Z') ? fechaString : `${fechaString}Z`;
        return new Date(utcString).toLocaleDateString();
    };

    useEffect(() => {
        if (!id) return;
        const cargar = async () => {
            const userId = localStorage.getItem("usuarioId");
            if (!userId) { setError("Sesión no válida"); setCargando(false); return; }
            try {
                const res = await fetch(`${API_URL}/api/Cajas/${id}?usuarioId=${userId}`);
                if (res.ok) setReporte(await res.json());
                else setError("Caja no encontrada.");
            } catch (e) { setError("Error de conexión"); } 
            finally { setCargando(false); }
        };
        cargar();
    }, [id]);

    if (cargando) return <div className="p-20 text-center animate-pulse text-gray-500 font-bold">Cargando reporte...</div>;
    if (error || !reporte) return <div className="p-20 text-center text-red-500 font-bold">{error || "No hay datos"}</div>;

    const { caja, resumen, movimientos } = reporte;
    const totalReal = (caja.montoFinal || 0) + (caja.montoRealTransferencia || 0);
    const difEfectivo = (caja.montoFinal || 0) - resumen.totalEfectivo;
    const difTransf = (caja.montoRealTransferencia || 0) - resumen.totalTransferencia;

    const getIconoConcepto = (concepto: string) => {
        if (concepto.includes("Cancha")) return <Activity size={16} className="text-blue-500"/>;
        if (concepto.includes("Restaurante")) return <Utensils size={16} className="text-orange-500"/>;
        return <ShoppingBag size={16} className="text-pink-500"/>;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 print:bg-white print:p-0 font-sans">
            
            {/* HEADER NAVEGACIÓN */}
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-8 print:hidden">
                <Link href="/admin/caja/historial" className="flex items-center gap-2 text-gray-500 hover:text-slate-900 font-bold transition self-start md:self-auto">
                    <ArrowLeft size={20}/> Volver al Historial
                </Link>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={descargarPDF} 
                        disabled={descargando}
                        className="flex-1 md:flex-none bg-white border-2 border-slate-900 text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                        {descargando ? "Generando..." : <><Download size={18}/> Descargar PDF</>}
                    </button>
                    <button onClick={() => window.print()} className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-xl">
                        <Printer size={18}/> Imprimir
                    </button>
                </div>
            </div>

            {/* REPORTE PRINCIPAL - LA REF ENVUELVE ESTO */}
            <div ref={reporteRef} className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none print:w-full">
                
                {/* ENCABEZADO */}
                <div className="p-6 md:p-8 border-b border-gray-100 bg-slate-50 print:bg-white">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase">REPORTE DE CIERRE #{caja.id}</h1>
                            <p className="text-gray-500 font-medium">NEXUS SPORT - Panel Administrativo</p>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Recaudado</p>
                            <p className="text-4xl font-black text-slate-900">${totalReal.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* ARQUEO Y COMPARATIVA */}
                <div className="p-6 md:p-8 grid md:grid-cols-2 gap-4">
                    <div className="bg-green-50/50 p-6 rounded-2xl border border-green-100">
                        <h3 className="text-green-800 font-black uppercase mb-4 flex items-center gap-2"><Banknote size={20}/> Efectivo</h3>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>Sistema:</span> <b>${resumen.totalEfectivo.toLocaleString()}</b></div>
                            <div className="flex justify-between text-lg border-t border-green-200 pt-2 font-bold"><span>Real:</span> <span>${(caja.montoFinal || 0).toLocaleString()}</span></div>
                            <div className={`flex justify-between font-bold ${difEfectivo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                <span>Diferencia:</span> <span>{difEfectivo > 0 ? '+' : ''}${difEfectivo.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-violet-50/50 p-6 rounded-2xl border border-violet-100">
                        <h3 className="text-violet-800 font-black uppercase mb-4 flex items-center gap-2"><Smartphone size={20}/> Transferencias</h3>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>Sistema:</span> <b>${resumen.totalTransferencia.toLocaleString()}</b></div>
                            <div className="flex justify-between text-lg border-t border-violet-200 pt-2 font-bold"><span>Real:</span> <span>${(caja.montoRealTransferencia || 0).toLocaleString()}</span></div>
                            <div className={`flex justify-between font-bold ${difTransf >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                <span>Diferencia:</span> <span>{difTransf > 0 ? '+' : ''}${difTransf.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DESGLOSE TABLA */}
                <div className="px-6 md:px-8 py-8">
                    <h3 className="font-black text-slate-900 mb-4 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                        <TrendingUp size={20}/> Desglose por Actividad
                    </h3>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                            <tr>
                                <th className="p-3 text-left">Concepto</th>
                                <th className="p-3 text-right">Efectivo</th>
                                <th className="p-3 text-right">Transf.</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {[
                                { label: "Canchas", data: resumen.detalle.canchas },
                                { label: "Restaurante", data: resumen.detalle.mesas },
                                { label: "Cantina", data: resumen.detalle.barra }
                            ].map((row, i) => (
                                <tr key={i}>
                                    <td className="p-3 font-bold text-slate-700">{row.label}</td>
                                    <td className="p-3 text-right text-green-600">+${row.data.efectivo.toLocaleString()}</td>
                                    <td className="p-3 text-right text-violet-600">+${row.data.transferencia.toLocaleString()}</td>
                                    <td className="p-3 text-right font-black">${(row.data.efectivo + row.data.transferencia).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* BOTÓN MOVIMIENTOS (Solo visible en pantalla) */}
                <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50 print:hidden">
                    <button 
                        onClick={() => setShowModalMovimientos(true)}
                        className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                    >
                        <List size={20}/> Ver Movimientos Detallados ({movimientos.length})
                    </button>
                </div>
            </div>

            {/* MODAL DE MOVIMIENTOS (FUERA DE LA REF PARA QUE NO SALGA EN EL PDF) */}
            {showModalMovimientos && (
                <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4" onClick={() => setShowModalMovimientos(false)}>
                    <div className="bg-white w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-black">Listado de Movimientos</h3>
                            <button onClick={() => setShowModalMovimientos(false)} className="p-2 bg-gray-100 rounded-full"><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Aquí va tu tabla de movimientos que ya tienes */}
                            <p className="text-gray-500 italic">Cargando movimientos detallados...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}