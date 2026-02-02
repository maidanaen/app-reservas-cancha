"use client";
import { useEffect, useState } from "react";
import { 
  ArrowLeft, Plus, Users, Utensils, Coffee, 
  Trash2, DollarSign, CheckCircle, Calculator, Banknote, CreditCard, Wallet 
} from "lucide-react";
import Link from "next/link";

// --- TIPOS DE DATOS ---
interface Mesa {
  id: number;
  nombre: string;
  estaOcupada: boolean;
  reservaActualId: number | null;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  categoria: string;
}

interface Consumo {
  id: number;
  producto: string;
  precio: number;
  cantidad: number;
}

interface ReservaMesa {
  id: number;
  consumos: Consumo[];
  clienteNombre: string;
  cobradoEfectivo: number;
  cobradoTransferencia: number;
}

// Interfaz auxiliar para agrupar visualmente
interface ConsumoAgrupado {
    nombre: string;
    precioUnitario: number;
    cantidad: number;
    total: number;
    ids: number[]; // Guardamos los IDs reales para poder borrar uno por uno
}

const CATEGORIAS = ["Bebidas", "Comidas", "General"];

export default function GestionMesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null);
  
  // Datos de la Mesa Activa
  const [reservaActiva, setReservaActiva] = useState<ReservaMesa | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [catActiva, setCatActiva] = useState("Bebidas");
  const [nuevaMesaNombre, setNuevaMesaNombre] = useState("");

  // 🟢 ESTADOS DE COBRO
  const [pagando, setPagando] = useState(false);
  const [pagoTransferencia, setPagoTransferencia] = useState(""); // Cuanto paga por MP
  const [pagaConEfectivo, setPagaConEfectivo] = useState("");   // Billete del cliente
  const [procesandoPago, setProcesandoPago] = useState(false);

  // 1. CARGA INICIAL
  useEffect(() => {
    cargarMesas();
    cargarProductos();
  }, []);

  const cargarMesas = async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch("https://localhost:7123/api/Mesas");
      if(res.ok) setMesas(await res.json());
    } catch(e) { console.error(e); }
  };

  const cargarProductos = async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch("https://localhost:7123/api/Productos");
      if(res.ok) setProductos(await res.json());
    } catch(e) { console.error(e); }
  };

  // 2. CREAR MESA
  const crearMesa = async () => {
    if(!nuevaMesaNombre) return;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    await fetch("https://localhost:7123/api/Mesas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaMesaNombre, estaOcupada: false })
    });
    setNuevaMesaNombre("");
    cargarMesas();
  };

  // 3. BORRAR MESA
  const borrarMesa = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    if (!confirm("¿Seguro que quieres eliminar esta mesa?")) return;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const res = await fetch(`https://localhost:7123/api/Mesas/${id}`, { method: "DELETE" });
    if (res.ok) {
        cargarMesas(); 
        if (mesaSeleccionada?.id === id) setMesaSeleccionada(null); 
    }
  };

  // 4. SELECCIONAR MESA
  const clickMesa = async (mesa: Mesa) => {
    setMesaSeleccionada(mesa);
    setPagando(false);
    
    if (mesa.estaOcupada && mesa.reservaActualId) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const res = await fetch(`https://localhost:7123/api/Reservas/${mesa.reservaActualId}`);
        if(res.ok) setReservaActiva(await res.json());
    } else {
        setReservaActiva(null);
    }
  };

  // 5. ABRIR MESA
  const abrirMesa = async () => {
    if (!mesaSeleccionada) return;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const res = await fetch(`https://localhost:7123/api/Mesas/${mesaSeleccionada.id}/abrir`, { method: "POST" });
    if (res.ok) {
        cargarMesas(); 
        const data = await res.json();
        clickMesa({ ...mesaSeleccionada, estaOcupada: true, reservaActualId: data.reservaId });
    }
  };

  // 6. AGREGAR PRODUCTO (OPTIMISTA)
  const agregarProducto = async (prod: Producto) => {
    if (!reservaActiva || !mesaSeleccionada) return;
    
    // UI Update instantáneo
    const tempItem = { id: Date.now(), producto: prod.nombre, precio: prod.precio, cantidad: 1 };
    setReservaActiva({ ...reservaActiva, consumos: [...reservaActiva.consumos, tempItem] });

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    await fetch(`https://localhost:7123/api/Consumos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaId: reservaActiva.id, producto: prod.nombre, precio: prod.precio, cantidad: 1, jugador: "Cliente Mesa" })
    });
    // Recarga silenciosa para obtener el ID real
    const res = await fetch(`https://localhost:7123/api/Reservas/${reservaActiva.id}`);
    if(res.ok) setReservaActiva(await res.json());
  };

  // 7. ELIMINAR PRODUCTO (Borra uno de la lista agrupada)
  const eliminarProducto = async (id: number) => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    // UI Update instantáneo
    if (reservaActiva) {
        setReservaActiva({ ...reservaActiva, consumos: reservaActiva.consumos.filter(c => c.id !== id) });
    }
    await fetch(`https://localhost:7123/api/Consumos/${id}`, { method: "DELETE" });
    
    // Recarga
    if (reservaActiva) {
        const resReserva = await fetch(`https://localhost:7123/api/Reservas/${reservaActiva.id}`);
        if(resReserva.ok) setReservaActiva(await resReserva.json());
    }
  };

  // 🟢 8. LÓGICA DE AGRUPACIÓN (NUEVO) 🟢
  // Transforma la lista plana de DB en lista agrupada visualmente
  const consumosAgrupados: ConsumoAgrupado[] = reservaActiva?.consumos.reduce((acc: ConsumoAgrupado[], curr) => {
      const existente = acc.find(i => i.nombre === curr.producto);
      if (existente) {
          existente.cantidad += 1;
          existente.total += curr.precio;
          existente.ids.push(curr.id); // Guardamos el ID para poder borrarlo luego
      } else {
          acc.push({
              nombre: curr.producto,
              precioUnitario: curr.precio,
              cantidad: 1,
              total: curr.precio,
              ids: [curr.id]
          });
      }
      return acc;
  }, []) || [];

  // Ordenamos para que lo último agregado salga arriba
  // (Opcional, si prefieres orden alfabético quita el .reverse() en el render)

  // 🟢 9. LÓGICA DE COBRO (ESTILO CAJERO) 🟢
  const totalCuenta = reservaActiva?.consumos.reduce((a, b) => a + b.precio, 0) || 0;

  const iniciarCobro = () => {
    setPagando(true);
    setPagoTransferencia("0");
    setPagaConEfectivo(""); 
  };

  const transferencia = Number(pagoTransferencia);
  const efectivoAPagar = Math.max(0, totalCuenta - transferencia);
  const billeteCliente = Number(pagaConEfectivo);
  const vuelto = billeteCliente - efectivoAPagar;

  const confirmarCobroFinal = async () => {
    if (!reservaActiva || !mesaSeleccionada) return;
    
    // Validación básica
    const totalCubierto = transferencia + (billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente);
    if (totalCubierto < totalCuenta - 100) { 
        if(!confirm(`⚠️ Faltan $${(totalCuenta - totalCubierto).toLocaleString()}. ¿Cerrar igual?`)) return;
    }

    setProcesandoPago(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        // Guardamos solo el efectivo real que ingresa (ignorando el vuelto)
        let efectivoRealAGuardar = billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente;

        // PASO 1: Guardamos el cobro en la Reserva (Esto asigna la Caja)
        const res = await fetch(`https://localhost:7123/api/Reservas/cobrar/${reservaActiva.id}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cobradoEfectivo: efectivoRealAGuardar, cobradoTransferencia: transferencia })
        });

        if (res.ok) {
            // PASO 2: Liberamos la Mesa (Y confirmamos los montos para que no se borren)
            await fetch(`https://localhost:7123/api/Mesas/${mesaSeleccionada.id}/cerrar`, {
                 method: "POST", headers: { "Content-Type": "application/json" },
                 // 🟢 AQUÍ ESTABA EL ERROR (ANTES DECÍA 0,0) AHORA MANDA LOS MONTOS REALES
                 body: JSON.stringify({ cobradoEfectivo: efectivoRealAGuardar, cobradoTransferencia: transferencia }) 
            });
            alert("✅ Mesa cobrada y cerrada correctamente");
            setMesaSeleccionada(null);
            cargarMesas();
        } else {
            alert("Error al procesar el cobro");
        }
    } catch (error) { console.error(error); alert("Error de conexión"); } 
    finally { setProcesandoPago(false); }
  };

  const productosFiltrados = productos.filter(p => p.categoria === catActiva);

  return (
    <main className="min-h-screen bg-gray-100 p-6 font-sans flex flex-col md:flex-row gap-6">
      
      {/* IZQUIERDA: MAPA DE MESAS */}
      <div className="md:w-1/3 flex flex-col gap-6">
        <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 bg-white rounded-lg hover:bg-gray-200"><ArrowLeft size={20}/></Link>
            <h1 className="text-2xl font-bold text-gray-800">Salón</h1>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm flex gap-2">
            <input type="text" placeholder="Nombre (ej: Mesa 5)" className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm" value={nuevaMesaNombre} onChange={e => setNuevaMesaNombre(e.target.value)}/>
            <button onClick={crearMesa} className="bg-black text-white p-2 rounded-lg hover:bg-gray-800"><Plus/></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
            {mesas.map(mesa => (
                <button key={mesa.id} onClick={() => clickMesa(mesa)} className={`p-6 rounded-2xl shadow-sm border-2 transition relative text-left group ${mesaSeleccionada?.id === mesa.id ? 'ring-2 ring-blue-500 scale-105' : ''} ${mesa.estaOcupada ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100' : 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'}`}>
                    {!mesa.estaOcupada && <div onClick={(e) => borrarMesa(e, mesa.id)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-full transition z-10 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></div>}
                    <div className="flex justify-between items-start mb-2"><span className="font-bold text-lg">{mesa.nombre}</span>{mesa.estaOcupada ? <Users size={20}/> : <CheckCircle size={20}/>}</div>
                    <p className="text-xs font-bold uppercase tracking-wider">{mesa.estaOcupada ? "Ocupada" : "Libre"}</p>
                </button>
            ))}
        </div>
      </div>

      {/* DERECHA: PANEL DE GESTIÓN */}
      <div className="md:w-2/3 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col min-h-[600px]">
        {!mesaSeleccionada ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><Utensils size={64} className="mb-4 opacity-20"/><p>Selecciona una mesa</p></div>
        ) : !mesaSeleccionada.estaOcupada ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{mesaSeleccionada.nombre}</h2>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold mb-8">Disponible</span>
                <button onClick={abrirMesa} className="bg-black text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-gray-800 shadow-lg flex items-center gap-3"><Utensils/> ABRIR MESA</button>
            </div>
        ) : (
            <div className="flex flex-col h-full">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div><h2 className="text-2xl font-bold text-gray-800">{mesaSeleccionada.nombre}</h2><p className="text-sm text-gray-500">Cuenta Abierta</p></div>
                    <div className="text-right"><p className="text-xs font-bold text-gray-400 uppercase">Total Actual</p><p className="text-3xl font-bold text-gray-900">${totalCuenta.toLocaleString()}</p></div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* PRODUCTOS (Izquierda) */}
                    <div className="w-full md:w-1/2 p-4 border-r overflow-y-auto bg-gray-50/50">
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">{CATEGORIAS.map(c => <button key={c} onClick={() => setCatActiva(c)} className={`px-3 py-1 rounded-full text-xs font-bold border ${catActiva === c ? 'bg-black text-white' : 'bg-white text-gray-600'}`}>{c}</button>)}</div>
                        <div className="grid grid-cols-2 gap-2">{productosFiltrados.map(p => <button key={p.id} onClick={() => agregarProducto(p)} className="bg-white p-3 rounded-xl border hover:border-orange-400 hover:shadow-md transition text-left"><p className="font-bold text-gray-800 text-sm truncate">{p.nombre}</p><p className="text-green-600 font-bold text-xs mt-1">${p.precio}</p></button>)}</div>
                    </div>

                    {/* TICKET (Derecha) */}
                    <div className="w-full md:w-1/2 p-4 flex flex-col bg-white">
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Coffee size={18}/> Consumos</h3>
                        
                        {/* 🟢 LISTA AGRUPADA (NUEVO DISEÑO) */}
                        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
                            {consumosAgrupados.map((item, index) => (
                                <div key={index} className="group flex justify-between items-center text-sm border-b border-gray-100 pb-2 hover:bg-red-50 transition rounded px-2">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-base">
                                            {item.cantidad > 1 && <span className="text-blue-600 mr-1">{item.cantidad}x</span>}
                                            {item.nombre}
                                        </span>
                                        <span className="text-xs text-gray-400">${item.precioUnitario.toLocaleString()} c/u</span>
                                    </div>    
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-gray-900 text-lg">${item.total.toLocaleString()}</span>
                                        <button 
                                            // Borramos usando el ÚLTIMO ID de la lista de ese producto
                                            onClick={() => eliminarProducto(item.ids[item.ids.length - 1])}
                                            className="text-gray-300 hover:text-red-600 hover:bg-white p-1 rounded-full transition"
                                            title="Quitar uno"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {consumosAgrupados.length === 0 && <p className="text-gray-400 text-center text-sm mt-10">Sin pedidos aún.</p>}
                        </div>

                        {/* 🟢 ZONA DE COBRO (DISEÑO CAJERO) */}
                        <div className="mt-auto pt-4 border-t border-gray-100">
                            {!pagando ? (
                                <button onClick={iniciarCobro} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2"><DollarSign/> CERRAR Y COBRAR</button>
                            ) : (
                                <div className="animate-in slide-in-from-bottom-10 fade-in duration-300 h-full space-y-4">
                                    <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><Calculator size={18}/> Cerrar Mesa</h4>
                                        <button onClick={() => setPagando(false)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">Cancelar</button>
                                    </div>
                                    
                                    {/* 1. INPUT TRANSFERENCIA */}
                                    <div className="bg-violet-50 p-3 rounded-xl border border-violet-100">
                                        <div className="flex justify-between mb-1"><span className="text-[10px] font-black text-violet-700 uppercase">Transferencia / MP</span><CreditCard size={14} className="text-violet-600"/></div>
                                        <div className="flex items-center gap-1"><span className="text-violet-800 font-bold">$</span>
                                            <input type="number" className="w-full bg-transparent font-black text-xl text-violet-900 outline-none" placeholder="0" value={pagoTransferencia} onChange={e => setPagoTransferencia(e.target.value)} onFocus={e => e.target.select()}/>
                                        </div>
                                    </div>

                                    {/* 2. DISPLAY EFECTIVO A COBRAR */}
                                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black text-green-700 uppercase">Efectivo a Cobrar</span><Wallet size={14} className="text-green-600"/></div>
                                            <span className="text-2xl font-black text-green-900">${efectivoAPagar.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* 3. INPUT BILLETE + VUELTO */}
                                    <div className="border-2 border-dashed border-gray-200 p-3 rounded-xl bg-white">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Paga Con (Billete):</span>
                                            <input type="number" autoFocus className="w-28 text-right font-bold text-gray-800 bg-gray-50 border rounded p-1 outline-none focus:ring-2 focus:ring-blue-500 text-lg" placeholder="0" value={pagaConEfectivo} onChange={e => setPagaConEfectivo(e.target.value)} onFocus={e => e.target.select()}/>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Vuelto</span>
                                            <span className={`text-xl font-black ${vuelto < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                                {vuelto < 0 ? 'Falta: ' : ''}${Math.abs(vuelto).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <button disabled={procesandoPago} onClick={confirmarCobroFinal} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg disabled:opacity-50 mt-2">
                                        {procesandoPago ? "Procesando..." : "CONFIRMAR CIERRE"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}