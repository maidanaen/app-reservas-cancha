"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    Search, Plus, Package, ShoppingCart, DollarSign, Calculator, Calculator as CalculatorIcon, 
    CreditCard, Wallet, AlertTriangle, CheckCircle, Tag, Printer, X, Pencil, Minus, Trash2
} from "lucide-react";
import { API_URL } from '@/utils/config';

// --- INTERFACES ---
interface Producto {
    id: number;
    nombre: string;
    precio: number;
    categoria: string;
}

interface ItemCarrito extends Producto {
    cantidad: number;
}

export default function CantinaPage() {
    const router = useRouter();

    // --- ESTADOS ---
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cargandoProductos, setCargandoProductos] = useState(true);
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [filtro, setFiltro] = useState("");
    const [categoriaActiva, setCategoriaActiva] = useState("Todas");
    const [cajaAbierta, setCajaAbierta] = useState(false);
    const [totalEfectivo, setTotalEfectivo] = useState(0);
    const [totalTransferencia, setTotalTransferencia] = useState(0);
    const [showModalProducto, setShowModalProducto] = useState(false);
    const [idEdicion, setIdEdicion] = useState<number | null>(null);
    const [formProd, setFormProd] = useState({ nombre: "", precio: "", categoria: "Bebidas" });
    const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
    const [modoCobro, setModoCobro] = useState(false);
    const [pagoTransferencia, setPagoTransferencia] = useState("");
    const [pagaConEfectivo, setPagaConEfectivo] = useState("");
    const [procesando, setProcesando] = useState(false);
    const [notificacion, setNotificacion] = useState<{ tipo: 'error' | 'exito', msj: string } | null>(null);
    const [ticketAImprimir, setTicketAImprimir] = useState<any>(null);
    const [showModalDescuento, setShowModalDescuento] = useState(false);
    const [itemDescuento, setItemDescuento] = useState<ItemCarrito | null>(null);
    const [nuevoPrecio, setNuevoPrecio] = useState("");


    const mostrarMensaje = (tipo: 'error' | 'exito', msj: string) => {
        setNotificacion({ tipo, msj });
        setTimeout(() => setNotificacion(null), 4000);
    };

    const cargarTodo = async () => {
        const userId = localStorage.getItem("usuarioId");
        if (!userId) return;
        try {
            const resProd = await fetch(`${API_URL}/api/Productos?usuarioId=${userId}`);
            if (resProd.ok) setProductos(await resProd.json());
        } catch (error) {
            console.error("Error cargando productos:", error);
        } finally {
            setCargandoProductos(false);
        }

        try {
            const resCaja = await fetch(`${API_URL}/api/Cajas/actual?usuarioId=${userId}`);
            if (resCaja.ok) {
                const data = await resCaja.json();
                setCajaAbierta(true);
                setTotalEfectivo(data.resumen?.detalle?.barra?.efectivo || 0);
                setTotalTransferencia(data.resumen?.detalle?.barra?.transferencia || 0);
            } else {
                setCajaAbierta(false);
            }
        } catch (error) {
            setCajaAbierta(false);
        }
    };

    useEffect(() => { cargarTodo(); }, []);

    const agregarAlCarrito = (producto: Producto) => {
        setCarrito(prev => {
            const existe = prev.find(item => item.id === producto.id);
            if (existe) return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
            return [...prev, { ...producto, cantidad: 1 }];
        });
    };

    const eliminarDelCarrito = (id: number) => {
        setCarrito(prev => prev.filter(item => item.id !== id));
    };

    const restarDelCarrito = (id: number) => {
        setCarrito(prev => {
            const item = prev.find(i => i.id === id);
            if (item && item.cantidad > 1) {
                return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i);
            }
            return prev.filter(i => i.id !== id);
        });
    };

    const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    const abrirModalDescuento = (item: ItemCarrito) => {
        setItemDescuento(item);
        setNuevoPrecio(item.precio.toString());
        setShowModalDescuento(true);
    };

    const guardarDescuento = () => {
        if (!itemDescuento || !nuevoPrecio) return;
        const precioParsed = Number(nuevoPrecio);
        if (isNaN(precioParsed) || precioParsed < 0) return;

        setCarrito(prev => prev.map(i => i.id === itemDescuento.id ? { ...i, precio: precioParsed } : i));
        setShowModalDescuento(false);
        setItemDescuento(null);
    };

    const iniciarCobro = () => {
        setModoCobro(true);
        setPagoTransferencia("0");
        setPagaConEfectivo("");
    };

    const transferencia = Number(pagoTransferencia);
    const efectivoAPagar = Math.max(0, totalCarrito - transferencia);
    const billeteCliente = Number(pagaConEfectivo);
    const vuelto = billeteCliente - efectivoAPagar;

    const confirmarCobro = async () => {
        const userId = localStorage.getItem("usuarioId");
        if (carrito.length === 0 || !userId) return;
        if (!cajaAbierta) {
            mostrarMensaje('error', "La caja está CERRADA.");
            return;
        }
        const totalCubierto = transferencia + (billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente);
        if (totalCubierto < totalCarrito - 1) {
            if (!confirm(`⚠️ Faltan $${(totalCarrito - totalCubierto).toLocaleString()}. ¿Registrar igual?`)) return;
        }
        setProcesando(true);
        let efectivoRealAGuardar = billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente;

        const ventaDto = {
            items: carrito.map(i => ({ producto: i.nombre, precio: i.precio * i.cantidad, cantidad: i.cantidad })),
            metodoPago: "Mixto",
            cobradoEfectivo: efectivoRealAGuardar,
            cobradoTransferencia: transferencia,
            usuarioId: Number(userId)
        };

        try {
            const res = await fetch(`${API_URL}/api/Reservas/venta-express`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ventaDto)
            });
            if (res.ok) {
                setTicketAImprimir({
                    items: [...carrito],
                    total: totalCarrito,
                    cobroEfectivo: efectivoRealAGuardar,
                    cobroTransferencia: transferencia,
                    vuelto: vuelto > 0 ? vuelto : 0,
                    fecha: new Date().toISOString()
                });
                setCarrito([]);
                setModoCobro(false);
                await cargarTodo();
                mostrarMensaje('exito', "✅ Venta registrada correctamente.");
            }
        } catch (error) {
            mostrarMensaje('error', "Error de conexión.");
        } finally { setProcesando(false); }
    };

    const abrirModalNuevo = () => { setIdEdicion(null); setFormProd({ nombre: "", precio: "", categoria: "Bebidas" }); setShowModalProducto(true); };
    const abrirModalEditar = (e: React.MouseEvent, prod: Producto) => { e.stopPropagation(); setIdEdicion(prod.id); setFormProd({ nombre: prod.nombre, precio: prod.precio.toString(), categoria: prod.categoria }); setShowModalProducto(true); };
    const iniciarEliminacion = () => setMostrarModalEliminar(true);

    const confirmarEliminacion = async () => {
        if (!idEdicion) return;
        const userId = localStorage.getItem("usuarioId");
        try {
            await fetch(`${API_URL}/api/Productos/${idEdicion}?usuarioId=${userId}`, { method: "DELETE" });
            cargarTodo();
            setShowModalProducto(false);
            setMostrarModalEliminar(false);
            mostrarMensaje('exito', '🗑️ Producto eliminado.');
        } catch (error) {
            mostrarMensaje('error', 'No se pudo eliminar.');
        }
    };

    const guardarProducto = async () => {
        const userId = localStorage.getItem("usuarioId");
        if (!formProd.nombre || !formProd.precio || !userId) return;
        const productoData = { id: idEdicion || 0, nombre: formProd.nombre, precio: Number(formProd.precio), categoria: formProd.categoria, activo: true, usuarioId: Number(userId) };
        try {
            const url = idEdicion ? `${API_URL}/api/Productos/${idEdicion}` : `${API_URL}/api/Productos`;
            await fetch(url, { method: idEdicion ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(productoData) });
            cargarTodo();
            setShowModalProducto(false);
            mostrarMensaje('exito', '✅ Producto guardado');
        } catch (error) { mostrarMensaje('error', 'Error al guardar.'); }
    };

    const productosFiltrados = productos.filter(p => (categoriaActiva === "Todas" || p.categoria === categoriaActiva) && p.nombre.toLowerCase().includes(filtro.toLowerCase()));
    const categorias = ["Todas", "Bebidas", "Comidas", "Accesorios", "General"];

    return (
        <>
            <div className="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-100px)] gap-4 font-sans relative p-2 md:p-4 bg-gray-50 overflow-hidden print:hidden">

                {/* 🔔 NOTIFICACIÓN */}
                {notificacion && (
                    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${notificacion.tipo === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
                        {notificacion.tipo === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                        <p className="font-bold text-sm">{notificacion.msj}</p>
                    </div>
                )}

                {/* IZQUIERDA: CATÁLOGO (Scroll independiente) */}
                <div className="flex-[1.5] flex flex-col min-h-0 gap-3 overflow-hidden">
                    <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 shrink-0">
                        <div className="flex justify-between items-center mb-3">
                            <h1 className="text-lg md:text-xl font-black flex items-center gap-2"><Package className="text-blue-600" size={20} /> Cantina</h1>
                            {cajaAbierta ? (
                                <div className="flex gap-3 bg-slate-50 px-3 py-1 rounded-xl border border-gray-100">
                                    <div className="text-right leading-tight"><p className="text-[9px] font-bold text-green-600 uppercase">EFECT</p><p className="text-sm font-black">${totalEfectivo.toLocaleString()}</p></div>
                                    <div className="text-right leading-tight"><p className="text-[9px] font-bold text-violet-600 uppercase">TRANS</p><p className="text-sm font-black">${totalTransferencia.toLocaleString()}</p></div>
                                </div>
                            ) : (
                                <div className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-lg border border-orange-200 flex items-center gap-1 uppercase"><AlertTriangle size={12} /> Caja Cerrada</div>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                            </div>
                            <button onClick={abrirModalNuevo} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition"><Plus size={14} /> Nuevo</button>
                        </div>

                        <div className="flex gap-2 overflow-x-auto mt-3 pb-1 no-scrollbar">
                            {categorias.map(cat => (
                                <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap border ${categoriaActiva === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>

                    {/* Grid de Productos - Scrollable */}
                    <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-4 content-start">
                        {cargandoProductos ? <p className="col-span-full text-center text-gray-400 font-bold py-10">Cargando...</p> : productosFiltrados.map(prod => (
                            <div key={prod.id} onClick={() => agregarAlCarrito(prod)} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition text-left flex flex-col justify-between h-28 relative cursor-pointer active:scale-95">
                                <button onClick={(e) => abrirModalEditar(e, prod)} className="absolute top-1 right-1 p-1 bg-gray-50 text-gray-400 rounded-md hover:text-orange-600 z-10"><Pencil size={12} /></button>
                                <div><span className="text-[9px] font-bold text-gray-400 uppercase">{prod.categoria}</span><h3 className="font-bold text-slate-800 text-xs leading-snug mt-1 line-clamp-2">{prod.nombre}</h3></div>
                                <div className="flex justify-between items-end"><span className="text-sm font-black text-slate-900">${prod.precio.toLocaleString()}</span><div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><ShoppingCart size={14} /></div></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DERECHA: TICKET Y COBRO (Fijo en altura) */}
                <div className="w-full lg:w-80 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden shrink-0 h-[45vh] lg:h-full">
                    <div className="p-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center shrink-0">
                        <h2 className="font-black text-slate-900 flex items-center gap-2 text-sm uppercase"><ShoppingCart size={16} /> Ticket</h2>
                        {carrito.length > 0 && <button onClick={() => setCarrito([])} className="text-[10px] font-bold text-red-500">Vaciar</button>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
                        {carrito.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-40"><ShoppingCart size={32} /><p className="text-xs font-bold">Vacío</p></div>
                        ) : (
                            carrito.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <div className="max-w-[60%]"><p className="text-xs font-bold text-slate-800 truncate">{item.nombre}</p><p className="text-[10px] text-gray-500">{item.cantidad} x ${item.precio}</p></div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-black mr-2">${(item.precio * item.cantidad).toLocaleString()}</span>
                                        <button onClick={() => agregarAlCarrito(item)} className="text-gray-400 bg-gray-100 hover:bg-green-100 hover:text-green-600 p-1 rounded transition" title="Agregar Uno"><Plus size={12} /></button>
                                        <button onClick={() => restarDelCarrito(item.id)} className="text-gray-400 bg-gray-100 hover:bg-orange-100 hover:text-orange-500 p-1 rounded transition" title="Restar Uno"><Minus size={12} /></button>
                                        <button onClick={() => abrirModalDescuento(item)} className="text-orange-500 hover:text-orange-700 bg-orange-100 p-1 rounded transition" title="Editar Precio Unitario"><Tag size={12} /></button>
                                        <button onClick={() => eliminarDelCarrito(item.id)} className="text-gray-400 bg-gray-200 hover:bg-red-100 hover:text-red-500 p-1 rounded transition ml-1" title="Eliminar de la lista"><X size={12} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ZONA DE COBRO OPTIMIZADA */}
                    <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                        {!modoCobro ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-end"><span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Total</span><span className="text-2xl font-black text-slate-900">${totalCarrito.toLocaleString()}</span></div>
                                <div className="flex gap-2">
                                    {ticketAImprimir && (
                                        <button onClick={() => window.print()} className="flex-1 bg-blue-100 text-blue-700 py-3 rounded-xl font-bold text-sm hover:bg-blue-200 transition flex items-center justify-center gap-2">
                                            🖨️ Imprimir
                                        </button>
                                    )}
                                    <button disabled={carrito.length === 0} onClick={iniciarCobro} className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-50">
                                        <DollarSign size={16} /> COBRAR
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2"><Calculator size={14} /> Cobro</h3>
                                    <button onClick={() => setModoCobro(false)} className="text-[10px] font-bold text-red-500 uppercase">Volver</button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-violet-50 p-2 rounded-lg border border-violet-100">
                                        <span className="text-[9px] font-black text-violet-700 uppercase block mb-1">Transfer</span>
                                        <div className="flex items-center gap-1 font-black text-violet-900 text-sm">
                                            $<input type="number" className="w-full bg-transparent outline-none" value={pagoTransferencia} onChange={e => setPagoTransferencia(e.target.value)} onFocus={e => e.target.select()} />
                                        </div>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                        <span className="text-[9px] font-black text-green-700 uppercase block mb-1">A cobrar</span>
                                        <div className="font-black text-green-900 text-sm">${efectivoAPagar.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase">Billete:</span>
                                        <input type="number" className="w-20 text-right font-bold text-sm bg-white border rounded px-1 outline-none" value={pagaConEfectivo} onChange={e => setPagaConEfectivo(e.target.value)} onFocus={e => e.target.select()} />
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase">Vuelto</span>
                                        <span className={`text-sm font-black ${vuelto < 0 ? 'text-red-500' : 'text-slate-900'}`}>${Math.abs(vuelto).toLocaleString()}</span>
                                    </div>
                                </div>

                                <button disabled={procesando} onClick={confirmarCobro} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-sm hover:bg-slate-800 transition active:scale-95">
                                    {procesando ? "..." : "CONFIRMAR PAGO"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* MODALES (Mantenidos igual, solo ajustes visuales leves) */}
                {showModalProducto && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-black text-slate-900 text-base">{idEdicion ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                                <button onClick={() => setShowModalProducto(false)} className="text-gray-400"><X size={20} /></button>
                            </div>
                            <div className="space-y-3">
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase">Nombre</label><input type="text" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" value={formProd.nombre} onChange={e => setFormProd({ ...formProd, nombre: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Precio</label><input type="number" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" value={formProd.precio} onChange={e => setFormProd({ ...formProd, precio: e.target.value })} /></div>
                                    <div><label className="text-[10px] font-bold text-gray-500 uppercase">Categoría</label><select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" value={formProd.categoria} onChange={e => setFormProd({ ...formProd, categoria: e.target.value })}>{categorias.filter(c => c !== "Todas").map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                </div>
                            </div>
                            <div className="mt-6 flex gap-2">
                                {idEdicion && <button onClick={iniciarEliminacion} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={18} /></button>}
                                <div className="flex-1"></div>
                                <button onClick={guardarProducto} className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg">Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

                {mostrarModalEliminar && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center">
                            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3"><Trash2 size={24} /></div>
                            <h3 className="text-base font-black text-slate-900 mb-1">¿Borrar?</h3>
                            <p className="text-gray-500 mb-4 text-xs">Esta acción es permanente.</p>
                            <div className="flex gap-2">
                                <button onClick={() => setMostrarModalEliminar(false)} className="flex-1 py-2 text-slate-500 font-bold text-xs hover:bg-gray-100 rounded-lg">No</button>
                                <button onClick={confirmarEliminacion} className="flex-1 py-2 text-white font-bold bg-red-600 rounded-lg text-xs shadow-md">Sí, Borrar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DESCUENTO / EDITAR PRECIO DE ITEM */}
            {showModalDescuento && itemDescuento && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2"><Tag size={18} className="text-orange-500" /> Precio Unitario</h3>
                            <button onClick={() => { setShowModalDescuento(false); setItemDescuento(null); }} className="text-gray-400"><X size={20} /></button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Ajustar precio final para: <strong className="text-slate-800">{itemDescuento.nombre}</strong></p>
                        <div className="mb-6">
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nuevo Precio ($)</label>
                            <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-orange-500" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} onFocus={e => e.target.select()} />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setShowModalDescuento(false); setItemDescuento(null); }} className="flex-1 py-3 text-slate-500 font-bold text-xs bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancelar</button>
                            <button onClick={guardarDescuento} className="flex-1 py-3 text-white font-bold bg-orange-500 hover:bg-orange-600 rounded-xl text-xs shadow-md transition">Aplicar Precio</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TICKET DE IMPRESIÓN (Oculto en pantalla normal, visible en print) */}
            {ticketAImprimir && (
                <div id="ticket-impresion" className="hidden print:block w-[78mm] mx-auto m-0 p-4 font-sans text-black bg-white leading-tight">
                    <div className="text-center mb-4 pb-3 border-b-2 border-dashed border-black">
                        <h1 className="m-0 text-2xl font-black uppercase tracking-widest">{localStorage.getItem("nombreNegocio") || "COMPLEJO"}</h1>
                        <p className="m-0 text-[12px] mt-1">Fecha: {new Date(ticketAImprimir.fecha).toLocaleDateString()} {new Date(ticketAImprimir.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="m-0 text-[12px] mt-1 font-bold">VENTA EXPRESS CANTINA</p>
                    </div>

                    <table className="w-full mb-4 border-b-2 border-dashed border-black pb-3 text-[12px]">
                        <thead>
                            <tr className="border-b border-black text-left">
                                <th className="pb-1 font-bold">DESCRIPCION DE CUENTA</th>
                                <th className="pb-1 text-right font-bold pr-1">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ticketAImprimir.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="py-1 uppercase pr-2">{item.cantidad} x {item.nombre} <span className="text-[10px] italic font-normal text-gray-700">(${item.precio})</span></td>
                                    <td className="py-1 text-right font-bold pr-1">${(item.precio * item.cantidad).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-center mb-1 text-[14px]">
                        <span className="font-bold">TOTAL VENTA:</span>
                        <span className="font-black">${ticketAImprimir.total.toLocaleString()}</span>
                    </div>
                    {ticketAImprimir.cobroEfectivo > 0 && (
                        <div className="flex justify-between items-center text-[12px]">
                            <span>TOTAL EFECTIVO:</span>
                            <span>${ticketAImprimir.cobroEfectivo.toLocaleString()}</span>
                        </div>
                    )}
                    {ticketAImprimir.cobroTransferencia > 0 && (
                        <div className="flex justify-between items-center text-[12px]">
                            <span>TOTAL TRANSF.:</span>
                            <span>${ticketAImprimir.cobroTransferencia.toLocaleString()}</span>
                        </div>
                    )}

                    <div className="text-center mt-6 pt-3 border-t-2 border-dashed border-black">
                        <p className="m-0 text-[12px] font-bold">¡Gracias por tu compra!</p>
                        <p className="m-0 text-[10px] mt-1">No válido como factura</p>
                    </div>
                </div>
            )}
        </>
    );
}