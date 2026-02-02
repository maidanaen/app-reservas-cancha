"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, DollarSign, Wallet, User, ShoppingBag, Beer, CheckCircle, Calculator, Users, Search } from "lucide-react";

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
}

export default function DetalleReservaPage() {
  const params = useParams();
  const router = useRouter();
  const inputProductoRef = useRef<HTMLInputElement>(null);
  
  const id = params?.id ? String(params.id) : null;
  
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [precioCancha, setPrecioCancha] = useState(0); 
  const [cargando, setCargando] = useState(false);
  
  const [cantidadPersonas, setCantidadPersonas] = useState(4); 
  const [nuevoConsumo, setNuevoConsumo] = useState({ producto: "", precio: "", jugador: "" });

  const [productosInventario, setProductosInventario] = useState<Producto[]>([]);
  const [sugerencias, setSugerencias] = useState<Producto[]>([]);
  const [mostrarMenu, setMostrarMenu] = useState(false);

  // 1. CARGA DE DATOS
  const cargarDatos = async () => {
    if (!id) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`https://localhost:7123/api/Reservas/${id}`);
      if (!res.ok) throw new Error("Error al buscar la reserva");
      
      const dataReserva = await res.json();
      setReserva(dataReserva);

      const inicio = new Date(dataReserva.fechaInicio).getTime();
      const fin = new Date(dataReserva.fechaFin).getTime();
      const duracionHoras = (fin - inicio) / 3600000;
      
      const resCancha = await fetch(`https://localhost:7123/api/Canchas/${dataReserva.canchaId}`);
      const dataCancha = await resCancha.json();
      setPrecioCancha(Math.round(duracionHoras * dataCancha.precioPorHora));

    } catch (error) { console.error(error); }
  };

  useEffect(() => { if (id) cargarDatos(); }, [id]); 

  // 2. CARGAR PRODUCTOS
  useEffect(() => {
    const cargarProductos = async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const res = await fetch("https://localhost:7123/api/Productos");
            if (res.ok) {
                setProductosInventario(await res.json());
            }
        } catch (error) { console.error("Error cargando productos", error); }
    };
    cargarProductos();
  }, []);

  // --- 🟢 GUARDAR PAGOS (ACTUALIZADO: Conecta con la Caja) ---
  const guardarPagos = async (reservaActualizada?: Reserva) => {
    const dataToSave = reservaActualizada || reserva;
    if (!dataToSave || !id) return;
    
    setCargando(true);
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        // Preparamos el objeto específico para el endpoint de cobro
        const pagos = {
            cobradoEfectivo: dataToSave.cobradoEfectivo,
            cobradoTransferencia: dataToSave.cobradoTransferencia
        };

        // Usamos el nuevo endpoint POST /cobrar que actualiza la Caja correctamente
        const res = await fetch(`https://localhost:7123/api/Reservas/cobrar/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pagos)
        });

        if (res.ok) {
            if (!reservaActualizada) alert("✅ Caja y Pagos actualizados correctamente"); 
            cargarDatos(); // Recargar para ver reflejados cambios de estado
        } else {
            alert("Error al actualizar los pagos en caja");
        }
    } catch (error) { 
        console.error(error);
        alert("Error de conexión al guardar"); 
    } 
    finally { setCargando(false); }
  };

  // --- 🟢 COBRAR JUGADOR (ACTUALIZADO: Conecta con la Caja) ---
  const cobrarJugador = async (jugador: string, monto: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA') => {
      if (!reserva || !id) return;
      
      setCargando(true); // Bloqueamos UI

      // 1. Calculamos nuevos montos totales
      const nuevosPagos = { 
          cobradoEfectivo: reserva.cobradoEfectivo,
          cobradoTransferencia: reserva.cobradoTransferencia
      };

      if (metodo === 'EFECTIVO') nuevosPagos.cobradoEfectivo += monto;
      else nuevosPagos.cobradoTransferencia += monto;

      try {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

          // PASO 1: Enviar el dinero a la CAJA usando el nuevo endpoint
          await fetch(`https://localhost:7123/api/Reservas/cobrar/${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(nuevosPagos)
          });

          // PASO 2: Crear el ticket de "PAGO REALIZADO" para el historial
          const etiquetaPago = metodo === 'EFECTIVO' ? "✅ PAGO EFECTIVO" : "✅ PAGO TRANSFERENCIA";
          const consumoData = {
              reservaId: Number(id),
              producto: etiquetaPago,
              precio: 0,
              cantidad: 1,
              jugador: jugador 
          };

          await fetch(`https://localhost:7123/api/Consumos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(consumoData)
          });

          // PASO 3: Recargar todo
          await cargarDatos();

      } catch (error) {
          console.error(error);
          alert("Error al procesar el cobro.");
      } finally {
          setCargando(false); // Liberamos UI
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
          const res = await fetch(`https://localhost:7123/api/Consumos`, {
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

  const borrarConsumo = async (consumoId: number) => {
    if(!confirm("¿Eliminar este ítem?")) return;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    await fetch(`https://localhost:7123/api/Consumos/${consumoId}`, { method: "DELETE" });
    cargarDatos();
  };

  const cargarParaJugador = (nombre: string) => {
      setNuevoConsumo({ ...nuevoConsumo, jugador: nombre, producto: "", precio: "" });
      inputProductoRef.current?.focus();
  };

  if (!reserva) return <div className="p-10 text-center text-gray-500">Cargando...</div>;

  // --- CÁLCULOS FINALES Y SEMÁFORO ---
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

  // 🟡 LÓGICA DEL SEMÁFORO VISUAL
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
    <main className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-lg border hover:bg-gray-100 transition shadow-sm">
            <ArrowLeft className="text-gray-600"/>
        </button>
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Turno #{reserva.id}</h1>
            <p className="text-gray-500 text-sm font-medium">{reserva.clienteNombre} — {new Date(reserva.fechaInicio).toLocaleDateString()}</p>
        </div>
        
        {/* 🟡 CARTEL INTELIGENTE (SEMÁFORO) */}
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
                                                setNuevoConsumo({ ...nuevoConsumo, producto: prod.nombre, precio: prod.precio.toString() });
                                                setMostrarMenu(false);
                                            }}
                                        >
                                            <span className="font-medium text-gray-800">{prod.nombre}</span>
                                            <span className="text-green-600 font-bold">${prod.precio}</span>
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
                        
                        // VERIFICAR PAGO
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
                                                <button onClick={() => borrarConsumo(item.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
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
    </main>
  );
}