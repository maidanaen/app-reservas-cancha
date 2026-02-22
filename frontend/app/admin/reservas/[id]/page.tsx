"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    ArrowLeft, Save, Plus, Trash2, DollarSign, Wallet, User, 
    ShoppingBag, Beer, CheckCircle, Calculator, Users, Search, 
    AlertCircle, X 
} from "lucide-react";
import { API_URL } from '@/utils/config';

// --- INTERFACES ---
interface Consumo {
  id: number;
  producto: string;
  precio: number;
  cantidad: number;
  jugador: string;
}

interface Reserva {
  id: number;
  clienteNombre: string;
  fechaInicio: string;
  fechaFin: string;
  canchaId: number;
  cobradoEfectivo: number;
  cobradoTransferencia: number;
  cobradoDigital: number;
  consumos: Consumo[];
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: string;
  precioVenta?: number; 
}

export default function DetalleReservaPage() {
  const params = useParams();
  const router = useRouter();
  const inputProductoRef = useRef<HTMLInputElement>(null);
  
  const id = params?.id ? String(params.id) : null;
  
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [precioCancha, setPrecioCancha] = useState(0); 
  const [cargando, setCargando] = useState(false);
  
  const [productosInventario, setProductosInventario] = useState<Producto[]>([]);
  
  const [cantidadPersonas, setCantidadPersonas] = useState(4); 
  const [nuevoConsumo, setNuevoConsumo] = useState({ producto: "", precio: "", jugador: "" });

  const [sugerencias, setSugerencias] = useState<Producto[]>([]);
  const [mostrarMenu, setMostrarMenu] = useState(false);

  // 🟢 ESTADOS MODAL ELIMINAR
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [consumoAEliminar, setConsumoAEliminar] = useState<number | null>(null);

  // 🟢 SISTEMA DE NOTIFICACIONES (TOAST)
  const [notificacion, setNotificacion] = useState<{ tipo: 'error' | 'exito', msj: string } | null>(null);

  const mostrarMensaje = (tipo: 'error' | 'exito', msj: string) => {
      setNotificacion({ tipo, msj });
      setTimeout(() => setNotificacion(null), 4000);
  };

  // 1. CARGA DE DATOS DE LA RESERVA
  const cargarDatos = async () => {
    if (!id) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`${API_URL}/api/Reservas/${id}`);
      if (!res.ok) throw new Error("Error al buscar la reserva");
      
      const dataReserva = await res.json();
      setReserva(dataReserva);

      const inicio = new Date(dataReserva.fechaInicio).getTime();
      const fin = new Date(dataReserva.fechaFin).getTime();
      const duracionHoras = (fin - inicio) / 3600000;
      
      const resCancha = await fetch(`${API_URL}/api/Canchas/${dataReserva.canchaId}`);
      const dataCancha = await resCancha.json();
      setPrecioCancha(Math.round(duracionHoras * dataCancha.precioPorHora));

    } catch (error) { console.error(error); }
  };

  useEffect(() => { if (id) cargarDatos(); }, [id]); 

  // 2. CARGA DE PRODUCTOS
  useEffect(() => {
    const userId = localStorage.getItem("usuarioId");
    if (!userId) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    fetch(`${API_URL}/api/Productos?usuarioId=${userId}`)
      .then(async (res) => {
          if (res.ok) {
              const data = await res.json();
              setProductosInventario(data); 
          } else {
              console.error("Error API Productos:", await res.text());
          }
      })
      .catch(err => console.error("Error de red:", err));
  }, []);

  // --- GUARDAR PAGOS ---
  const guardarPagos = async (reservaActualizada?: Reserva) => {
    const dataToSave = reservaActualizada || reserva;
    if (!dataToSave || !id) return;
    
    setCargando(true);
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const pagos = {
            cobradoEfectivo: dataToSave.cobradoEfectivo,
            cobradoTransferencia: dataToSave.cobradoTransferencia
        };

        const res = await fetch(`${API_URL}/api/Reservas/cobrar/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pagos)
        });

        if (res.ok) {
            if (!reservaActualizada) mostrarMensaje('exito', "✅ Caja y Pagos actualizados correctamente"); 
            cargarDatos();
        } else {
            mostrarMensaje('error', "Error al actualizar los pagos en caja");
        }
    } catch (error) { 
        console.error(error);
        mostrarMensaje('error', "Error de conexión al guardar"); 
    } 
    finally { setCargando(false); }
  };

  // --- COBRAR JUGADOR ---
  const cobrarJugador = async (jugador: string, monto: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA') => {
      if (!reserva || !id) return;
      
      setCargando(true);

      const nuevosPagos = { 
          cobradoEfectivo: reserva.cobradoEfectivo,
          cobradoTransferencia: reserva.cobradoTransferencia
      };

      if (metodo === 'EFECTIVO') nuevosPagos.cobradoEfectivo += monto;
      else nuevosPagos.cobradoTransferencia += monto;

      try {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

          await fetch(`${API_URL}/api/Reservas/cobrar/${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(nuevosPagos)
          });

          const etiquetaPago = metodo === 'EFECTIVO' ? "✅ PAGO EFECTIVO" : "✅ PAGO TRANSFERENCIA";
          const consumoData = {
              reservaId: Number(id),
              producto: etiquetaPago,
              precio: 0,
              cantidad: 1,
              jugador: jugador 
          };

          await fetch(`${API_URL}/api/Consumos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(consumoData)
          });

          mostrarMensaje('exito', `Cobro registrado a ${jugador}`);
          await cargarDatos();

      } catch (error) {
          console.error(error);
          mostrarMensaje('error', "Error al procesar el cobro.");
      } finally {
          setCargando(false);
      }
  };

  // --- POST CONSUMO NORMAL ---
  const postConsumo = async (producto: string, precio: number, jugador: string) => {
      if (!id) return;
      const jugadorFinal = jugador.trim() !== "" ? jugador : "Varios";
      
      const consumoData = {
          reservaId: Number(id),
          producto: producto,
          precio: precio,
          cantidad: 1,
          jugador: jugadorFinal 
      };

      try {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
          const res = await fetch(`${API_URL}/api/Consumos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(consumoData)
          });
          if (res.ok) {
              setNuevoConsumo({ ...nuevoConsumo, producto: "", precio: "" });
              cargarDatos(); 
          }
      } catch (error) { console.error(error); }
  };

  const agregarConsumoForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoConsumo.producto || !nuevoConsumo.precio) return;
    postConsumo(nuevoConsumo.producto, Number(nuevoConsumo.precio), nuevoConsumo.jugador);
    setTimeout(() => inputProductoRef.current?.focus(), 100);
  };

  const agregarParteCancha = (jugador: string) => {
      if (precioCancha === 0) return;
      const partesActuales = reserva?.consumos.filter(c => c.producto.startsWith("Alquiler")).length || 0;
      const numeroParte = partesActuales + 1;
      const parte = Math.round(precioCancha / cantidadPersonas);
      const nombreItem = `Alquiler (${numeroParte}/${cantidadPersonas})`;
      
      postConsumo(nombreItem, parte, jugador);
  };

  // 🟢 NUEVAS FUNCIONES PARA EL MODAL DE ELIMINAR
  const iniciarEliminacion = (consumoId: number) => {
      setConsumoAEliminar(consumoId);
      setMostrarModalEliminar(true);
  };

  const confirmarEliminacion = async () => {
      if (!consumoAEliminar) return;
      try {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
          await fetch(`${API_URL}/api/Consumos/${consumoAEliminar}`, { method: "DELETE" });
          mostrarMensaje('exito', '🗑️ Ítem eliminado correctamente.');
          cargarDatos();
      } catch (error) {
          mostrarMensaje('error', 'No se pudo eliminar el ítem.');
      } finally {
          setMostrarModalEliminar(false);
          setConsumoAEliminar(null);
      }
  };

  const cargarParaJugador = (nombre: string) => {
      setNuevoConsumo({ ...nuevoConsumo, jugador: nombre, producto: "", precio: "" });
      inputProductoRef.current?.focus();
  };

  if (!reserva) return <div className="p-10 text-center text-gray-500">Cargando...</div>;

  // --- CÁLCULOS FINALES ---
  const consumosReales = reserva.consumos.filter(c => !c.producto.startsWith("Alquiler"));
  const totalCantina = consumosReales.reduce((acc, c) => acc + c.precio, 0);
  const totalGeneral = precioCancha + totalCantina;

  const totalPagado = reserva.cobradoEfectivo + reserva.cobradoTransferencia + reserva.cobradoDigital;
  const saldoPendiente = totalGeneral - totalPagado;

  const valorParteCancha = cantidadPersonas > 0 ? Math.round(precioCancha / cantidadPersonas) : 0;

  const cuentasPorJugador = reserva.consumos.reduce((acc, item) => {
      const nombre = item.jugador || "Varios";
      if (!acc[nombre]) acc[nombre] = [];
      acc[nombre].push(item);
      return acc;
  }, {} as Record<string, Consumo[]>);

  const getEstadoCaja = () => {
      if (saldoPendiente > 0) {
          return { 
              estilo: 'bg-red-100 text-red-700 border-red-200', 
              texto: `FALTA: $${saldoPendiente.toLocaleString()}`,
              icono: '🔴'
          };
      } else if (saldoPendiente === 0) {
          return { 
              estilo: 'bg-green-100 text-green-700 border-green-200', 
              texto: '✅ PAGO EXACTO',
              icono: '✅'
          };
      } else {
          return { 
              estilo: 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse', 
              texto: `⚠️ SOBRAN: $${Math.abs(saldoPendiente).toLocaleString()}`,
              icono: '⚠️'
          };
      }
  };
  const estado = getEstadoCaja();

  return (
    <main className="max-w-7xl mx-auto p-6 font-sans bg-gray-50 min-h-screen relative">
      
      {/* 🔔 NOTIFICACIÓN FLOTANTE (TOAST) */}
      {notificacion && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 border ${
              notificacion.tipo === 'error' 
                ? 'bg-red-50 text-red-800 border-red-200' 
                : 'bg-green-50 text-green-800 border-green-200'
          }`}>
              {notificacion.tipo === 'error' ? <AlertCircle size={24} className="text-red-600"/> : <CheckCircle size={24} className="text-green-600"/>}
              <div>
                  <h4 className="font-black text-sm uppercase">{notificacion.tipo === 'error' ? 'Error' : 'Éxito'}</h4>
                  <p className="font-medium text-sm">{notificacion.msj}</p>
              </div>
              <button onClick={() => setNotificacion(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={18}/></button>
          </div>
      )}

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-lg border hover:bg-gray-100 transition shadow-sm">
            <ArrowLeft className="text-gray-600"/>
        </button>
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Turno #{reserva.id}</h1>
            <p className="text-gray-500 text-sm font-medium">{reserva.clienteNombre} — {new Date(reserva.fechaInicio).toLocaleDateString()}</p>
        </div>
        <div className={`ml-auto px-4 py-2 rounded-lg font-bold text-lg border shadow-sm flex items-center gap-2 ${estado.estilo}`}>
            <span>{estado.icono}</span>
            {estado.texto}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* === COLUMNA IZQUIERDA: RESUMEN Y CAJA === */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2"><DollarSign size={20}/> Resumen de Cuenta</h2>
                
                <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-800">
                        <Users size={18} />
                        <span className="text-sm font-bold">Dividir cancha entre:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" min="1" max="10"
                            className="w-12 p-1 text-center font-bold border border-blue-200 rounded outline-none focus:ring-2 ring-blue-500"
                            value={cantidadPersonas}
                            onChange={(e) => setCantidadPersonas(Number(e.target.value))}
                        />
                        <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded border border-blue-100">
                            = ${valorParteCancha.toLocaleString()} c/u
                        </span>
                    </div>
                </div>

                <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>Alquiler Cancha (Fijo)</span>
                        <span className="font-bold text-gray-800">${precioCancha.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Cantina (Sin contar división cancha)</span>
                        <span className="font-bold text-gray-800">${totalCantina.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-xl font-extrabold text-black">
                        <span>TOTAL REAL</span>
                        <span>${totalGeneral.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2"><Wallet size={20}/> Caja Global</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-green-700 uppercase mb-1 block">Efectivo</label>
                        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-green-50 focus-within:ring-2 ring-green-500">
                            <DollarSign size={16} className="text-green-600"/>
                            <input type="number" className="w-full bg-transparent outline-none font-bold text-gray-800" 
                                value={reserva.cobradoEfectivo} onChange={e => setReserva({...reserva!, cobradoEfectivo: Number(e.target.value)})} 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-purple-700 uppercase mb-1 block">Transferencia</label>
                        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-purple-50 focus-within:ring-2 ring-purple-500">
                            <Wallet size={16} className="text-purple-600"/>
                            <input type="number" className="w-full bg-transparent outline-none font-bold text-gray-800" 
                                value={reserva.cobradoTransferencia} onChange={e => setReserva({...reserva!, cobradoTransferencia: Number(e.target.value)})} 
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => guardarPagos()} disabled={cargando} className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 flex items-center gap-2">
                            <Save size={16} /> {cargando ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* === COLUMNA DERECHA === */}
        <div className="flex flex-col h-full gap-4">
            
            {/* CARGA RÁPIDA CON BUSCADOR */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 order-first">
                <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Beer size={20}/> Carga Rápida</h2>
                <form onSubmit={agregarConsumoForm} className="space-y-3">
                    <div className="flex gap-2 items-start">
                        <div className="w-1/3 relative group">
                            <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                                <User size={14} className="text-gray-400 group-focus-within:text-blue-500"/>
                            </div>
                            <input type="text" placeholder="Jugador" 
                                className="w-full pl-8 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 font-medium transition h-[38px]" 
                                value={nuevoConsumo.jugador} onChange={e => setNuevoConsumo({...nuevoConsumo, jugador: e.target.value})}
                            />
                        </div>

                        <div className="flex-1 relative">
                            <input 
                                ref={inputProductoRef} type="text" placeholder="Buscar producto..." 
                                className="w-full p-2 pl-8 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 transition h-[38px]"
                                value={nuevoConsumo.producto} 
                                onChange={e => {
                                    const texto = e.target.value;
                                    setNuevoConsumo({...nuevoConsumo, producto: texto});
                                    if(texto.length > 0) {
                                        const coincidencias = productosInventario.filter(p => p.nombre.toLowerCase().includes(texto.toLowerCase()));
                                        setSugerencias(coincidencias);
                                        setMostrarMenu(true);
                                    } else { setMostrarMenu(false); }
                                }}
                                onBlur={() => setTimeout(() => setMostrarMenu(false), 200)}
                            />
                            <Search size={14} className="absolute left-2 top-3 text-gray-400"/>
                            {mostrarMenu && sugerencias.length > 0 && (
                                <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-48 overflow-y-auto mt-1 left-0">
                                    {sugerencias.map((prod) => (
                                        <li key={prod.id} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex justify-between items-center text-xs"
                                            onMouseDown={() => {
                                                const precioFinal = prod.precioVenta || prod.precio;
                                                setNuevoConsumo({ ...nuevoConsumo, producto: prod.nombre, precio: precioFinal.toString() });
                                                setMostrarMenu(false);
                                            }}
                                        >
                                            <span className="font-medium text-gray-800">{prod.nombre}</span>
                                            <span className="text-green-600 font-bold">${prod.precioVenta || prod.precio}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="w-full relative">
                            <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                            <input required type="number" placeholder="Precio" 
                                className="w-full pl-6 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 transition font-bold text-gray-800" 
                                value={nuevoConsumo.precio} onChange={e => setNuevoConsumo({...nuevoConsumo, precio: e.target.value})}
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 flex justify-center items-center gap-2 transition shadow-md">
                            <Plus size={16}/>
                        </button>
                    </div>
                    
                    {nuevoConsumo.jugador && (
                        <button type="button" onClick={() => agregarParteCancha(nuevoConsumo.jugador)}
                            className="w-full bg-blue-50 text-blue-700 py-2 rounded-lg font-bold text-xs hover:bg-blue-100 flex justify-center items-center gap-2 border border-blue-200">
                            <Calculator size={14} /> Crear "{nuevoConsumo.jugador}" con Parte de Cancha (${valorParteCancha})
                        </button>
                    )}
                </form>
            </div>

            {/* LISTA DE CUENTAS */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                {Object.keys(cuentasPorJugador).length === 0 ? (
                    <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <ShoppingBag size={40} className="mx-auto mb-3 opacity-20"/>
                        <p className="font-medium">No hay consumos registrados.</p>
                    </div>
                ) : (
                    Object.keys(cuentasPorJugador).map((jugador) => {
                        const items = cuentasPorJugador[jugador];
                        const subtotal = items.reduce((acc, curr) => acc + curr.precio, 0);
                        
                        const yaPago = items.some(c => c.producto.startsWith("✅ PAGO"));

                        return (
                            <div key={jugador} className={`rounded-xl shadow-sm border overflow-hidden transition-all ${yaPago ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                
                                <div className="p-3 flex flex-wrap justify-between items-center border-b border-gray-100 gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-full ${yaPago ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                            {yaPago ? <CheckCircle size={14} /> : <User size={14} />}
                                        </div>
                                        <span className={`font-bold capitalize ${yaPago ? 'text-green-800' : 'text-gray-800'}`}>{jugador}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900 px-2 border-r border-gray-300 mr-2">
                                            ${subtotal.toLocaleString()}
                                        </span>

                                        {!yaPago && (
                                            <>
                                                <button onClick={() => agregarParteCancha(jugador)} className="bg-blue-50 text-blue-600 p-1.5 rounded-md hover:bg-blue-100 transition border border-blue-200 flex items-center gap-1 text-xs font-bold" title="Sumar parte de cancha">
                                                    <Calculator size={14} /> + Cancha
                                                </button>
                                                <button onClick={() => cobrarJugador(jugador, subtotal, 'EFECTIVO')} disabled={cargando} className="bg-green-100 text-green-700 hover:bg-green-200 p-1.5 rounded-md transition border border-green-200"><DollarSign size={16} /></button>
                                                <button onClick={() => cobrarJugador(jugador, subtotal, 'TRANSFERENCIA')} disabled={cargando} className="bg-purple-100 text-purple-700 hover:bg-purple-200 p-1.5 rounded-md transition border border-purple-200"><Wallet size={16} /></button>
                                            </>
                                        )}
                                        <button onClick={() => cargarParaJugador(jugador)} className="bg-gray-800 text-white p-1.5 rounded-md hover:bg-black transition"><Plus size={16} /></button>
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-50">
                                    {items.map(item => (
                                        <div key={item.id} className={`p-3 flex justify-between items-center text-sm hover:bg-gray-50/50 ${item.producto.startsWith("✅") ? "bg-green-100/50" : ""}`}>
                                            <span className={`font-medium ${item.producto.includes("Alquiler") ? "text-blue-600 italic" : "text-gray-700"}`}>
                                                {item.producto}
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-gray-900 font-bold">${item.precio}</span>
                                                <button onClick={() => iniciarEliminacion(item.id)} className="text-gray-300 hover:text-red-500 p-1 transition"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
      </div>

      {/* 🟢 NUEVO MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {mostrarModalEliminar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-red-500">
                  <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                      <Trash2 size={32}/>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">¿Eliminar Ítem?</h3>
                  <p className="text-gray-500 mb-6 text-sm">Estás a punto de borrar este consumo de la cuenta. Esta acción descontará el precio del total.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setMostrarModalEliminar(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                      <button onClick={confirmarEliminacion} className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl shadow-lg transition">Sí, Borrar</button>
                  </div>
              </div>
          </div>
      )}

    </main>
  );
}