"use client";
import { useState, useEffect } from "react";
import { DollarSign, Smartphone, Calculator, CheckCircle, AlertCircle } from "lucide-react";

interface PanelCobroProps {
  totalMesa: number;
  onCerrarMesa: (pagos: { cobradoEfectivo: number, cobradoTransferencia: number }) => void;
}

export default function PanelCobroMesa({ totalMesa, onCerrarMesa }: PanelCobroProps) {
  const [montoTransferencia, setMontoTransferencia] = useState("");
  const [montoEfectivo, setMontoEfectivo] = useState(""); 
  const [pagoCliente, setPagoCliente] = useState("");     

  const transf = Number(montoTransferencia) || 0;
  const efvo = Number(montoEfectivo) || 0;
  const billete = Number(pagoCliente) || 0;

  const totalIngresado = transf + efvo;
  const restante = totalMesa - totalIngresado;
  const vuelto = billete > 0 ? billete - efvo : 0;

  const completarRestanteEfectivo = () => {
    const falta = totalMesa - transf;
    if (falta > 0) setMontoEfectivo(falta.toString());
  };

  const procesarCierre = () => {
    if (restante > 0) return alert("❌ Aún falta cubrir el total.");
    onCerrarMesa({ cobradoEfectivo: efvo, cobradoTransferencia: transf });
  };

  // Efecto para limpiar si cambia la mesa
  useEffect(() => {
    setMontoTransferencia("");
    setMontoEfectivo("");
    setPagoCliente("");
  }, [totalMesa]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-full flex flex-col justify-center">
        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <Calculator size={20} className="text-blue-600"/> Cerrar y Cobrar
        </h3>

        {/* TRANSFERENCIA */}
        <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Transferencia / MP</label>
            <div className="relative">
                <Smartphone className="absolute left-3 top-3 text-violet-500" size={18} />
                <input 
                    type="number" 
                    placeholder="0"
                    className="w-full pl-10 p-3 bg-violet-50 border border-violet-100 rounded-xl font-bold text-violet-900 outline-none focus:ring-2 focus:ring-violet-500"
                    value={montoTransferencia}
                    onChange={(e) => setMontoTransferencia(e.target.value)}
                />
            </div>
        </div>

        {/* EFECTIVO */}
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Efectivo</label>
                {restante > 0 && (
                    <button onClick={completarRestanteEfectivo} className="text-[10px] bg-blue-100 text-blue-600 px-2 rounded font-bold hover:bg-blue-200">
                        Completar
                    </button>
                )}
            </div>
            <div className="relative">
                <DollarSign className="absolute left-3 top-3 text-green-600" size={18} />
                <input 
                    type="number" 
                    placeholder="0"
                    className="w-full pl-10 p-3 bg-green-50 border border-green-100 rounded-xl font-bold text-green-900 outline-none focus:ring-2 focus:ring-green-500"
                    value={montoEfectivo}
                    onChange={(e) => setMontoEfectivo(e.target.value)}
                />
            </div>
        </div>

        {/* VUELTO */}
        {efvo > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <div className="flex gap-2 items-center">
                    <div className="flex-1">
                         <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Paga con:</label>
                         <input 
                            type="number" 
                            placeholder="$ Billete"
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold text-slate-700 outline-none"
                            value={pagoCliente}
                            onChange={(e) => setPagoCliente(e.target.value)}
                        />
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Vuelto</p>
                        <p className={`text-xl font-black ${vuelto < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                            ${vuelto.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* BOTÓN FINAL */}
        <div className="mt-auto">
             <div className="flex justify-between items-center mb-3 text-sm">
                <span className="font-bold text-gray-400">Restante:</span>
                <span className={`font-black ${restante > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    ${restante.toLocaleString()}
                </span>
            </div>
            <button 
                onClick={procesarCierre}
                disabled={restante > 0}
                className={`w-full py-4 rounded-xl font-black text-lg shadow-lg transition 
                    ${restante > 0 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.05]'}
                `}
            >
                CERRAR MESA
            </button>
        </div>
    </div>
  );
}