"use client";
import { useEffect, useState } from "react";
import { 
  ArrowLeft, Plus, Users, Utensils, Coffee, 
  Trash2, DollarSign, CheckCircle, Calculator, CreditCard, Wallet, X, AlertCircle, Tag, Printer
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from '@/utils/config';

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

interface ConsumoAgrupado {
    nombre: string;
    precioUnitario: number;
    cantidad: number;
    total: number;
    ids: number[]; 
}

const CATEGORIAS = ["Bebidas", "Comidas", "General"];

export default function GestionMesasPage() {
  const router = useRouter();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null);
  
  // Datos de la Mesa Activa
  const [reservaActiva, setReservaActiva] = useState<ReservaMesa | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [catActiva, setCatActiva] = useState("Bebidas");
  const [nuevaMesaNombre, setNuevaMesaNombre] = useState("");

  // ESTADOS DE COBRO
  const [pagando, setPagando] = useState(false);
  const [pagoTransferencia, setPagoTransferencia] = useState(""); 
  const [pagaConEfectivo, setPagaConEfectivo] = useState("");   
  const [procesandoPago, setProcesandoPago] = useState(false);

  // 🟢 ESTADOS MODALES PERSONALIZADOS
  const [mesaAEliminar, setMesaAEliminar] = useState<number | null>(null);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  
  const [mostrarModalCobroIncompleto, setMostrarModalCobroIncompleto] = useState(false);
  const [datosCobroPendiente, setDatosCobroPendiente] = useState<{faltante: number, efvo: number, trans: number} | null>(null);

  // 🟢 ESTADOS DE DESCUENTOS Y TICKET
  const [mostrarModalDescuento, setMostrarModalDescuento] = useState(false);
  const [itemDescuento, setItemDescuento] = useState<ConsumoAgrupado | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [imprimiendo, setImprimiendo] = useState(false);

  // SISTEMA DE NOTIFICACIONES (TOAST)
  const [notificacion, setNotificacion] = useState<{ tipo: 'error' | 'exito' | 'info', msj: string } | null>(null);

  const mostrarMensaje = (tipo: 'error' | 'exito' | 'info', msj: string) => {
      setNotificacion({ tipo, msj });
      setTimeout(() => setNotificacion(null), 4000);
  };

  // 1. CARGA INICIAL
  useEffect(() => {
    cargarMesas();
    cargarProductos();
  }, []);

  const cargarMesas = async () => {
    const userId = localStorage.getItem("usuarioId");
    if (!userId) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`${API_URL}/api/Mesas?usuarioId=${userId}`);
      if(res.ok) setMesas(await res.json());
    } catch(e) { console.error(e); }
  };

  const cargarProductos = async () => {
    const userId = localStorage.getItem("usuarioId");
    if (!userId) return;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const res = await fetch(`${API_URL}/api/Productos?usuarioId=${userId}`);
      if(res.ok) setProductos(await res.json());
    } catch(e) { console.error(e); }
  };

  // 2. CREAR MESA
  const crearMesa = async () => {
    if(!nuevaMesaNombre) return;
    const userId = localStorage.getItem("usuarioId");
    if (!userId) {
        mostrarMensaje('error', 'Error de sesión. Recarga la página.');
        return;
    }

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    await fetch(`${API_URL}/api/Mesas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            nombre: nuevaMesaNombre, 
            estaOcupada: false,
            usuarioId: Number(userId) 
        })
    });
    setNuevaMesaNombre("");
    cargarMesas();
  };

  // 3. BORRAR MESA
  const iniciarEliminarMesa = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      setMesaAEliminar(id);
      setMostrarModalEliminar(true);
  };

  const confirmarEliminarMesa = async () => {
      if(!mesaAEliminar) return;
      const userId = localStorage.getItem("usuarioId");

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
          const res = await fetch(`${API_URL}/api/Mesas/${mesaAEliminar}?usuarioId=${userId}`, { method: "DELETE" });
          if (res.ok) {
              cargarMesas(); 
              if (mesaSeleccionada?.id === mesaAEliminar) setMesaSeleccionada(null); 
              mostrarMensaje('exito', 'Mesa eliminada correctamente.');
          }
      } catch (error) {
          mostrarMensaje('error', 'No se pudo eliminar la mesa.');
      } finally {
          setMostrarModalEliminar(false);
          setMesaAEliminar(null);
      }
  };

  // 4. SELECCIONAR MESA
  const clickMesa = async (mesa: Mesa) => {
    setMesaSeleccionada(mesa);
    setPagando(false);
    
    if (mesa.estaOcupada && mesa.reservaActualId) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const res = await fetch(`${API_URL}/api/Reservas/${mesa.reservaActualId}`);
        if(res.ok) setReservaActiva(await res.json());
    } else {
        setReservaActiva(null);
    }
  };

  // 5. ABRIR MESA 
  const abrirMesa = async () => {
    if (!mesaSeleccionada) return;
    const userId = localStorage.getItem("usuarioId");

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const res = await fetch(`${API_URL}/api/Mesas/${mesaSeleccionada.id}/abrir?usuarioId=${userId}`, { method: "POST" });
    
    if (res.ok) {
        cargarMesas(); 
        const data = await res.json();
        clickMesa({ ...mesaSeleccionada, estaOcupada: true, reservaActualId: data.reservaId });
        mostrarMensaje('exito', "✅ Mesa abierta correctamente");
    } else {
        const errorData = await res.text();
        mostrarMensaje('error', errorData); 
    }
  };

  // 6. AGREGAR PRODUCTO (OPTIMISTA)
  const agregarProducto = async (prod: Producto) => {
    if (!reservaActiva || !mesaSeleccionada) return;
    
    const tempItem = { id: Date.now(), producto: prod.nombre, precio: prod.precio, cantidad: 1 };
    setReservaActiva({ ...reservaActiva, consumos: [...reservaActiva.consumos, tempItem] });

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    await fetch(`${API_URL}/api/Consumos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaId: reservaActiva.id, producto: prod.nombre, precio: prod.precio, cantidad: 1, jugador: "Cliente Mesa" })
    });
    
    const res = await fetch(`${API_URL}/api/Reservas/${reservaActiva.id}`);
    if(res.ok) setReservaActiva(await res.json());
  };

  // 7. ELIMINAR PRODUCTO
  const eliminarProducto = async (id: number) => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    if (reservaActiva) {
        setReservaActiva({ ...reservaActiva, consumos: reservaActiva.consumos.filter(c => c.id !== id) });
    }
    await fetch(`${API_URL}/api/Consumos/${id}`, { method: "DELETE" });
    
    if (reservaActiva) {
        const resReserva = await fetch(`${API_URL}/api/Reservas/${reservaActiva.id}`);
        if(resReserva.ok) setReservaActiva(await resReserva.json());
    }
  };

  // 8. LÓGICA DE AGRUPACIÓN
  const consumosAgrupados: ConsumoAgrupado[] = reservaActiva?.consumos.reduce((acc: ConsumoAgrupado[], curr) => {
      const existente = acc.find(i => i.nombre === curr.producto);
      if (existente) {
          existente.cantidad += 1;
          existente.total += curr.precio;
          existente.ids.push(curr.id); 
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

  // 8.5 MODIFICAR PRECIO DE PRODUCTO (NUEVO)
  const abrirModalDescuento = (item: ConsumoAgrupado) => {
      setItemDescuento(item);
      setNuevoPrecio(item.precioUnitario.toString());
      setMostrarModalDescuento(true);
  };

  const confirmarCambioPrecio = async () => {
      if (!itemDescuento || !nuevoPrecio) return;
      const precioParsed = Number(nuevoPrecio);
      if (isNaN(precioParsed) || precioParsed < 0) {
          mostrarMensaje('error', 'Ingrese un precio válido.');
          return;
      }

      // Tomamos el último ID del grupo de consumos iguales
      const consumoId = itemDescuento.ids[itemDescuento.ids.length - 1];

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
          const res = await fetch(`${API_URL}/api/Consumos/precio/${consumoId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(precioParsed)
          });

          if (res.ok) {
              mostrarMensaje('exito', 'Precio modificado correctamente.');
              setMostrarModalDescuento(false);
              setItemDescuento(null);
              // Recargamos la reserva para ver el nuevo total
              if (reservaActiva) {
                  const resReserva = await fetch(`${API_URL}/api/Reservas/${reservaActiva.id}`);
                  if(resReserva.ok) setReservaActiva(await resReserva.json());
              }
          } else {
              const err = await res.text();
              mostrarMensaje('error', err || 'Error al modificar precio.');
          }
      } catch (error) {
          mostrarMensaje('error', 'Error de conexión.');
      }
  };

  const imprimirCuenta = () => {
      setImprimiendo(true);
      setTimeout(() => {
          window.print();
          setImprimiendo(false);
      }, 100); // Pequeño delay para asegurar que React renderice el div de impresión
  };

  // 9. LÓGICA DE COBRO
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

  const validarYConfirmarCobro = () => {
    if (!reservaActiva || !mesaSeleccionada) return;
    const userId = localStorage.getItem("usuarioId");
    
    if (!userId) {
        mostrarMensaje('error', 'Error de sesión. Recarga la página.');
        return;
    }

    const totalCubierto = transferencia + (billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente);
    
    if (totalCubierto < totalCuenta - 100) { 
        setDatosCobroPendiente({
            faltante: totalCuenta - totalCubierto,
            efvo: billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente,
            trans: transferencia
        });
        setMostrarModalCobroIncompleto(true);
        return;
    }

    ejecutarCobroReal(billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente, transferencia);
  };

  const ejecutarCobroReal = async (efectivoReal: number, transfReal: number) => {
    setProcesandoPago(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const userId = localStorage.getItem("usuarioId");

    try {
        const res = await fetch(`${API_URL}/api/Reservas/cobrar/${reservaActiva?.id}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cobradoEfectivo: efectivoReal, cobradoTransferencia: transfReal })
        });

        if (res.ok) {
            const resMesa = await fetch(`${API_URL}/api/Mesas/${mesaSeleccionada?.id}/cerrar?usuarioId=${userId}`, {
                 method: "POST", headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ cobradoEfectivo: efectivoReal, cobradoTransferencia: transfReal }) 
            });

            if (resMesa.ok) {
                mostrarMensaje('exito', "✅ Mesa cobrada y cerrada correctamente");
                setMesaSeleccionada(null);
                cargarMesas();
            } else {
                mostrarMensaje('error', "Error al cerrar la mesa.");
            }
        } else {
            mostrarMensaje('error', "Error al procesar el cobro.");
        }
    } catch (error) { 
        console.error(error); 
        mostrarMensaje('error', "Error de conexión"); 
    } 
    finally { 
        setProcesandoPago(false); 
        setMostrarModalCobroIncompleto(false);
    }
  };

  const productosFiltrados = productos.filter(p => p.categoria === catActiva);

  return (
    <>
    <main className="min-h-screen bg-gray-100 p-6 font-sans flex flex-col md:flex-row gap-6 relative ml-4 print:hidden">
      
      {/* 🔔 NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
          <div className={`fixed top-6 right-6 z-[70] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 border ${
              notificacion.tipo === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'
          }`}>
              {notificacion.tipo === 'error' ? <AlertCircle size={24} className="text-red-600"/> : <CheckCircle size={24} className="text-green-600"/>}
              <div>
                  <h4 className="font-black text-sm uppercase">{notificacion.tipo === 'error' ? 'Alerta' : 'Éxito'}</h4>
                  <p className="font-medium text-sm">{notificacion.msj}</p>
              </div>
              <button onClick={() => setNotificacion(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={18}/></button>
          </div>
      )}

      {/* IZQUIERDA: MAPA DE MESAS */}
      <div className="md:w-1/3 flex flex-col gap-6">
        <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 bg-white rounded-lg hover:bg-gray-200"><ArrowLeft size={20}/></Link>
            <h1 className="text-2xl font-bold text-gray-800">Salón</h1>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm flex gap-2">
            <input type="text" placeholder="Nombre (ej: Mesa 5)" className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm outline-none focus:border-slate-900" value={nuevaMesaNombre} onChange={e => setNuevaMesaNombre(e.target.value)}/>
            <button onClick={crearMesa} className="bg-black text-white p-2 rounded-lg hover:bg-gray-800 transition"><Plus/></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
            {mesas.map(mesa => (
                <button key={mesa.id} onClick={() => clickMesa(mesa)} className={`p-6 rounded-2xl shadow-sm border-2 transition relative text-left group ${mesaSeleccionada?.id === mesa.id ? 'ring-2 ring-blue-500 scale-105' : ''} ${mesa.estaOcupada ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100' : 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'}`}>
                    {!mesa.estaOcupada && <div onClick={(e) => iniciarEliminarMesa(e, mesa.id)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-full transition z-10 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></div>}
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
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-in zoom-in-95">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{mesaSeleccionada.nombre}</h2>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold mb-8">Disponible</span>
                <button onClick={abrirMesa} className="bg-black text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-gray-800 transition shadow-lg flex items-center gap-3 active:scale-95"><Utensils/> ABRIR MESA</button>
            </div>
        ) : (
            <div className="flex flex-col h-full animate-in fade-in">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div><h2 className="text-2xl font-bold text-gray-800">{mesaSeleccionada.nombre}</h2><p className="text-sm text-gray-500">Cuenta Abierta</p></div>
                    <div className="text-right"><p className="text-xs font-bold text-gray-400 uppercase">Total Actual</p><p className="text-3xl font-bold text-gray-900">${totalCuenta.toLocaleString()}</p></div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* PRODUCTOS (Izquierda) */}
                    <div className="w-full md:w-1/2 p-4 border-r overflow-y-auto bg-gray-50/50">
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">{CATEGORIAS.map(c => <button key={c} onClick={() => setCatActiva(c)} className={`px-3 py-1 rounded-full text-xs font-bold border transition ${catActiva === c ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{c}</button>)}</div>
                        <div className="grid grid-cols-2 gap-2">{productosFiltrados.map(p => <button key={p.id} onClick={() => agregarProducto(p)} className="bg-white p-3 rounded-xl border hover:border-orange-400 hover:shadow-md transition text-left active:scale-95"><p className="font-bold text-gray-800 text-sm truncate">{p.nombre}</p><p className="text-green-600 font-bold text-xs mt-1">${p.precio}</p></button>)}</div>
                    </div>

                    {/* TICKET (Derecha) */}
                    <div className="w-full md:w-1/2 p-4 flex flex-col bg-white">
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Coffee size={18}/> Consumos</h3>
                        
                        {/* LISTA AGRUPADA */}
                        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2 custom-scrollbar">
                            {consumosAgrupados.map((item, index) => (
                                <div key={index} className="group flex justify-between items-center text-sm border-b border-gray-100 pb-2 hover:bg-red-50 transition rounded px-2">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-800 text-base">
                                            {item.cantidad > 1 && <span className="text-blue-600 mr-1">{item.cantidad}x</span>}
                                            {item.nombre}
                                        </span>
                                        <span className="text-xs text-gray-400">${item.precioUnitario.toLocaleString()} c/u</span>
                                    </div>    
                                    <div className="flex items-center gap-1">
                                        <span className="font-black text-gray-900 text-lg mr-2">${item.total.toLocaleString()}</span>
                                        <button 
                                            onClick={() => abrirModalDescuento(item)}
                                            className="text-orange-400 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-full transition"
                                            title="Cambiar Precio Unitario"
                                        >
                                            <Tag size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => eliminarProducto(item.ids[item.ids.length - 1])}
                                            className="text-gray-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                                            title="Quitar uno"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {consumosAgrupados.length === 0 && <p className="text-gray-400 text-center text-sm mt-10">Sin pedidos aún.</p>}
                        </div>

                        {/* ZONA DE COBRO */}
                        <div className="mt-auto pt-4 border-t border-gray-100">
                            {!pagando ? (
                                <div className="space-y-2">
                                    <button onClick={imprimirCuenta} disabled={!reservaActiva || reservaActiva.consumos.length === 0} className="w-full bg-blue-50 text-blue-700 py-3 rounded-2xl font-bold text-sm hover:bg-blue-100 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 border border-blue-200"><Printer size={16}/> Imprimir Pre-Cuenta</button>
                                    <button onClick={iniciarCobro} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2 active:scale-95"><DollarSign/> CERRAR Y COBRAR</button>
                                </div>
                            ) : (
                                <div className="animate-in slide-in-from-bottom-10 fade-in duration-300 h-full space-y-4">
                                    <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><Calculator size={18}/> Cerrar Mesa</h4>
                                        <button onClick={() => setPagando(false)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded transition">Cancelar</button>
                                    </div>
                                    
                                    <div className="bg-violet-50 p-3 rounded-xl border border-violet-100">
                                        <div className="flex justify-between mb-1"><span className="text-[10px] font-black text-violet-700 uppercase">Transferencia / MP</span><CreditCard size={14} className="text-violet-600"/></div>
                                        <div className="flex items-center gap-1"><span className="text-violet-800 font-bold">$</span>
                                            <input type="number" className="w-full bg-transparent font-black text-xl text-violet-900 outline-none" placeholder="0" value={pagoTransferencia} onChange={e => setPagoTransferencia(e.target.value)} onFocus={e => e.target.select()}/>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black text-green-700 uppercase">Efectivo a Cobrar</span><Wallet size={14} className="text-green-600"/></div>
                                            <span className="text-2xl font-black text-green-900">${efectivoAPagar.toLocaleString()}</span>
                                        </div>
                                    </div>

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

                                    <button disabled={procesandoPago} onClick={validarYConfirmarCobro} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg disabled:opacity-50 mt-2 active:scale-95">
                                        {procesandoPago ? "Procesando..." : "CONFIRMAR CIERRE"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 🟢 MODAL ELIMINAR MESA */}
        {mostrarModalEliminar && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-red-500">
                    <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={32}/>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">¿Borrar Mesa?</h3>
                    <p className="text-gray-500 mb-6 text-sm">La mesa desaparecerá del salón permanentemente.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setMostrarModalEliminar(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                        <button onClick={confirmarEliminarMesa} className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl shadow-lg transition">Sí, Borrar</button>
                    </div>
                </div>
            </div>
        )}

        {/* 🟢 MODAL COBRO INCOMPLETO */}
        {mostrarModalCobroIncompleto && datosCobroPendiente && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-blue-500">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32}/>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Pago Incompleto</h3>
                    <p className="text-gray-500 mb-2 text-sm">El monto ingresado no cubre el total de la cuenta.</p>
                    <p className="text-red-500 font-bold text-lg mb-6">Faltan: ${datosCobroPendiente.faltante.toLocaleString()}</p>
                    <div className="flex gap-3">
                        <button onClick={() => setMostrarModalCobroIncompleto(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-gray-100 rounded-xl transition">Revisar</button>
                        <button onClick={() => ejecutarCobroReal(datosCobroPendiente.efvo, datosCobroPendiente.trans)} className="flex-1 py-3 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg transition">Cerrar igual</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* 🟢 MODAL CAMBIAR PRECIO / DESCUENTO */}
        {mostrarModalDescuento && itemDescuento && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full border-t-8 border-orange-500 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Tag size={20} className="text-orange-500"/> Modificar Precio</h3>
                        <button onClick={() => {setMostrarModalDescuento(false); setItemDescuento(null);}} className="text-gray-400 hover:bg-gray-100 rounded-full p-1"><X size={20}/></button>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Precio de: <strong className="text-slate-800 block text-lg font-black mt-1 leading-tight">{itemDescuento.nombre}</strong></p>
                    <div className="mb-6 bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                        <label className="text-[10px] font-black text-orange-700 uppercase block mb-1">Nuevo Precio Unitario ($)</label>
                        <input type="number" className="w-full bg-white border border-orange-200 p-3 rounded-xl text-xl font-black text-orange-900 outline-none focus:ring-2 focus:ring-orange-500" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} onFocus={e => e.target.select()}/>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => {setMostrarModalDescuento(false); setItemDescuento(null);}} className="flex-1 py-3 text-slate-500 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancelar</button>
                        <button onClick={confirmarCambioPrecio} className="flex-1 py-3 text-white font-bold bg-orange-500 hover:bg-orange-600 rounded-xl text-sm shadow-md transition">Guardar Precio</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </main>

    {/* 🟢 TICKET DE IMPRESIÓN PRE-CUENTA (Solo visible al imprimir) */}
    {reservaActiva && imprimiendo && (
        <div id="ticket-impresion" className="hidden print:block w-[78mm] mx-auto m-0 p-4 font-sans text-black bg-white leading-tight">
            <div className="text-center mb-4 pb-3 border-b-2 border-dashed border-black">
                <h1 className="m-0 text-2xl font-black uppercase tracking-widest">{localStorage.getItem("nombreNegocio") || "COMPLEJO"}</h1>
                <p className="m-0 text-[12px] mt-1 font-bold">CUENTA - {mesaSeleccionada?.nombre.toUpperCase()}</p>
                <p className="m-0 text-[12px] mt-1">Fecha: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <table className="w-full mb-4 border-b-2 border-dashed border-black pb-3 text-[12px]">
                <thead>
                    <tr className="border-b border-black text-left">
                        <th className="pb-1 font-bold">CANT DESCRIPCION</th>
                        <th className="pb-1 text-right font-bold pr-1">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {consumosAgrupados.map((item: ConsumoAgrupado, idx: number) => (
                        <tr key={idx}>
                            <td className="py-1 uppercase pr-2 leading-tight">
                                {item.cantidad} x {item.nombre} <br/>
                                <span className="text-[10px] italic font-normal text-gray-700">(${item.precioUnitario.toLocaleString()} c/u)</span>
                            </td>
                            <td className="py-1 text-right font-bold pr-1 align-top">${item.total.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-between items-center mb-1 text-[16px] border-b-2 border-dashed border-black pb-3">
                <span className="font-bold">TOTAL A PAGAR:</span>
                <span className="font-black">${totalCuenta.toLocaleString()}</span>
            </div>

            <div className="text-center mt-6">
                <p className="m-0 text-[10px] font-bold">El pago no incluye propina sugerida (10%)</p>
                <p className="m-0 text-[12px] mt-2 font-bold uppercase">¡Esperamos que lo hayan disfrutado!</p>
                <p className="m-0 text-[10px] mt-1">Documento no válido como factura</p>
            </div>
        </div>
    )}
    </>
  );
}