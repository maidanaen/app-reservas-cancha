"use client";
import { useEffect, useState, useRef } from "react"; // 1. Agregado useRef
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, Unlock, Lock, Banknote, Smartphone, Calendar, Activity, Utensils, ShoppingBag, List, X, TrendingUp, MessageSquare, TrendingDown, Download } from "lucide-react"; // Agregado icono Download
import { API_URL } from '@/utils/config';
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// --- INTERFACES ---
interface DetalleMetodos {
    efectivo: number;
    transferencia: number;
}

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
    const reporteRef = useRef<HTMLDivElement>(null); // 2. Referencia para capturar el diseño

    const [reporte, setReporte] = useState<ReporteCaja | null>(null);
    const [cargando, setCargando] = useState(true);
    const [descargando, setDescargando] = useState(false); // Estado para el botón de PDF
    const [error, setError] = useState("");
    
    const [showModalMovimientos, setShowModalMovimientos] = useState(false);

    // --- FUNCIÓN PARA DESCARGAR PDF ---
    const descargarPDF = async () => {
        if (!reporteRef.current) return;
        setDescargando(true);
        try {
            const element = reporteRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
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
            pdf.save(`Reporte_Caja_${id}.pdf`);
        } catch (err) {
            console.error("Error al generar PDF", err);
        } finally {
            setDescargando(false);
        }
    };

    // 🟢 FUNCIONES PARA CORREGIR ZONA HORARIA
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
            if (!userId) {
                setError("Sesión no válida");
                setCargando(false);
                return;
            }

            try {
                const res = await fetch(`${API_URL}/api/Cajas/${id}?usuarioId=${userId}`);
                if (res.ok) {
                    setReporte(await res.json());
                } else {
                    if (res.status === 401) setError("⛔ No tienes permiso para ver esta caja.");
                    else setError("Caja no encontrada.");
                }
            } catch (e) { console.error(e); setError("Error de conexión"); } 
            finally { setCargando(false); }
        };
        cargar();
    }, [id]);

    if (cargando) return <div className="p-20 text-center animate-pulse text-gray-500 font-bold">Cargando reporte...</div>;
    
    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
            <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
                <div className="text-red-500 text-5xl mb-4">🚫</div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Acceso Denegado</h2>
                <p className="text-gray-500 mb-6">{error}</p>
                <Link href="/admin/caja/historial" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition">
                    Volver al Historial
                </Link>
            </div>
        </div>
    );

    if (!reporte) return null;

    const { caja, resumen, movimientos } = reporte;
    const difEfectivo = (caja.montoFinal || 0) - resumen.totalEfectivo;
    const difTransf = (caja.montoRealTransferencia || 0) - resumen.totalTransferencia;
    const totalReal = (caja.montoFinal || 0) + (caja.montoRealTransferencia || 0);

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
                    {/* BOTÓN PDF AGREGADO */}
                    <button 
                        onClick={descargarPDF}
                        disabled={descargando}
                        className="flex-1 md:flex-none bg-white border-2 border-slate-900 text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition disabled:opacity-50 shadow-sm"
                    >
                        {descargando ? "Generando..." : <><Download size={18}/> Descargar PDF</>}
                    </button>
                    <button onClick={() => window.print()} className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-xl">
                        <Printer size={18}/> Imprimir Reporte
                    </button>
                </div>
            </div>

            {/* REPORTE PRINCIPAL - AGREGADO REF */}
            <div ref={reporteRef} className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none print:w-full">
                
                {/* ENCABEZADO RESPONSIVO */}
                <div className="p-6 md:p-8 border-b border-gray-100 bg-slate-50 print:bg-white print:border-b-2 print:border-black">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">REPORTE DE CIERRE #{caja.id}</h1>
                            <p className="text-gray-500 font-medium mt-1">NEXUS SPORT - Panel Administrativo</p>
                        </div>
                        <div className="text-left md:text-right w-full md:w-auto border-t border-gray-200 md:border-none pt-4 md:pt-0">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Recaudado (Real)</p>
                            <p className="text-4xl font-black text-slate-900">${totalReal.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* TIEMPOS */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center print:flex-row print:gap-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-700 rounded-lg print:hidden"><Unlock size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Inicio</p>
                                <p className="text-sm font-bold text-slate-900">
                                    {formatearFechaLocal(caja.fechaApertura)} {formatearHoraLocal(caja.fechaApertura)}hs
                                </p>
                            </div>
                        </div>
                        <div className="text-gray-300 rotate-90 sm:rotate-0 print:hidden hidden sm:block">➜</div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 text-red-700 rounded-lg print:hidden"><Lock size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Cierre</p>
                                <p className="text-sm font-bold text-slate-900">
                                    {caja.fechaCierre ? `${formatearFechaLocal(caja.fechaCierre)} ${formatearHoraLocal(caja.fechaCierre)}hs` : "---"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COMPARATIVA ARQUEO */}
                <div className="p-6 md:p-8 grid md:grid-cols-2 gap-4 md:gap-8 print:grid-cols-2 print:gap-4 print:py-4">
                    <div className="bg-green-50/50 p-6 rounded-2xl border border-green-100 print:border print:border-gray-300 print:bg-white">
                        <h3 className="text-green-800 font-black uppercase tracking-wider mb-4 flex items-center gap-2"><Banknote size={20}/> Arqueo Efectivo</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600"><span>Teórico (Sistema)</span><span className="font-bold">${resumen.totalEfectivo.toLocaleString()}</span></div>
                            <div className="flex justify-between text-slate-900 text-lg font-bold border-t border-green-200 pt-2"><span>Real (Caja)</span><span>${(caja.montoFinal || 0).toLocaleString()}</span></div>
                            <div className={`flex justify-between font-bold ${difEfectivo >= 0 ? 'text-green-600' : 'text-red-500'} bg-white p-2 rounded-lg mt-2 print:border print:border-gray-200`}>
                                <span>Diferencia</span><span>{difEfectivo > 0 ? '+' : ''}${difEfectivo.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-violet-50/50 p-6 rounded-2xl border border-violet-100 print:border print:border-gray-300 print:bg-white">
                        <h3 className="text-violet-800 font-black uppercase tracking-wider mb-4 flex items-center gap-2"><Smartphone size={20}/> Banco / MP</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600"><span>Teórico (Sistema)</span><span className="font-bold">${resumen.totalTransferencia.toLocaleString()}</span></div>
                            <div className="flex justify-between text-slate-900 text-lg font-bold border-t border-violet-200 pt-2"><span>Real (Banco)</span><span>${(caja.montoRealTransferencia || 0).toLocaleString()}</span></div>
                            <div className={`flex justify-between font-bold ${difTransf >= 0 ? 'text-green-600' : 'text-red-500'} bg-white p-2 rounded-lg mt-2 print:border print:border-gray-200`}>
                                <span>Diferencia</span><span>{difTransf > 0 ? '+' : ''}${difTransf.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN BITÁCORA Y GASTOS */}
                {((caja.totalGastos && caja.totalGastos > 0) || caja.observaciones) && (
                    <div className="p-6 md:p-8 bg-orange-50/50 border-t border-b border-orange-100 print:bg-white print:border-t-2 print:border-black">
                        <h3 className="text-orange-800 font-black uppercase tracking-wider mb-4 flex items-center gap-2">
                            <MessageSquare size={20}/> Observaciones y Gastos Extra
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            {caja.totalGastos ? (
                                <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex items-center gap-4 print:border-gray-300">
                                    <div className="p-3 bg-red-100 text-red-600 rounded-full print:hidden"><TrendingDown size={24}/></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Salidas de Caja (Gastos)</p>
                                        <p className="text-2xl font-black text-red-600">-$ {caja.totalGastos.toLocaleString()}</p>
                                    </div>
                                </div>
                            ) : <div></div>}
                            
                            {caja.observaciones && (
                                <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex-1 print:border-gray-300">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Notas del Operador</p>
                                    <p className="text-sm font-medium text-slate-700 italic">"{caja.observaciones}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* DESGLOSE POR ACTIVIDAD */}
                <div className="px-4 md:px-8 py-8">
                    <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-2">
                        <TrendingUp size={20}/> Desglose por Actividad
                    </h3>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left min-w-[500px]">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase print:bg-gray-100">
                                <tr><th className="p-3 pl-4 whitespace-nowrap">Concepto</th><th className="p-3 text-right whitespace-nowrap">Efectivo</th><th className="p-3 text-right whitespace-nowrap">Transf.</th><th className="p-3 text-right pr-4 whitespace-nowrap">Total</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {[
                                    { label: "Alquiler Canchas", data: resumen.detalle.canchas },
                                    { label: "Restaurante", data: resumen.detalle.mesas },
                                    { label: "Cantina Express", data: resumen.detalle.barra }
                                ].map((row, i) => (
                                    <tr key={i}>
                                        <td className="p-3 pl-4 font-bold text-slate-700 whitespace-nowrap">{row.label}</td>
                                        <td className="p-3 text-right text-green-600 whitespace-nowrap">+${row.data.efectivo.toLocaleString()}</td>
                                        <td className="p-3 text-right text-violet-600 whitespace-nowrap">+${row.data.transferencia.toLocaleString()}</td>
                                        <td className="p-3 text-right pr-4 font-black text-slate-900 whitespace-nowrap">${(row.data.efectivo + row.data.transferencia).toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="bg-yellow-50 print:bg-gray-50">
                                    <td className="p-3 pl-4 font-bold text-yellow-800 whitespace-nowrap">Fondo Inicial</td>
                                    <td className="p-3 text-right font-bold text-yellow-800 whitespace-nowrap">${caja.montoInicial.toLocaleString()}</td>
                                    <td className="p-3 text-right whitespace-nowrap">-</td>
                                    <td className="p-3 text-right pr-4 font-bold text-yellow-800 whitespace-nowrap">${caja.montoInicial.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FOOTER PRINT */}
                <div className="hidden print:block p-8 text-center text-xs text-gray-400 border-t border-gray-200">
                    <p>Reporte generado el {new Date().toLocaleString()}</p>
                    <p>Sistema de Gestión Nexus Sport</p>
                </div>
            </div>

            {/* BOTÓN PARA VER MOVIMIENTOS (FUERA DE LA REF) */}
            <div className="max-w-4xl mx-auto mt-4 print:hidden px-4 md:px-0">
                <button 
                    onClick={() => setShowModalMovimientos(true)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition"
                >
                    <List size={20}/> Ver Listado Detallado de Movimientos ({movimientos.length})
                </button>
            </div>

            {/* MODAL DE MOVIMIENTOS */}
            {showModalMovimientos && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowModalMovimientos(false)}>
                    <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <List size={24} className="text-gray-400"/> Detalle de Movimientos
                            </h3>
                            <button onClick={() => setShowModalMovimientos(false)} className="text-gray-400 hover:text-red-500 transition bg-white p-2 rounded-full shadow-sm"><X size={24}/></button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left min-w-[800px]">
                                        <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 sticky top-0 z-10">
                                            <tr>
                                                <th className="p-4 pl-6 bg-gray-50 whitespace-nowrap">Hora</th>
                                                <th className="p-4 bg-gray-50 whitespace-nowrap">Concepto</th>
                                                <th className="p-4 bg-gray-50">Detalle</th>
                                                <th className="p-4 text-center bg-gray-50 whitespace-nowrap">Método</th>
                                                <th className="p-4 text-right bg-gray-50 whitespace-nowrap">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {movimientos.map((m) => (
                                                <tr key={m.id} className="hover:bg-slate-50 transition break-inside-avoid">
                                                    <td className="p-4 pl-6 font-mono text-xs text-gray-500 align-top whitespace-nowrap">
                                                        {formatearHoraLocal(m.hora)}hs
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-700 flex items-center gap-2 align-top whitespace-nowrap">
                                                        {getIconoConcepto(m.concepto)}{m.concepto}
                                                    </td>
                                                    <td className="p-4 text-gray-600 text-xs align-top min-w-[200px]">
                                                        <div className="font-bold mb-1 text-slate-800">{m.detalle}</div>
                                                        {m.items && m.items.length > 0 && (
                                                            <div className="space-y-1 mt-2 pl-2 border-l-2 border-gray-100">
                                                                {m.items.filter(i => !i.producto.toLowerCase().includes('alquiler') && i.precio > 0).map((item, idx) => (
                                                                    <div key={idx} className="flex gap-2 text-[11px]">
                                                                        <span className="text-gray-400 font-bold">{item.cantidad || 1}x</span>
                                                                        <span className="text-gray-600">{item.producto}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center align-top whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border ${m.metodo.includes('Efectivo') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-violet-50 text-violet-700 border-violet-100'}`}>
                                                            {m.metodo}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-black text-slate-900 align-top whitespace-nowrap">${m.monto.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
                            <button onClick={() => setShowModalMovimientos(false)} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800">Cerrar Listado</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}