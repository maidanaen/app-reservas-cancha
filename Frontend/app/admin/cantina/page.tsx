"use client";
import { useState, useEffect } from "react";
import { 
    Search, ShoppingCart, Trash2, CreditCard, Banknote, History, 
    Package, X, Plus, Tag, Pencil, DollarSign, Calculator, Wallet 
} from "lucide-react";

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

interface VentaHistorial {
    id: number;
    hora: string;
    detalle: string;
    monto: number;
    metodo: string;
    items?: { producto: string; precio: number }[];
}

export default function CantinaPage() {
    // --- ESTADOS ---
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cargandoProductos, setCargandoProductos] = useState(true);

    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [filtro, setFiltro] = useState("");
    const [categoriaActiva, setCategoriaActiva] = useState("Todas");
    
    // Estados de Caja
    const [totalEfectivo, setTotalEfectivo] = useState(0);
    const [totalTransferencia, setTotalTransferencia] = useState(0);
    const [historialVentas, setHistorialVentas] = useState<VentaHistorial[]>([]);
    
    // Estados Modal Producto
    const [showModalProducto, setShowModalProducto] = useState(false);
    const [idEdicion, setIdEdicion] = useState<number | null>(null);
    const [formProd, setFormProd] = useState({ nombre: "", precio: "", categoria: "Bebidas" });
    
    // 🟢 ESTADOS DE COBRO (ESTILO CAJERO)
    const [modoCobro, setModoCobro] = useState(false);
    const [pagoTransferencia, setPagoTransferencia] = useState(""); // Input de Transferencia
    const [pagaConEfectivo, setPagaConEfectivo] = useState("");   // Billete del cliente
    const [procesando, setProcesando] = useState(false);

    // --- CARGA INICIAL ---
    const cargarTodo = async () => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const resProd = await fetch("https://localhost:7123/api/Productos");
            if (resProd.ok) setProductos(await resProd.json());
            setCargandoProductos(false);

            const resCaja = await fetch("https://localhost:7123/api/Cajas/actual");
            if (resCaja.ok) {
                const data = await resCaja.json();
                setTotalEfectivo(data.resumen.detalle.barra.efectivo);
                setTotalTransferencia(data.resumen.detalle.barra.transferencia);
                const ventasCantina = data.movimientos
                    .filter((m: any) => m.concepto === "Cantina Express" || m.concepto === "Mostrador")
                    .slice(0, 5);
                setHistorialVentas(ventasCantina);
            }
        } catch (error) { console.error("Error cargando datos:", error); }
    };

    useEffect(() => { cargarTodo(); }, []);

    // --- FUNCIONES CARRITO ---
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

    // 🟢 LÓGICA DE AGRUPACIÓN VISUAL (Igual que en Mesas)
    // Aunque el carrito ya agrupa por lógica de estado, esto asegura el orden correcto.
    const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    // --- 🟢 LÓGICA DE COBRO (CON VUELTO) ---
    
    const iniciarCobro = () => {
        setModoCobro(true);
        setPagoTransferencia("0");
        setPagaConEfectivo("");
    };

    // Cálculos Reactivos
    const transferencia = Number(pagoTransferencia);
    const efectivoAPagar = Math.max(0, totalCarrito - transferencia);
    const billeteCliente = Number(pagaConEfectivo);
    const vuelto = billeteCliente - efectivoAPagar;

    const confirmarCobro = async () => {
        if (carrito.length === 0) return;
        
        // Validación
        const totalCubierto = transferencia + (billeteCliente >= efectivoAPagar ? efectivoAPagar : billeteCliente);
        if (totalCubierto < totalCarrito - 100) {
             if(!confirm(`⚠️ Faltan $${(totalCarrito - totalCubierto).toLocaleString()}. ¿Cobrar igual?`)) return;
        }

        setProcesando(true);

        // 🧠 LÓGICA DE PROTECCIÓN: Guardar solo lo que corresponde
        let efectivoRealAGuardar = 0;
        if (billeteCliente >= efectivoAPagar) {
            efectivoRealAGuardar = efectivoAPagar; // Pagó justo o con cambio
        } else {
            efectivoRealAGuardar = billeteCliente; // Pagó de menos
        }

        const ventaDto = {
            items: carrito.map(i => ({ producto: i.nombre, precio: i.precio * i.cantidad, cantidad: i.cantidad })),
            metodoPago: "Mixto", 
            cobradoEfectivo: efectivoRealAGuardar,
            cobradoTransferencia: transferencia
        };

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const res = await fetch("https://localhost:7123/api/Reservas/venta-express", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ventaDto)
            });
            if (res.ok) {
                setCarrito([]);
                setModoCobro(false);
                await cargarTodo();
            } else { alert("Error al procesar venta."); }
        } catch (error) { console.error(error); } 
        finally { setProcesando(false); }
    };

    // --- GESTIÓN PRODUCTOS ---
    const abrirModalNuevo = () => { setIdEdicion(null); setFormProd({ nombre: "", precio: "", categoria: "Bebidas" }); setShowModalProducto(true); };
    const abrirModalEditar = (e: React.MouseEvent, prod: Producto) => { e.stopPropagation(); setIdEdicion(prod.id); setFormProd({ nombre: prod.nombre, precio: prod.precio.toString(), categoria: prod.categoria }); setShowModalProducto(true); };
    
    const eliminarProducto = async () => {
        if (!idEdicion) return;
        if (confirm("⚠️ ¿Eliminar de Base de Datos?")) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            try {
                await fetch(`https://localhost:7123/api/Productos/${idEdicion}`, { method: "DELETE" });
                cargarTodo(); setShowModalProducto(false);
            } catch (error) { alert("Error al eliminar"); }
        }
    };

    const guardarProducto = async () => {
        if (!formProd.nombre || !formProd.precio) return alert("Completa los datos");
        const productoData = { id: idEdicion || 0, nombre: formProd.nombre, precio: Number(formProd.precio), categoria: formProd.categoria, activo: true };
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        try {
            const url = idEdicion ? `https://localhost:7123/api/Productos/${idEdicion}` : "https://localhost:7123/api/Productos";
            const method = idEdicion ? "PUT" : "POST";
            await fetch(url, { method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(productoData) });
            cargarTodo(); setShowModalProducto(false);
        } catch (error) { alert("Error al guardar"); }
    };

    const productosFiltrados = productos.filter(p => (categoriaActiva === "Todas" || p.categoria === categoriaActiva) && p.nombre.toLowerCase().includes(filtro.toLowerCase()));
    const categorias = ["Todas", "Bebidas", "Comidas", "Accesorios", "General"];

    return (
        <div className="flex h-[calc(100vh-theme(spacing.24))] gap-6 font-sans relative">
            
            {/* IZQUIERDA: CATÁLOGO */}
            <div className="flex-1 flex flex-col gap-6">
                {/* Header */}
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Package className="text-blue-600"/> Cantina Express</h1>
                    <div className="flex items-center gap-6">
                        <div className="flex gap-4">
                            <div className="flex flex-col text-right"><span className="text-[10px] font-bold text-green-600 uppercase">Efectivo</span><span className="text-xl font-black text-slate-900">${totalEfectivo.toLocaleString()}</span></div>
                            <div className="w-px bg-gray-200"></div>
                            <div className="flex flex-col text-right"><span className="text-[10px] font-bold text-violet-600 uppercase">Transfer</span><span className="text-xl font-black text-slate-900">${totalTransferencia.toLocaleString()}</span></div>
                        </div>
                        <button onClick={abrirModalNuevo} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-lg shadow-slate-200"><Plus size={16}/> <span className="hidden md:inline">Nuevo Producto</span></button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex justify-between items-center gap-4">
                     <div className="flex gap-2 overflow-x-auto pb-1">
                        {categorias.map(cat => (
                            <button key={cat} onClick={() => setCategoriaActiva(cat)} className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${categoriaActiva === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`}>{cat}</button>
                        ))}
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={filtro} onChange={(e) => setFiltro(e.target.value)}/>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-20 content-start">
                    {cargandoProductos ? <p className="col-span-full text-center text-gray-400">Cargando...</p> : productosFiltrados.map(prod => (
                        <div key={prod.id} onClick={() => agregarAlCarrito(prod)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition text-left flex flex-col justify-between group h-32 animate-in zoom-in-95 duration-200 relative cursor-pointer">
                            <button onClick={(e) => abrirModalEditar(e, prod)} className="absolute top-2 right-2 p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-orange-100 hover:text-orange-600 transition opacity-0 group-hover:opacity-100 z-10"><Pencil size={14}/></button>
                            <div><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{prod.categoria}</span><h3 className="font-bold text-slate-800 leading-tight mt-1 group-hover:text-blue-600 transition line-clamp-2 pr-6">{prod.nombre}</h3></div>
                            <div className="flex justify-between items-end mt-2"><span className="text-lg font-black text-slate-900">${prod.precio.toLocaleString()}</span><div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition"><ShoppingCart size={16}/></div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DERECHA: TICKET Y COBRO */}
            <div className="w-96 bg-white rounded-3xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-black text-slate-900 flex items-center gap-2"><ShoppingCart size={20}/> Ticket Actual</h2>
                    {carrito.length > 0 && <button onClick={() => setCarrito([])} className="text-xs font-bold text-red-500 hover:text-red-700">Vaciar</button>}
                </div>
                
                {/* LISTA CARRITO */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {carrito.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-2"><ShoppingCart size={48} className="opacity-20"/><p className="text-sm font-bold">Carrito vacío</p></div>
                    ) : (
                        carrito.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 animate-in slide-in-from-right-2">
                                <div><p className="text-sm font-bold text-slate-800">{item.nombre}</p><p className="text-xs text-gray-500">{item.cantidad} x ${item.precio.toLocaleString()}</p></div>
                                <div className="flex items-center gap-3"><span className="font-black text-slate-900">${(item.precio * item.cantidad).toLocaleString()}</span><button onClick={() => eliminarDelCarrito(item.id)} className="text-gray-400 hover:text-red-500 transition"><X size={16}/></button></div>
                            </div>
                        ))
                    )}
                </div>

                {/* 🟢 ZONA DE COBRO (DISEÑO CAJERO) */}
                <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-10">
                    {!modoCobro ? (
                        // MODO 1: RESUMEN Y BOTÓN COBRAR
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                             <div className="flex justify-between items-end mb-4"><span className="text-sm font-bold text-gray-400">Total a Pagar</span><span className="text-3xl font-black text-slate-900">${totalCarrito.toLocaleString()}</span></div>
                             <button disabled={carrito.length === 0} onClick={iniciarCobro} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <DollarSign size={20}/> COBRAR
                             </button>
                        </div>
                    ) : (
                        // MODO 2: CALCULADORA DE VUELTO
                        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calculator size={18}/> Cerrar Venta</h3>
                                <button onClick={() => setModoCobro(false)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">Cancelar</button>
                            </div>
                            
                            {/* 1. INPUT TRANSFERENCIA */}
                            <div className="bg-violet-50 p-3 rounded-xl border border-violet-100">
                                <div className="flex justify-between mb-1"><span className="text-[10px] font-black text-violet-700 uppercase">Transferencia / MP</span><CreditCard size={14} className="text-violet-600"/></div>
                                <div className="flex items-center gap-1"><span className="text-violet-800 font-bold">$</span>
                                    <input type="number" className="w-full bg-transparent font-black text-xl text-violet-900 outline-none" placeholder="0" value={pagoTransferencia} onChange={e => setPagoTransferencia(e.target.value)} onFocus={e => e.target.select()}/>
                                </div>
                            </div>

                            {/* 2. EFECTIVO A COBRAR (AUTO) */}
                            <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black text-green-700 uppercase">Efectivo a Cobrar</span><Wallet size={14} className="text-green-600"/></div>
                                    <span className="text-2xl font-black text-green-900">${efectivoAPagar.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* 3. PAGA CON / VUELTO */}
                            <div className="border-2 border-dashed border-gray-200 p-3 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Paga Con (Billete):</span>
                                    <input type="number" autoFocus className="w-24 text-right font-bold text-gray-800 bg-gray-50 border rounded p-1 outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" value={pagaConEfectivo} onChange={e => setPagaConEfectivo(e.target.value)} onFocus={e => e.target.select()}/>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Vuelto</span>
                                    <span className={`text-xl font-black ${vuelto < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                        {vuelto < 0 ? 'Falta: ' : ''}${Math.abs(vuelto).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <button 
                                disabled={procesando}
                                onClick={confirmarCobro}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {procesando ? "Procesando..." : "CONFIRMAR PAGO"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL PRODUCTO */}
            {showModalProducto && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">{idEdicion ? <><Pencil className="text-orange-500"/> Editar Producto</> : <><Tag className="text-blue-600"/> Nuevo Producto</>}</h2>
                            <button onClick={() => setShowModalProducto(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nombre</label><input type="text" autoFocus className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" value={formProd.nombre} onChange={e => setFormProd({...formProd, nombre: e.target.value})}/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Precio</label><input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-green-500" value={formProd.precio} onChange={e => setFormProd({...formProd, precio: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Categoría</label><select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-slate-900 outline-none" value={formProd.categoria} onChange={e => setFormProd({...formProd, categoria: e.target.value})}>{categorias.filter(c => c !== "Todas").map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            </div>
                        </div>
                        <div className="mt-8 flex items-center gap-3">
                            {idEdicion && <button onClick={eliminarProducto} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition" title="Eliminar"><Trash2 size={20}/></button>}
                            <div className="flex-1"></div>
                            <button onClick={() => setShowModalProducto(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                            <button onClick={guardarProducto} className={`px-6 py-3 text-white rounded-xl font-bold shadow-lg transition ${idEdicion ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>{idEdicion ? 'Guardar Cambios' : 'Crear Producto'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}