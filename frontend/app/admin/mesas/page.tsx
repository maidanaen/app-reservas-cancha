"use client";
import { useEffect, useState } from "react";
import { 
  ArrowLeft, Plus, Users, Utensils, Coffee, 
  Trash2, DollarSign, CheckCircle, Calculator, CreditCard, Wallet, X, AlertCircle 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from '@/utils/config';
import Swal from 'sweetalert2'; // 🟢 Importamos SweetAlert

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

  // SISTEMA DE NOTIFICACIONES (TOAST)
  const [notificacion, setNotificacion] = useState<{ tipo: 'error' | 'exito', msj: string } | null>(null);

  const mostrarMensaje = (tipo: 'error' | 'exito', msj: string) => {
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
        Swal.fire('Error', 'Error de sesión. Recarga la página.', 'error');
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

  // 3. BORRAR MESA (🟢 SWEETALERT AÑADIDO)
  const borrarMesa = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    
    const result = await Swal.fire({
        title: '¿Eliminar mesa?',
        text: "La mesa desaparecerá del salón.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    const userId = localStorage.getItem("usuarioId");

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
        const res = await fetch(`${API_URL}/api/Mesas/${id}?usuarioId=${userId}`, { method: "DELETE" });
        if (res.ok) {
            cargarMesas(); 
            if (mesaSeleccionada?.id === id) setMesaSeleccionada(null); 
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Mesa eliminada', showConfirmButton: false, timer: 2000 });
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar la mesa.', 'error');
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

  // 5. ABRIR MESA (CON NOTIFICACIÓN BONITA)
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

  const confirmarCobroFinal = async () => {
    if (!reservaActiva || !mesaSeleccionada) return;
    const userId = localStorage.getItem("usuarioId");
    
    if (!userId) {
        Swal.fire('Error', 'Error de sesión. Recarga la página.', 'error');
        return;
    }

    const totalCubierto = transferencia + (billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente);
    
    // 🟢 SWEETALERT PARA PAGO INCOMPLETO
    if (totalCubierto < totalCuenta - 100) { 
        const result = await Swal.fire({
            title: 'Pago Incompleto',
            text: `Faltan $${(totalCuenta - totalCubierto).toLocaleString()}. ¿Quieres cerrar la mesa igual?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cerrar mesa',
            cancelButtonText: 'Revisar montos'
        });
        if (!result.isConfirmed) return;
    }

    setProcesandoPago(true);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        let efectivoRealAGuardar = 0;
        if (billeteCliente >= efectivoAPagar) {
            efectivoRealAGuardar = efectivoAPagar;
        } else {
            efectivoRealAGuardar = billeteCliente;
        }

        const res = await fetch(`${API_URL}/api/Reservas/cobrar/${reservaActiva.id}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cobradoEfectivo: efectivoRealAGuardar, cobradoTransferencia: transferencia })
        });

        if (res.ok) {
            const resMesa = await fetch(`${API_URL}/api/Mesas/${mesaSeleccionada.id}/cerrar?usuarioId=${userId}`, {
                 method: "POST", headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ cobradoEfectivo: efectivoRealAGuardar, cobradoTransferencia: transferencia }) 
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
    finally { setProcesandoPago(false); }
  };

  const productosFiltrados = productos.filter(p => p.categoria === catActiva);

  return (
    <main className="min-h-screen bg-gray-100 p-6 font-sans flex flex-col md:flex-row gap-6 relative ml-4">
      
      {/* 🔔 NOTIFICACIÓN FLOTANTE (TOAST) */}
      {notificacion && (
          <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 border ${
              notificacion.tipo === 'error' 
                ? 'bg-red-50 text-red-800 border-red-200' 
                : 'bg-green-50 text-green-800 border-green-200'
          }`}>
              {notificacion.tipo === 'error' ? <AlertCircle size={24} className="text-red-600"/> : <CheckCircle size={24} className="text-green-600"/>}
              <div>
                  <h4 className="font-black text-sm uppercase">{notificacion.tipo === 'error' ? 'Acción Bloqueada' : 'Éxito'}</h4>
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
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-gray-900 text-lg">${item.total.toLocaleString()}</span>
                                        <button 
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

                        {/* ZONA DE COBRO */}
                        <div className="mt-auto pt-4 border-t border-gray-100">
                            {!pagando ? (
                                <button onClick={iniciarCobro} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2 active:scale-95"><DollarSign/> CERRAR Y COBRAR</button>
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

                                    <button disabled={procesandoPago} onClick={confirmarCobroFinal} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg disabled:opacity-50 mt-2 active:scale-95">
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