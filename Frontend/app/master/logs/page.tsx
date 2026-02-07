"use client";
import { useEffect, useState } from "react";
import { Terminal, RefreshCw, AlertTriangle, CheckCircle, Info, ShieldAlert } from "lucide-react";

interface Log {
  id: number;
  fecha: string;
  nivel: string;
  accion: string;
  usuario: string;
  detalle: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [cargando, setCargando] = useState(true);

  const fetchLogs = async () => {
    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch("https://localhost:7123/api/SuperAdmin/logs");
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Función para elegir icono y color según el nivel
  const getLogStyle = (nivel: string) => {
    switch (nivel.toUpperCase()) {
      case 'ERROR': return { icon: <AlertTriangle size={16}/>, color: 'text-red-500', bg: 'bg-red-500/10 border-red-900' };
      case 'SUCCESS': return { icon: <CheckCircle size={16}/>, color: 'text-green-500', bg: 'bg-green-500/10 border-green-900' };
      case 'ALERTA': return { icon: <ShieldAlert size={16}/>, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-900' };
      default: return { icon: <Info size={16}/>, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-900' };
    }
  };

  return (
    <div className="min-h-screen bg-black p-8 text-slate-200 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
            <div>
                <h1 className="text-3xl font-black text-green-500 flex items-center gap-3">
                    <Terminal className="animate-pulse" /> SYSTEM_LOGS
                </h1>
                <p className="text-gray-500 text-sm mt-1"> Rastreando actividad del servidor...</p>
            </div>
            
            <button 
                onClick={fetchLogs} 
                className="bg-gray-900 hover:bg-gray-800 text-green-400 border border-green-900/30 px-4 py-2 rounded-lg flex items-center gap-2 transition font-bold"
            >
                <RefreshCw size={18} className={cargando ? "animate-spin" : ""} /> REFRESCAR
            </button>
        </div>

        {/* CONSOLA DE LOGS */}
        <div className="bg-[#0c0c0c] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Barra de título de ventana */}
            <div className="bg-gray-900/50 px-4 py-2 flex gap-2 border-b border-gray-800">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-2 text-xs text-gray-500">root@nexus-server:~/logs</span>
            </div>

            {/* Lista de Logs */}
            <div className="p-4 space-y-1 h-[70vh] overflow-y-auto custom-scrollbar">
                {cargando ? (
                    <div className="text-green-500 animate-pulse"> Cargando flujo de datos...</div>
                ) : logs.length === 0 ? (
                    <div className="text-gray-600"> No hay registros de actividad.</div>
                ) : (
                    logs.map((log) => {
                        const style = getLogStyle(log.nivel);
                        return (
                            <div key={log.id} className={`flex items-start gap-4 p-3 rounded hover:bg-white/5 transition border-l-2 ${style.color.replace('text-', 'border-')} border-transparent`}>
                                <div className="text-xs text-gray-500 w-32 shrink-0 font-bold pt-1">
                                    {new Date(log.fecha).toLocaleString()}
                                </div>
                                <div className={`w-24 shrink-0 text-xs font-black tracking-wider ${style.color} flex items-center gap-1`}>
                                    {style.icon} {log.nivel}
                                </div>
                                <div className="flex-1">
                                    <span className="text-gray-300 font-bold mr-2">[{log.usuario}]:</span>
                                    <span className="text-gray-400">{log.detalle}</span>
                                </div>
                                <div className="text-xs text-gray-600 font-bold bg-gray-900 px-2 py-1 rounded">
                                    {log.accion}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>

      </div>
    </div>
  );
}