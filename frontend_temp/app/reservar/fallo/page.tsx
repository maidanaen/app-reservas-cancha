"use client";
import Link from "next/link";
import { XCircle, Home, RefreshCw } from "lucide-react";

export default function FalloPage() {
  return (
    <main className="min-h-screen bg-red-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
        
        <div className="flex justify-center">
            <div className="bg-red-100 p-4 rounded-full">
                <XCircle size={64} className="text-red-600" />
            </div>
        </div>

        <div>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Pago Pendiente o Fallido</h1>
            <p className="text-gray-500">
                No pudimos confirmar el cobro inmediato. Tu reserva quedó guardada, pero asegúrate de intentarlo de nuevo o pagar en el local.
            </p>
        </div>

        <div className="space-y-3 pt-4">
            <Link href="/" className="block w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition flex items-center justify-center gap-2">
                <RefreshCw size={20} /> Intentar de nuevo
            </Link>
            
            <Link href="/" className="block w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2">
                <Home size={20} /> Volver al Inicio
            </Link>
        </div>

      </div>
    </main>
  );
}