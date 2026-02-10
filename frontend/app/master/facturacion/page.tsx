"use client";
import { useEffect, useState } from "react";
import { CreditCard, CheckCircle, Clock, AlertCircle, DollarSign, Download, Search, RefreshCw } from "lucide-react";
import { API_URL } from '@/utils/config';

interface Cliente {
  id: number;
  userName: string;
  nombreNegocio: string;
  fechaAlta: string;
  activo: boolean;
  ultimoPago: string | null; // 🟢 VIENE DE LA BD
}

export default function FacturacionPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<number | null>(null); // Para mostrar spinner en el botón
  const [filtro, setFiltro] = useState("");

  const PRECIO_PLAN = 20000;
  
  // Fechas actuales para comparar
  const fechaHoy = new Date();
  const mesActual = fechaHoy.getMonth(); // 0 = Enero
  const anioActual = fechaHoy.getFullYear();
  const nombreMes = fechaHoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`${API_URL}/api/SuperAdmin/clientes`);
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  // 🟢 LÓGICA DE COBRO REAL
  const registrarPago = async (id: number, esDeshacer: boolean) => {
    setProcesandoId(id);
    const endpoint = esDeshacer ? "deshacer-pago" : "registrar-pago";
    
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const res = await fetch(`${API_URL}/api/SuperAdmin/${endpoint}/${id}`, {
            method: 'POST'
        });

        if (res.ok) {
            // Recargamos la lista para ver el cambio reflejado desde la BD
            await cargarClientes();
        } else {
            alert("Error al procesar el pago");
        }
    } catch (error) {
        console.error(error);
    } finally {
        setProcesandoId(null);
    }
  };

  // 🟢 FUNCIÓN MAESTRA: ¿ESTÁ PAGADO?
  const verificarEstadoPago = (fechaPagoISO: string | null) => {
    if (!fechaPagoISO) return false;
    const fechaPago = new Date(fechaPagoISO);
    
    // Verificamos si el pago corresponde a ESTE mes y ESTE año
    return fechaPago.getMonth() === mesActual && fechaPago.getFullYear() === anioActual;
  };

  // CÁLCULOS FINANCIEROS REALES
  const totalEsperado = clientes.length * PRECIO_PLAN;
  const clientesPagados = clientes.filter(c => verificarEstadoPago(c.ultimoPago));
  const totalCobrado = clientesPagados.length * PRECIO_PLAN;
  const totalPendiente = totalEsperado - totalCobrado;
  const porcentajeCobro = totalEsperado > 0 ? Math.round((totalCobrado / totalEsperado) * 100) : 0;

  // FILTRADO
  const clientesFiltrados = clientes.filter(c => 
    c.nombreNegocio?.toLowerCase().includes(filtro.toLowerCase()) || 
    c.userName?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-2">
                    <CreditCard className="text-green-500" /> Facturación Real
                </h1>
                <p className="text-slate-500 font-medium">Gestión de cobros - {nombreMes.toUpperCase()}</p>
            </div>
            
            <button onClick={cargarClientes} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-xl transition" title="Refrescar">
                <RefreshCw size={20} className={cargando ? "animate-spin" : ""}/>
            </button>
        </div>

        {/* TARJETAS DE RESUMEN (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Esperado */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Potencial Mes</p>
                <h3 className="text-4xl font-black text-white mt-2">${totalEsperado.toLocaleString()}</h3>
                <div className="w-full bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: '100%' }}></div>
                </div>
            </div>

            {/* Cobrado Real */}
            <div className="bg-slate-900 border border-green-900/30 p-6 rounded-2xl relative overflow-hidden">
                <p className="text-green-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle size={12}/> Cobrado
                </p>
                <h3 className="text-4xl font-black text-green-400 mt-2">${totalCobrado.toLocaleString()}</h3>
                <div className="w-full bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${porcentajeCobro}%` }}></div>
                </div>
                <p className="text-right text-xs text-slate-500 mt-1">{porcentajeCobro}% completado</p>
            </div>

            {/* Pendiente */}
            <div className="bg-slate-900 border border-red-900/30 p-6 rounded-2xl relative overflow-hidden">
                <p className="text-red-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                    <Clock size={12}/> Pendiente
                </p>
                <h3 className="text-4xl font-black text-red-400 mt-2">${totalPendiente.toLocaleString()}</h3>
                <div className="flex items-center gap-2 mt-4">
                    <AlertCircle size={16} className="text-red-500"/>
                    <span className="text-xs text-slate-400">{clientes.length - clientesPagados.length} clubes deben pagar</span>
                </div>
            </div>
        </div>

        {/* TABLA DE CLIENTES */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {/* Buscador */}
            <div className="p-6 border-b border-slate-800 flex items-center gap-4">
                <Search className="text-slate-500" size={20}/>
                <input 
                    type="text" 
                    placeholder="Buscar cliente por nombre..." 
                    className="bg-transparent text-white font-bold outline-none w-full placeholder:text-slate-600"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                />
            </div>

            <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-500 text-xs uppercase font-bold tracking-wider">
                    <tr>
                        <th className="p-6">Cliente / Club</th>
                        <th className="p-6">Plan</th>
                        <th className="p-6">Estado {nombreMes}</th>
                        <th className="p-6 text-right">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm font-medium">
                    {cargando ? (
                        <tr><td colSpan={4} className="p-10 text-center text-slate-500">Cargando datos...</td></tr>
                    ) : clientesFiltrados.length === 0 ? (
                        <tr><td colSpan={4} className="p-10 text-center text-slate-500">No se encontraron clientes.</td></tr>
                    ) : (
                        clientesFiltrados.map(cliente => {
                            const estaPagado = verificarEstadoPago(cliente.ultimoPago);
                            const procesando = procesandoId === cliente.id;

                            return (
                                <tr key={cliente.id} className="hover:bg-slate-800/50 transition group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${estaPagado ? 'bg-green-600' : 'bg-slate-700'}`}>
                                                {cliente.nombreNegocio ? cliente.nombreNegocio.substring(0,2).toUpperCase() : "CN"}
                                            </div>
                                            <div>
                                                <div className="text-white font-bold">{cliente.nombreNegocio || "Sin Nombre"}</div>
                                                <div className="text-slate-500 text-xs">{cliente.userName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg text-xs font-bold border border-slate-700">
                                            Pro ($20k)
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        {estaPagado ? (
                                            <div className="flex flex-col">
                                                <span className="inline-flex w-fit items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-xs font-bold border border-green-500/20">
                                                    <CheckCircle size={14} /> Pagado
                                                </span>
                                                <span className="text-[10px] text-slate-500 mt-1 pl-1">
                                                    {new Date(cliente.ultimoPago!).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full text-xs font-bold border border-red-500/20 animate-pulse">
                                                <AlertCircle size={14} /> Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-6 text-right">
                                        <button 
                                            onClick={() => registrarPago(cliente.id, estaPagado)}
                                            disabled={procesando}
                                            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ml-auto disabled:opacity-50 ${
                                                estaPagado 
                                                ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700' 
                                                : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20'
                                            }`}
                                        >
                                            {procesando ? (
                                                <RefreshCw size={16} className="animate-spin"/>
                                            ) : estaPagado ? (
                                                <>Deshacer</>
                                            ) : (
                                                <><DollarSign size={16}/> Cobrar</>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

      </div>
    </div>
  );
}