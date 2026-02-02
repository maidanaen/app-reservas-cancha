"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, Trophy, User, Menu, DollarSign, Coffee, LayoutDashboard, LogOut, Package , Megaphone, UtensilsCrossed,Store} from "lucide-react";
import { useState } from "react";
import router from "next/router";

export default function Navbar() {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // 1. DETECTAR SI ESTAMOS EN MODO ADMIN
  // Si la ruta empieza con "/admin", activamos el modo Admin
  const isAdmin = pathname?.startsWith("/admin");

  const isActive = (ruta: string) => pathname === ruta;
    const handleLogout = () => {
    localStorage.removeItem("esAdmin");
         router.push("/admin/login");
    };    
  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 font-sans mb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO (Cambia ligeramente si es Admin) */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link href={isAdmin ? "/admin" : "/"} className="text-2xl font-black tracking-tighter text-slate-900 hover:opacity-80 transition flex items-center gap-1">
              NEXUS<span className="text-blue-600 italic">SPORT</span>
            </Link>
            {isAdmin && (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded border border-slate-200 uppercase tracking-wide">
                    Panel Admin
                </span>
            )}
          </div>

          {/* 2. MENÚ ESCRITORIO (CONDICIONAL) */}
          <div className="hidden md:flex space-x-6">
            
            {isAdmin ? (
                // --- OPCIONES DE ADMIN ---
                <>
                   
                    <Link href="/admin" className={`flex items-center gap-1 font-bold transition py-1 border-b-2 ${isActive('/admin') ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-blue-600'}`}>
                        <LayoutDashboard size={18} /> Panel
                    </Link>
                    <Link href="/admin/canchas" className={`flex items-center gap-1 font-bold transition py-1 border-b-2 ${isActive('/admin/canchas') ? 'text-green-600 border-green-600' : 'text-gray-500 border-transparent hover:text-green-600'}`}>
                        <Users size={18} /> Canchas
                    </Link>
                    <Link href="/admin/reservas" className={`flex items-center gap-1 font-bold transition py-1 border-b-2 ${isActive('/admin/reservas') ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-blue-600'}`}>
                        <Calendar size={18} /> Agenda
                    </Link>
                    <Link href="/admin/mesas"  className={`flex items-center gap-1 font-bold transition py-1 border-b-2 ${isActive('/admin/mesas') ? 'text-purple-600 border-purple-600' : 'text-gray-500 border-transparent hover:text-purple-600'}`}>
                        <UtensilsCrossed size={18} />  Mesas
                    </Link>
                    <Link href="/admin/cantina" className={`flex items-center gap-1 font-bold transition py-1 border-b-2 ${isActive('/admin/cantina') ? 'text-orange-600 border-orange-600' : 'text-gray-500 border-transparent hover:text-orange-600'}`}>
                        <Store size={18} /> Cantina
                    </Link>
                     <Link href="/admin/caja" className={`flex items-center gap-1 font-bold transition py-1 border-b-2 ${isActive('/admin/caja') ? 'text-green-600 border-green-600' : 'text-gray-500 border-transparent hover:text-green-600'}`}>
                        <DollarSign size={18} />  Gestion de Caja
                    </Link>
                    <Link href="/admin/noticias" className={`flex items-center gap-1 font-bold transition py-1 border-b-2 ${isActive('/admin/noticias') ? 'text-pink-600 border-pink-600' : 'text-gray-500 border-transparent hover:text-pink-600'}`}>
                        <Megaphone size={18} /> Crear Eventos
                    </Link>
                    {/* Botón Salir */}
                    <button onClick={handleLogout} className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex items-center gap-1">
                        <LogOut size={18} /> Salir
                    </button>
                </>
            ) : (
                // --- OPCIONES DE CLIENTE ---
                <>
                    <Link href="/reservar" className={`flex items-center gap-2 font-bold transition py-1 border-b-2 ${isActive('/reservar') ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-blue-600'}`}>
                        <Calendar size={18} /> Reservar
                    </Link>
                    <Link href="\mis-reservas" className={`flex items-center gap-2 font-bold transition py-1 border-b-2 ${isActive('/mis-turnos') ? 'text-green-600 border-green-600' : 'text-gray-500 border-transparent hover:text-green-600'}`}>
                        <User size={18} /> Mis Turnos
                    </Link>
                    <Link href="/partidos" className={`flex items-center gap-2 font-bold transition py-1 border-b-2 ${isActive('/partidos') ? 'text-purple-600 border-purple-600' : 'text-gray-500 border-transparent hover:text-purple-600'}`}>
                        <Users size={18} /> Crear Partidos
                    </Link>
                    <Link href="/torneos" className={`flex items-center gap-2 font-bold transition py-1 border-b-2 ${isActive('/torneos') ? 'text-orange-600 border-orange-600' : 'text-gray-500 border-transparent hover:text-orange-600'}`}>
                        <Trophy size={18} /> Eventos-Noticias
                    </Link>
                    
                </>
            )}

          </div>

          {/* BOTÓN MENÚ MÓVIL */}
          <div className="md:hidden">
             <button onClick={() => setMenuAbierto(!menuAbierto)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Menu />
             </button>
          </div>

        </div>
      </div>

      {/* MENÚ DESPLEGABLE MÓVIL (También condicional) */}
      {menuAbierto && (
        <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-2 shadow-lg">
            {isAdmin ? (
                <>
                    <Link href="/admin" className="block p-3 rounded-xl bg-gray-50 font-bold">🎛️ Panel</Link>
                    <Link href="/admin/reservas" className="block p-3 rounded-xl hover:bg-gray-50 font-bold">📅 Agenda</Link>
                    <Link href="/admin/partidos" className="block p-3 rounded-xl hover:bg-gray-50 font-bold">👥 Ver Salas</Link>
                    <Link href="/admin/mesas" className="block p-3 rounded-xl hover:bg-gray-50 font-bold">🍽️ Mesas</Link>
                    <Link href="/admin/cantina" className="block p-3 rounded-xl hover:bg-gray-50 font-bold">🏪 Cantina</Link>
                    <Link href="/admin/caja" className="block p-3 rounded-xl hover:bg-gray-50 font-bold">💰 Gestion de Caja</Link>
                    <Link href="/admin/noticias" className="block p-3 rounded-xl hover:bg-gray-50 font-bold">📢 Crear Eventos</Link>
                    <Link href="/" className="block p-3 rounded-xl bg-red-50 text-red-600 font-bold">🚪 Salir</Link>
                </>
            ) : (
                <>
                    <Link href="/reservar" className="block p-3 rounded-xl bg-blue-50 text-blue-700 font-bold">📅 Reservar</Link>
                    <Link href="/mis-turnos" className="block p-3 rounded-xl hover:bg-gray-50 text-gray-600 font-bold">👤 Mis Turnos</Link>
                    <Link href="/partidos" className="block p-3 rounded-xl hover:bg-gray-50 text-gray-600 font-bold">👥 Partidos</Link>
                    <Link href="/torneos" className="block p-3 rounded-xl hover:bg-gray-50 text-gray-600 font-bold">🏆 Eventos-Noticias</Link>
                    
                </>
            )}
        </div>
      )}
    </nav>
  );
}