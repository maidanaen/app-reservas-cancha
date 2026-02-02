"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
    TrendingUp, Users, DollarSign, Calendar, ArrowRight, 
    Activity, Clock, PlayCircle, Lock, Unlock 
} from "lucide-react";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// Definimos la estructura de datos que nos manda el Backend
interface DashboardData {
    kpis: {
        ingresosHoy: number;
        partidosJugados: number;
        totalEnCaja: number;
        hayCajaAbierta: boolean;
    };
    grafico: { fecha: string; dia: string; monto: number }[];
    proximos: { id: number; hora: string; cancha: string; cliente: string; estado: string }[];
}

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            try {
                // Conectamos con tu nuevo Controlador
                const res = await fetch("https://localhost:7123/api/Dashboard/resumen");
                if (res.ok) {
                    const jsonData = await res.json();
                    setData(jsonData);
                }
            } catch (error) { console.error("Error cargando dashboard:", error); }
            finally { setCargando(false); }
        };
        cargarDatos();
    }, []);

    if (cargando) return (
        <div className="min-h-screen bg-gray-50 p-10 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full"></div>
            <p className="text-slate-500 font-medium animate-pulse">Analizando datos del negocio...</p>
        </div>
    );

    if (!data) return <div className="p-10 text-center text-red-500">No se pudieron cargar los datos. Revisa que el Backend esté corriendo.</div>;

    return (
        <main className="max-w-7xl mx-auto p-6 font-sans bg-gray-50 min-h-screen">
            
            {/* --- HEADER DE BIENVENIDA --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control 🚀</h1>
                    <p className="text-gray-500 font-medium">Resumen de actividad en tiempo real.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/admin/reservas" className="bg-white text-slate-700 px-5 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition flex items-center gap-2 shadow-sm">
                        <Calendar size={18}/> Ver Agenda
                    </Link>
                    <Link href="/admin/caja" className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-200/50">
                        <DollarSign size={18}/> Ir a Caja
                    </Link>
                </div>
            </div>

            {/* --- SECCIÓN 1: TARJETAS KPI (INDICADORES CLAVE) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                
                {/* 1. VENTAS DE HOY */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-8 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110">
                        <TrendingUp size={32} className="text-green-600" />
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Ventas de la Jornada</p>
                    <h2 className="text-4xl font-black text-slate-900">${data.kpis.ingresosHoy.toLocaleString()}</h2>
                    <p className="text-xs font-bold text-green-600 mt-2 flex items-center gap-1">
                        <Activity size={14}/> Facturación diaria
                    </p>
                </div>

                {/* 2. PARTIDOS JUGADOS */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-8 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110">
                        <Users size={32} className="text-blue-600" />
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Partidos Jugados</p>
                    <h2 className="text-4xl font-black text-slate-900">{data.kpis.partidosJugados}</h2>
                    <p className="text-xs font-bold text-blue-600 mt-2 flex items-center gap-1">
                        <PlayCircle size={14}/> Turnos completados
                    </p>
                </div>

                {/* 3. ESTADO DE CAJA (Interactivo) */}
                <Link href="/admin/caja">
                    <div className={`cursor-pointer h-full p-6 rounded-3xl shadow-lg relative overflow-hidden transition-transform hover:scale-[1.02] ${data.kpis.hayCajaAbierta ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'}`}>
                        <div className="absolute right-0 top-0 p-8 bg-white/10 rounded-bl-full -mr-4 -mt-4">
                            {data.kpis.hayCajaAbierta ? <Unlock size={32}/> : <Lock size={32}/>}
                        </div>
                        <p className="text-xs font-black uppercase tracking-wider mb-1 opacity-80">
                            Caja Actual
                        </p>
                        <h2 className="text-4xl font-black mb-2">
                            {data.kpis.hayCajaAbierta ? `$${data.kpis.totalEnCaja.toLocaleString()}` : "CERRADA"}
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-white ${data.kpis.hayCajaAbierta ? 'animate-pulse' : ''}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-wide">
                                {data.kpis.hayCajaAbierta ? 'Turno Operativo' : 'Requiere Apertura'}
                            </span>
                        </div>
                    </div>
                </Link>
            </div>

            {/* --- SECCIÓN 2: GRÁFICO Y LISTA --- */}
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* GRÁFICO DE BARRAS (Ocupa 2 espacios) */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            Ingresos de la Semana
                        </h3>
                        <p className="text-sm text-gray-400 font-medium">Evolución de ventas últimos 7 días</p>
                    </div>
                    
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.grafico} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis 
                                    dataKey="dia" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} 
                                    dy={10}
                                    tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} // Capitalize
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#94a3b8', fontSize: 11}} 
                                    tickFormatter={(val) => `$${val/1000}k`} // Formato $10k
                                />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px 16px'
                                    }}
                                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Ingresos"]}                                   labelStyle={{color: '#64748b', fontWeight: 'bold', marginBottom: '4px'}}
                                />
                                <Bar dataKey="monto" radius={[8, 8, 0, 0]} barSize={40}>
                                    {data.grafico.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.fecha === new Date().toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'}) ? '#0f172a' : '#cbd5e1'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* LISTA PRÓXIMOS TURNOS (Ocupa 1 espacio) */}
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="mb-6 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900">Próximos Turnos</h3>
                        <Link href="/admin/reservas" className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition">
                            <ArrowRight size={20}/>
                        </Link>
                    </div>
                    
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[350px] custom-scrollbar pr-2">
                        {data.proximos.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10 text-gray-400">
                                <Clock size={40} className="mb-2 opacity-20"/>
                                <p className="text-sm">No hay reservas próximas hoy.</p>
                            </div>
                        ) : (
                            data.proximos.map((turno) => (
                                <div key={turno.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 group">
                                    {/* HORA */}
                                    <div className="bg-slate-100 text-slate-600 font-bold p-3 rounded-xl text-center min-w-[60px] group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                        <div className="text-xs uppercase">{new Date(turno.hora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                    </div>
                                    {/*FECHA*/}
                                    <div className="bg-slate-100 text-slate-600 font-bold p-3 rounded-xl text-center min-w-[60px] group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                        <div className="text-xs uppercase">{new Date(turno.hora).toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit'})}</div>
                                    </div>
                                    
                                    {/* INFO */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 truncate">{turno.cancha}</p>
                                        <p className="text-xs text-gray-500 font-medium truncate">{turno.cliente}</p>
                                    </div>
                                    
                                    {/* ESTADO PAGO */}
                                    <div title={turno.estado}>
                                        {turno.estado === 'Pagado' ? (
                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full ring-4 ring-green-100"></div>
                                        ) : (
                                            <div className="w-2.5 h-2.5 bg-orange-400 rounded-full animate-pulse ring-4 ring-orange-100"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
}