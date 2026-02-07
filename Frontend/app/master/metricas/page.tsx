"use client";
import { useEffect, useState } from "react";
import { Activity, Users, DollarSign, Server, TrendingUp, RefreshCw } from "lucide-react";
// 👇 Importamos componentes del gráfico
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { API_URL } from '@/utils/config';

interface MetricasData {
  clubesActivos: number;
  reservasHoy: number;
  ingresosSaaS: number;
  estadoServidor: string;
  topClub: string;
}

export default function MetricasPage() {
  const [data, setData] = useState<MetricasData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]); // Estado para el gráfico
  const [cargando, setCargando] = useState(true);

  // Función para obtener datos reales
  const fetchMetricas = async () => {
    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      // 1. Cargar Métricas Generales (KPIs)
      const resMetricas = await fetch(`${API_URL}/api/SuperAdmin/metricas`);
      if (resMetricas.ok) {
        const resultado = await resMetricas.json();
        setData(resultado);
      }

      // 2. Cargar Clientes para el Gráfico
      const resClientes = await fetch(`${API_URL}/api/SuperAdmin/clientes`);
      if (resClientes.ok) {
        const clientes = await resClientes.json();
        
        // Transformamos los datos para el gráfico
        const dataGrafico = clientes
            .filter((c: any) => c.activo)
            .map((c: any) => ({
                name: c.nombreNegocio,
                ventas: c.totalReservas || 0, // Usamos reservas reales
            }))
            .sort((a: any, b: any) => b.ventas - a.ventas) // Ordenar de mayor a menor
            .slice(0, 5); // Top 5

        setChartData(dataGrafico);
      }

    } catch (error) {
      console.error("Error conectando con Master API", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchMetricas();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-2">
                    <Activity className="text-red-500"/> Visión Global
                </h2>
                <p className="text-slate-500">Datos consolidados de todos los clubes en tiempo real.</p>
            </div>
            <button 
                onClick={fetchMetricas} 
                className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition text-slate-400 hover:text-white"
                title="Actualizar datos"
            >
                <RefreshCw size={20} className={cargando ? "animate-spin" : ""} />
            </button>
        </div>

        {/* GRID DE KPIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Card 1: Clubes */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-900 transition">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Users size={60} /></div>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Clubes Activos</p>
                <h3 className="text-4xl font-black text-white mt-2">
                    {cargando ? "..." : data?.clubesActivos}
                </h3>
                <span className="text-blue-400 text-xs font-bold mt-2 inline-block">Clientes Totales</span>
            </div>

            {/* Card 2: Reservas Hoy */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-purple-900 transition">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Activity size={60} /></div>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Reservas Hoy (Global)</p>
                <h3 className="text-4xl font-black text-white mt-2">
                    {cargando ? "..." : data?.reservasHoy}
                </h3>
                <span className="text-purple-400 text-xs font-bold mt-2 inline-block">Alta Demanda</span>
            </div>

            {/* Card 3: Ingresos SaaS */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-green-900 transition">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><DollarSign size={60} /></div>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">MRR (Ingresos)</p>
                <h3 className="text-4xl font-black text-white mt-2">
                    {cargando ? "..." : `$${data?.ingresosSaaS.toLocaleString()}`}
                </h3>
                <span className="text-green-500 text-xs font-bold mt-2 inline-block">Estimado Mensual</span>
            </div>

            {/* Card 4: Status */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-orange-900 transition">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition"><Server size={60} /></div>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Estado Sistema</p>
                <h3 className="text-2xl font-black text-green-400 mt-4 truncate">
                    {cargando ? "..." : data?.estadoServidor}
                </h3>
                <span className="text-slate-500 text-xs font-bold mt-2 inline-block">Latencia: &lt;20ms</span>
            </div>
        </div>

        {/* Sección Inferior: TOP CLUB y GRÁFICO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* IZQUIERDA: Ganador */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col justify-center">
                 <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-yellow-500"/> Club del Mes (Más Ventas)
                 </h3>
                 <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center font-black text-slate-900 text-xl">
                        1
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Ganador Actual</p>
                        <p className="text-xl font-bold text-white">{cargando ? "Calculando..." : data?.topClub}</p>
                    </div>
                 </div>
                 {/* Mini detalle extra para rellenar espacio */}
                 <p className="text-xs text-slate-600 mt-4 text-center">Basado en total de reservas históricas</p>
            </div>

            {/* DERECHA: Gráfico Funcional */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl border-dashed relative">
                <p className="text-slate-500 text-xs font-bold uppercase mb-4 absolute top-6 left-6">Rendimiento Comparativo</p>
                
                {/* Contenedor del Gráfico */}
                <div className="w-full h-[200px] mt-4">
                    {cargando ? (
                        <div className="h-full flex items-center justify-center text-slate-600 animate-pulse">Cargando gráfico...</div>
                    ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    cursor={{fill: 'transparent'}}
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="ventas" radius={[4, 4, 0, 0]} barSize={30}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? "#eab308" : "#475569"} /> // El primero (ganador) es amarillo, el resto gris
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-600">No hay datos suficientes</div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}