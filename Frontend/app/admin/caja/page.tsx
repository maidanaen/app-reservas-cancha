"use client";
import { useEffect, useState, useRef } from "react";
import { 
  ArrowLeft, Calendar, DollarSign, CreditCard, 
  Smartphone, Printer, TrendingUp, CheckCircle, Image as ImageIcon 
} from "lucide-react";
import Link from "next/link";
import html2canvas from "html2canvas";

interface Reserva {
  id: number;
  clienteNombre: string;
  fechaInicio: string;
  canchaId: number;
  cobradoEfectivo: number;
  cobradoTransferencia: number;
  cobradoDigital: number;
}

export default function CierreCajaPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [movimientos, setMovimientos] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(false);
  
  const reporteRef = useRef<HTMLDivElement>(null);

  // Totales
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);
  const [totalDigital, setTotalDigital] = useState(0);

  const cargarCaja = async () => {
    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`https://localhost:7123/api/Reservas/dia/${fecha}`);
      if (res.ok) {
        const data = await res.json();
        setMovimientos(data);
        calcularTotales(data);
      }
    } catch (error) { console.error("Error cargando caja", error); } 
    finally { setCargando(false); }
  };

  const calcularTotales = (datos: Reserva[]) => {
    setTotalEfectivo(datos.reduce((acc, curr) => acc + curr.cobradoEfectivo, 0));
    setTotalTransferencia(datos.reduce((acc, curr) => acc + curr.cobradoTransferencia, 0));
    setTotalDigital(datos.reduce((acc, curr) => acc + curr.cobradoDigital, 0));
  };

  useEffect(() => { cargarCaja(); }, [fecha]);

  const totalGeneral = totalEfectivo + totalTransferencia + totalDigital;

  const descargarImagen = async () => {
    if (!reporteRef.current) return;
    try {
        const canvas = await html2canvas(reporteRef.current, {
            backgroundColor: "#ffffff",
            scale: 2,
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `Cierre_Caja_${fecha}.png`;
        link.click();
    } catch (error) { alert("Error al generar imagen"); }
  };

  // --- 📅 FUNCIÓN PARA MOSTRAR FECHA SIN ERRORES DE ZONA HORARIA ---
  const formatearFechaVisual = (fechaString: string) => {
      if (!fechaString) return "-";
      // Cortamos el string "2026-01-28" en partes: [2026, 01, 28]
      const [anio, mes, dia] = fechaString.split("-");
      // Lo unimos a mano para que no haya dudas: "28/01/2026"
      return `${dia}/${mes}/${anio}`;
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 font-sans print:bg-white print:p-0">
      
      {/* HEADER NAVEGACIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 print:hidden">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <Link href="/admin" className="p-2 bg-white border rounded-lg hover:bg-gray-100 transition">
                <ArrowLeft size={20} className="text-gray-600"/>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Cierre de Caja</h1>
                <p className="text-gray-500 text-sm">Resumen financiero diario</p>
            </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border shadow-sm w-full md:w-auto">
            <Calendar size={20} className="text-blue-600 ml-2"/>
            <input 
                type="date" 
                className="outline-none font-bold text-gray-700 bg-transparent p-1"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
            />
        </div>
      </div>

      {/* --- ZONA DE REPORTE (FOTO) --- */}
      <div ref={reporteRef} className="bg-gray-50 p-4 rounded-xl">
        
        {/* TITULO INTERNO (Aquí estaba el error) */}
        <div className="mb-6 text-center border-b pb-4">
            <h1 className="text-3xl font-bold text-black">Reporte de Cierre de Caja</h1>
            {/* Usamos la nueva función formatearFechaVisual */}
            <p className="text-gray-600 text-lg mt-1">Fecha: {formatearFechaVisual(fecha)}</p>
        </div>

        {/* --- TARJETAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden print:bg-white print:text-black print:border print:border-black">
                <div className="absolute right-[-10px] top-[-10px] opacity-20 print:hidden">
                    <TrendingUp size={100} />
                </div>
                <p className="text-gray-400 text-sm font-medium uppercase print:text-black">Ingresos Totales</p>
                <h2 className="text-4xl font-bold mt-2">${totalGeneral.toLocaleString()}</h2>
                <div className="mt-4 flex items-center gap-1 text-green-400 text-xs font-bold bg-gray-800 w-fit px-2 py-1 rounded print:hidden">
                    <CheckCircle size={12}/> Caja al día
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:border-gray-300">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-100 p-2 rounded-lg text-green-600 print:hidden"><DollarSign size={24}/></div>
                    <span className="font-bold text-gray-600">Efectivo</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">${totalEfectivo.toLocaleString()}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:border-gray-300">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600 print:hidden"><Smartphone size={24}/></div>
                    <span className="font-bold text-gray-600">Transferencias</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">${totalTransferencia.toLocaleString()}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:border-gray-300">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600 print:hidden"><CreditCard size={24}/></div>
                    <span className="font-bold text-gray-600">Tarjetas / MP</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">${totalDigital.toLocaleString()}</h3>
            </div>
        </div>

        {/* --- TABLA --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
            <div className="p-6 border-b border-gray-100 print:hidden">
                <h3 className="font-bold text-lg text-gray-800">Detalle de Movimientos</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider print:bg-white print:border-b print:text-black">
                            <th className="p-4 font-bold">Hora</th>
                            <th className="p-4 font-bold">Cliente</th>
                            <th className="p-4 font-bold text-right text-green-700 print:text-black">Efectivo</th>
                            <th className="p-4 font-bold text-right text-purple-700 print:text-black">Transf.</th>
                            <th className="p-4 font-bold text-right text-blue-700 print:text-black">Digital</th>
                            <th className="p-4 font-bold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm print:divide-gray-300">
                        {movimientos.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-400">No hay movimientos registrados hoy.</td>
                            </tr>
                        ) : (
                            movimientos.map((mov) => {
                                const totalMov = mov.cobradoEfectivo + mov.cobradoTransferencia + mov.cobradoDigital;
                                const hora = new Date(mov.fechaInicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                
                                return (
                                    <tr key={mov.id} className="hover:bg-gray-50 transition print:hover:bg-white">
                                        <td className="p-4 font-bold text-gray-700">{hora}</td>
                                        <td className="p-4 capitalize">
                                            <div className="font-medium text-gray-900">{mov.clienteNombre}</div>
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-600">
                                            {mov.cobradoEfectivo > 0 ? `$${mov.cobradoEfectivo.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-600">
                                            {mov.cobradoTransferencia > 0 ? `$${mov.cobradoTransferencia.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-600">
                                            {mov.cobradoDigital > 0 ? `$${mov.cobradoDigital.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="p-4 text-right font-bold text-black">
                                            ${totalMov.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {movimientos.length > 0 && (
                        <tfoot className="bg-gray-50 font-bold text-gray-900 print:bg-white print:border-t-2 print:border-black">
                            <tr>
                                <td colSpan={2} className="p-4 text-right uppercase text-xs">Totales del Día</td>
                                <td className="p-4 text-right text-green-700 print:text-black">${totalEfectivo.toLocaleString()}</td>
                                <td className="p-4 text-right text-purple-700 print:text-black">${totalTransferencia.toLocaleString()}</td>
                                <td className="p-4 text-right text-blue-700 print:text-black">${totalDigital.toLocaleString()}</td>
                                <td className="p-4 text-right text-black text-lg">${totalGeneral.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 flex gap-3 print:hidden">
        <button 
            onClick={descargarImagen} 
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-full shadow-xl font-bold transition transform hover:scale-105"
        >
            <ImageIcon size={20} /> Guardar Imagen
        </button>
        <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-6 py-3 bg-black text-white hover:bg-gray-800 rounded-full shadow-xl font-bold transition transform hover:scale-105"
        >
            <Printer size={20} /> Imprimir
        </button>
      </div>
    </main>
  );
}