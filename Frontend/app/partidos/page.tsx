"use client";
import { useEffect, useState } from "react";
import { Users, Plus, UserPlus, Calendar, Trash2, MessageCircle, CheckCircle, MapPin, Trophy } from "lucide-react";

interface Inscripcion {
    id: number;
    nombre: string;
    contacto: string;
}

interface Partido {
  id: number;
  creador: string;
  contacto: string;
  fecha: string;
  hora: string;
  nivel: string;
  jugadoresFaltantes: number;
  claveBorrado?: string;
  deporte: string; 
  lugar: string;    
  inscripciones: Inscripcion[];
}

interface Cancha {
    id: number;
    nombre: string;
}

export default function PartidosPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [canchasDisponibles, setCanchasDisponibles] = useState<Cancha[]>([]); 
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Modal Unirse
  const [partidoAUnirse, setPartidoAUnirse] = useState<Partido | null>(null);
  const [miNombre, setMiNombre] = useState("");
  const [miContacto, setMiContacto] = useState("");

  // Formulario Crear Sala
  const [nuevoCreador, setNuevoCreador] = useState("");
  const [nuevoContacto, setNuevoContacto] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nuevaHora, setNuevaHora] = useState("20:00");
  const [nuevoNivel, setNuevoNivel] = useState("7ma");
  const [cuantosFaltan, setCuantosFaltan] = useState(2);
  const [nuevaClave, setNuevaClave] = useState("");
  const [nuevoDeporte, setNuevoDeporte] = useState("Padel");
  const [nuevoLugar, setNuevoLugar] = useState("");

  const cargarDatos = async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        const resPartidos = await fetch("https://localhost:7123/api/Partidos");
        if (resPartidos.ok) setPartidos(await resPartidos.json());

        const resCanchas = await fetch("https://localhost:7123/api/Canchas");
        if (resCanchas.ok) {
            const dataCanchas = await resCanchas.json();
            setCanchasDisponibles(dataCanchas);
            if(dataCanchas.length > 0) setNuevoLugar(dataCanchas[0].nombre);
        }
    } catch (error) { console.error(error); }
  };

  useEffect(() => { cargarDatos(); }, []);

  // 🟢 FUNCIÓN INTELIGENTE PARA GENERAR LINK DE WHATSAPP
  const generarLinkWhatsApp = (numero: string, nombreOrg: string, deporte: string) => {
      if (!numero) return "#";

      // 1. Dejar solo números
      let limpio = numero.replace(/\D/g, "");

      // 2. Si empieza con '0' (ej: 0379...), quitarlo
      if (limpio.startsWith("0")) limpio = limpio.substring(1);

      // 3. Si ya empieza con '54', asumimos que está completo. Si no, agregamos '549'
      if (!limpio.startsWith("54")) {
          limpio = "549" + limpio;
      }

      return `https://wa.me/${limpio}?text=Hola ${nombreOrg}, vi tu partido de ${deporte} en Nexus Sport y quiero sumarme.`;
  };

  const crearSala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaClave.trim()) { alert("Crea una clave para poder borrar la sala después."); return; }
    if (!nuevoLugar) { alert("Debes seleccionar una cancha."); return; }

    setCargando(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    const nuevoPartido = {
        creador: nuevoCreador,
        contacto: nuevoContacto,
        fecha: nuevaFecha,
        hora: nuevaHora,
        nivel: nuevoNivel,
        jugadoresFaltantes: Number(cuantosFaltan),
        claveBorrado: nuevaClave,
        deporte: nuevoDeporte, 
        lugar: nuevoLugar      
    };

    await fetch("https://localhost:7123/api/Partidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoPartido)
    });

    setMostrarForm(false);
    setCargando(false);
    setNuevaClave(""); 
    cargarDatos(); 
    alert("✅ Sala creada correctamente.");
  };

  const confirmarUnion = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!partidoAUnirse) return;

      const nombreConTelefono = `${miNombre} 📱${miContacto}`;

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const res = await fetch("https://localhost:7123/api/Partidos/inscribirse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              partidoId: partidoAUnirse.id,
              nombre: nombreConTelefono, 
              contacto: miContacto       
          })
      });

      if (res.ok) {
          alert("👏 ¡Te anotaste correctamente!");
          setPartidoAUnirse(null);
          setMiNombre("");
          setMiContacto("");
          cargarDatos();
      } else {
          alert("Error: Quizás ya se llenó el cupo.");
      }
  };

  const borrarSalaPropia = async (id: number) => {
      const claveIngresada = prompt("🔒 Clave de borrado:");
      if (!claveIngresada) return;

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const res = await fetch(`https://localhost:7123/api/Partidos/borrar/${id}?clave=${claveIngresada}`, { 
          method: "DELETE" 
      });

      if (res.ok) {
          alert("🗑️ Sala eliminada.");
          cargarDatos();
      } else {
          alert("⛔ Clave incorrecta.");
      }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 min-h-screen font-sans relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="text-blue-600" size={36}/> Encuentra Partido
            </h1>
            <p className="text-slate-500 font-medium mt-1">Súmate y completa canchas para cualquier deporte.</p>
        </div>
        <button 
            onClick={() => setMostrarForm(!mostrarForm)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition flex items-center gap-2"
        >
            {mostrarForm ? "Cancelar" : <><Plus size={20}/> Crear un Partido</>}
        </button>
      </div>

      {/* FORMULARIO */}
      {mostrarForm && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 mb-10 animate-in fade-in slide-in-from-top-4 border-l-8 border-l-blue-600">
             <h2 className="text-xl font-bold text-slate-900 mb-6">📢 Creacion de un Nuevo Partido</h2>
            <form onSubmit={crearSala} className="grid md:grid-cols-2 gap-6">
                
                {/* Columna Izquierda */}
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Deporte</label>
                        <select className="w-full p-3 border rounded-xl font-bold bg-white" value={nuevoDeporte} onChange={e => setNuevoDeporte(e.target.value)}>
                            <option value="Padel">🎾 Padel</option>
                            <option value="Futbol">⚽ Futbol</option>
                            <option value="Tenis">🥎 Tenis</option>
                            <option value="Voley">🏐 Voley</option>
                            <option value="Basket">🏀 Basket</option>
                        </select>
                    </div>

                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Cancha / Lugar</label>
                        {canchasDisponibles.length > 0 ? (
                             <select className="w-full p-3 border rounded-xl font-bold bg-white" value={nuevoLugar} onChange={e => setNuevoLugar(e.target.value)}>
                                {canchasDisponibles.map(c => (
                                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                ))}
                                <option value="A confirmar">📍 A confirmar</option>
                            </select>
                        ) : (
                            <input type="text" placeholder="Ej: Cancha 1" className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={nuevoLugar} onChange={e => setNuevoLugar(e.target.value)}/>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Nivel</label>
                        <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={nuevoNivel} onChange={e => setNuevoNivel(e.target.value)}>
                            <option value="8va">8va Categoría</option>
                            <option value="7ma">7ma Categoría</option>
                            <option value="6ta">6ta Categoría</option>
                            <option value="5ta">5ta Categoría</option>
                            <option value="4ta">4ta Categoría</option>
                            <option value="3ta">3ta Categoría</option>
                            <option value="2ta">2ta Categoría</option>
                            <option value="1ta">1ta Categoría</option>
                            <option value="Amistoso">Amistoso / Libre</option>
                        </select>
                    </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-4">
                     <div className="flex gap-2">
                        <div className="w-full">
                            <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                            <input required type="date" className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} />
                        </div>
                        <div className="w-full">
                            <label className="text-xs font-bold text-gray-500 uppercase">Hora</label>
                            <input required type="time" className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={nuevaHora} onChange={e => setNuevaHora(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="w-full">
                            <label className="text-xs font-bold text-gray-500 uppercase">Organiza</label>
                            <input required type="text" placeholder="Tu Nombre" className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={nuevoCreador} onChange={e => setNuevoCreador(e.target.value)} />
                        </div>
                        <div className="w-full">
                            <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                            <input required type="text" placeholder="Ej: 3794123456" className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={nuevoContacto} onChange={e => setNuevoContacto(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex gap-2 items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <label className="whitespace-nowrap font-bold text-blue-800 uppercase text-xs">Faltan:</label>
                        <input required type="number" min="1" max="20" className="w-20 p-2 border rounded-lg font-bold bg-white text-center" value={cuantosFaltan} onChange={e => setCuantosFaltan(Number(e.target.value))} />
                        <span className="text-xs text-blue-600 font-medium">jugadores</span>
                    </div>

                    <input required type="password" placeholder="Clave de Borrado (Ej: 1234)" className="w-full p-3 border border-yellow-300 rounded-xl font-bold bg-yellow-50 focus:ring-yellow-500 placeholder-yellow-600/50" value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} />
                </div>

                <button disabled={cargando} className="md:col-span-2 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                    {cargando ? "Publicando..." : "Crear Partido Público"}
                </button>
            </form>
        </div>
      )}

      {/* LISTADO DE PARTIDOS */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partidos.map((p) => {
            const estaCompleto = p.jugadoresFaltantes === 0;
            const iconoDeporte = p.deporte === 'Futbol' ? '⚽' : p.deporte === 'Tenis' ? '🥎' : p.deporte === 'Voley' ? '🏐' : p.deporte === 'Basket' ? '🏀' : '🎾';

            return (
                <div key={p.id} className={`bg-white rounded-3xl shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between
                    ${estaCompleto ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}
                >
                    <div className="p-6 pb-0">
                        <div className="flex justify-between items-center mb-4">
                             <div className="flex gap-2">
                                <span className="bg-slate-100 text-slate-700 text-xs font-black px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                    {iconoDeporte} {p.deporte}
                                </span>
                                <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider 
                                    ${estaCompleto ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {p.nivel}
                                </span>
                             </div>
                            <button onClick={() => borrarSalaPropia(p.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={18} /></button>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            {estaCompleto ? (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle size={32} />
                                    <h3 className="text-3xl font-black tracking-tight">¡LISTO!</h3>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-4xl font-black text-slate-900">{p.jugadoresFaltantes}</h3>
                                    <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Faltan</span>
                                </>
                            )}
                        </div>
                        
                        <div className="space-y-2 mb-4">
                            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Calendar size={16} className="text-gray-400"/> {new Date(p.fecha).toLocaleDateString()} - {p.hora}hs
                            </p>
                            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <MapPin size={16} className="text-gray-400"/> {p.lugar}
                            </p>
                            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <UserPlus size={16} className="text-gray-400"/> Org: {p.creador}
                            </p>
                        </div>

                        {p.inscripciones && p.inscripciones.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-3 mb-4">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Confirmados:</p>
                                <ul className="space-y-1">
                                    {p.inscripciones.map((insc) => (
                                        <li key={insc.id} className="text-xs font-bold text-slate-700 flex justify-between items-center border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                            <span className="flex items-center gap-1">✅ {insc.nombre}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="p-6 pt-0">
                        {/* 🟢 ENLACE WHATSAPP MEJORADO */}
                        {p.contacto && (
                            <a 
                                href={generarLinkWhatsApp(p.contacto, p.creador, p.deporte)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full mb-3 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-green-100 shadow-lg"
                            >
                                <MessageCircle size={18} /> 
                                Contactar Org.
                            </a>
                        )}

                        <button 
                            disabled={estaCompleto}
                            onClick={() => setPartidoAUnirse(p)}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg 
                                ${estaCompleto 
                                    ? 'bg-gray-100 text-gray-400 cursor-default shadow-none' 
                                    : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200 group-hover:shadow-blue-200'}`}
                        >
                            {estaCompleto ? "Cancha Completa 🎉" : "¡Me sumo! 🙋‍♂️"}
                        </button>
                    </div>
                </div>
            );
        })}
      </div>

      {/* MODAL UNIRSE */}
      {partidoAUnirse && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                  <h3 className="text-2xl font-black text-slate-900 mb-2">¡Genial! Te vas a sumar</h3>
                  <p className="text-gray-500 mb-6">Deja tus datos para que {partidoAUnirse.creador} te contacte.</p>
                  
                  <form onSubmit={confirmarUnion} className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Tu Nombre</label>
                          <input autoFocus required type="text" className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={miNombre} onChange={e => setMiNombre(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Tu WhatsApp (Visible para el Org)</label>
                          <input required type="text" placeholder="Ej: 3794..." className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={miContacto} onChange={e => setMiContacto(e.target.value)} />
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setPartidoAUnirse(null)} className="flex-1 py-3 bg-gray-100 font-bold text-gray-600 rounded-xl hover:bg-gray-200">Cancelar</button>
                          <button type="submit" className="flex-1 py-3 bg-blue-600 font-bold text-white rounded-xl hover:bg-blue-700">Confirmar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </main>
  );
}