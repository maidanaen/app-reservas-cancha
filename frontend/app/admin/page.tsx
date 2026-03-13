"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, Users, TrendingUp, AlertTriangle, Calendar, 
  ArrowRight, Lock, Send // 🟢 IMPORTAMOS 'Send'
} from "lucide-react";
import { API_URL } from '@/utils/config';
import useSWR from 'swr';
import { fetcher } from '@/utils/fetcher';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [nombreNegocio, setNombreNegocio] = useState("Panel Principal");
  const [generandoLink, setGenerandoLink] = useState(false);

  const userId = typeof window !== 'undefined' ? localStorage.getItem("usuarioId") : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

  // --- CARGA CON SWR (Resumen) ---
  const { data: dashboardData } = useSWR(
      userId && token ? `${API_URL}/api/Dashboard/resumen?usuarioId=${userId}` : null,
      fetcher
  );

  // Transformación de Stats
  const stats = {
    ventasDiarias: dashboardData?.ventasDiarias || 0,
    turnosHoy: dashboardData?.turnosHoy || 0,
    cajaActual: dashboardData?.cajaActual || 0,
    grafico: Array.isArray(dashboardData?.grafico) ? dashboardData.grafico.map((g: any) => ({
        fecha: new Date(g.fecha).toLocaleDateString('es-AR', { weekday: 'short' }),
        total: g.total
    })) : []
  };

  // --- CARGA CON SWR (Turnos) ---
  const { data: todasLasReservasRaw } = useSWR(
      userId && token ? `${API_URL}/api/Reservas?usuarioId=${userId}` : null,
      fetcher
  );

  const proximosTurnos = Array.isArray(todasLasReservasRaw) ? todasLasReservasRaw
    .filter((r: any) => {
        const fechaR = new Date(r.fechaInicio);
        const ahora = new Date();
        return fechaR >= ahora && (r.tipo === "Cancha" || r.canchaId != null); 
    })
    .sort((a: any, b: any) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()) 
    .slice(0, 5) : [];

  useEffect(() => {
    const nombre = localStorage.getItem("nombreNegocio");
    if (nombre) setNombreNegocio(nombre);

    if (!token && typeof window !== 'undefined') {
        router.push("/admin/login");
    }
  }, [token, router]);

  // 🟢 NUEVA FUNCIÓN: Conectar Telegram
  const conectarTelegram = async () => {
      const userId = localStorage.getItem("usuarioId");
      if (!userId) {
          alert("Error: No se identificó el usuario.");
          return;
      }

      setGenerandoLink(true);
      try {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
          const token = localStorage.getItem("token");
          
          // Llamamos a tu AuthController
          const res = await fetch(`${API_URL}/api/Auth/generar-link-telegram?usuarioId=${userId}`, {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}` 
              }
          });

          if (res.ok) {
              const data = await res.json();
              // Abre Telegram en una nueva pestaña mágica
              window.open(data.url, "_blank");
          } else {
              alert("❌ Error al generar el enlace de Telegram.");
          }
      } catch (error) {
          console.error("Error conectando a Telegram:", error);
          alert("❌ Error de conexión con el servidor.");
      } finally {
          setGenerandoLink(false);
      }
  };



  return (
    <main className="max-w-7xl mx-auto p-4 font-sans bg-gray-50 min-h-screen relative" >
      
      {/* --- ENCABEZADO --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{nombreNegocio} 🚀</h1>
            <p className="text-gray-500 font-medium">Resumen de actividad en tiempo real.</p>
        </div>
        <div className="flex gap-5 mb-4">
            <Link href="/admin/reservas" className="bg-white text-slate-700 border border-gray-200 px-5 py-3 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm flex items-center gap-2">
                <Calendar size={18}/> Ver Agenda
            </Link>
            <Link href="/admin/caja" className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center gap-2">
                <DollarSign size={18}/> Ir a Caja
            </Link>
        </div>
      </div>

      {/* --- TARJETAS (KPIs) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Card 1: Ventas */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ventas de la Jornada</p>
                    <h2 className="text-4xl font-black text-slate-900">${stats.ventasDiarias.toLocaleString()}</h2>
                    <div className="flex items-center gap-1 text-green-600 font-bold text-xs mt-2 bg-green-50 w-fit px-2 py-1 rounded-full">
                        <TrendingUp size={14}/> Facturación diaria
                    </div>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                    <TrendingUp size={24}/>
                </div>
            </div>
        </div>

        {/* Card 2: Turnos */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Turnos Reservados</p>
                    <h2 className="text-4xl font-black text-slate-900">{stats.turnosHoy}</h2>
                    <Link href="/admin/reservas" className="flex items-center gap-1 text-blue-600 font-bold text-xs mt-2 hover:underline">
                        <Users size={14}/> Ver Turnos <ArrowRight size={12}/>
                    </Link>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Users size={24}/>
                </div>
            </div>
        </div>

        {/* Card 3: Caja (Negra) */}
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Caja Actual</p>
                    <h2 className="text-4xl font-black text-white">${stats.cajaActual.toLocaleString()}</h2>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]"></div>
                        <span className="text-xs font-bold text-slate-300 tracking-wide">TURNO OPERATIVO</span>
                    </div>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl text-white backdrop-blur-sm">
                    <Lock size={24}/>
                </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600 rounded-full blur-[80px] opacity-20"></div>
        </div>

      </div>

      {/* --- GRID PRINCIPAL --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-96">
         
         {/* COLUMNA IZQUIERDA: GRÁFICO */}
         <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col" style={{height: "100%"}}>
             <h3 className="font-bold text-slate-800 mb-6">Ingresos de la Semana</h3>
             <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={stats.grafico}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`}/>
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', padding: '12px'}}
                        itemStyle={{color: '#0f172a', fontWeight: 'bold'}}
                      />
                      <Bar dataKey="total" fill="#cbd5e1" radius={[6, 6, 6, 6]} barSize={40} activeBar={{fill: '#0f172a'}} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
         </div>

         {/* COLUMNA DERECHA: PRÓXIMOS TURNOS */}
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col" style={{height: "100%"}}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800">Próximos Partidos</h3>
                <Link href="/admin/reservas" className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg transition"><ArrowRight size={18}/></Link>
             </div>
             
             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {proximosTurnos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                        <Calendar size={32} className="mb-2 opacity-20"/>
                        <p>No hay partidos próximos.</p>
                    </div>
                ) : (
                    proximosTurnos.map((turno, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition border border-transparent hover:border-gray-100 group">
                            {/* FECHA/HORA */}
                            <div className="flex flex-col items-center justify-center bg-gray-100 text-gray-500 w-12 h-12 rounded-xl font-bold text-xs group-hover:bg-slate-900 group-hover:text-white transition">
                                <span>{new Date(turno.fechaInicio).getDate()}</span>
                                <span className="uppercase text-[9px]">{new Date(turno.fechaInicio).toLocaleDateString('es-AR', {month:'short'})}</span>
                            </div>
                            
                            {/* DETALLES */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide whitespace-nowrap">
                                        {new Date(turno.fechaInicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                    
                                    {turno.cancha?.nombre && (
                                        <span className="text-xs font-bold text-gray-400 uppercase truncate">
                                            {turno.cancha.nombre}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-slate-700 truncate">{turno.clienteNombre || "Cliente Anónimo"}</p>
                            </div>
                            
                            {/* INDICADOR ESTADO */}
                            <div className={`w-2 h-2 rounded-full ${turno.estado === 'Pagado' ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                        </div>
                    ))
                )}
             </div>
         </div>
      </div>

      {/* 🟢 NUEVA SECCIÓN: ALERTAS DE TELEGRAM */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mt-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      🤖 Alertas por Telegram
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-xl">
                      Recibe notificaciones instantáneas y gratuitas en tu celular cada vez que un cliente realice una nueva reserva desde la web.
                  </p>
              </div>
              
              <button 
                  onClick={conectarTelegram}
                  disabled={generandoLink}
                  className="bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-200/50 disabled:opacity-50 whitespace-nowrap"
              >
                  {generandoLink ? (
                      <span className="animate-pulse">Generando enlace...</span>
                  ) : (
                      <>
                          <Send size={20} />
                          Conectar Bot
                      </>
                  )}
              </button>
          </div>
      </div>

    </main>
  );
}