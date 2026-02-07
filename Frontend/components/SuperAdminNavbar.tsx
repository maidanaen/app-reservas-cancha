"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    ShieldAlert, Users, CreditCard, Activity, LogOut, Terminal,  ChartNoAxesCombined } from "lucide-react";

export default function SuperAdminNavbar() {
    const router = useRouter();

    const salir = () => {
        if(confirm("¿Salir del Modo Super Admin?")) {
            // Aquí podrías limpiar credenciales si guardaras alguna específica
            router.push("/admin/login");
        }
    }

    return (
        <nav className="bg-slate-950 border-b border-slate-800 px-6 py-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* LOGO SUPER ADMIN */}
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-900/50">
                        <ShieldAlert className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-wider">NEXUS <span className="text-red-500">MASTER</span></h1>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">SaaS Control Center</p>
                    </div>
                </div>

                {/* MENU DE NAVEGACIÓN */}
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <Link href="/master/clientes/nuevo" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white shadow-sm border border-slate-700 transition">
                        <Users size={16} className="text-blue-400"/>
                        <span className="text-sm font-bold">Clientes</span>
                    </Link>
                    <Link href="/master/metricas" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white shadow-sm border border-slate-700 transition">
                        <ChartNoAxesCombined size={16} className="text-blue-400"/>
                        <span className="text-sm font-bold">Metricas</span>
                    </Link>
                    <Link href="/master/facturacion" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white shadow-sm border border-slate-700 transition">
                        <ChartNoAxesCombined size={16} className="text-blue-400"/>
                        <span className="text-sm font-bold">Facturacion</span>
                    </Link>
                     <Link href="/master/logs" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white shadow-sm border border-slate-700 transition">
                        <Terminal size={16} className="text-blue-400"/>
                        <span className="text-sm font-bold">Logs</span>
                    </Link>
                    
                </div>

                {/* SALIR */}
                <button 
                    onClick={salir}
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-lg transition text-sm font-bold"
                >
                    <LogOut size={18}/> Salir
                </button>
            </div>
        </nav>
    );
}