"use client";
import Link from "next/link";
import { CheckCircle, Home, Calendar } from "lucide-react";

export default function ExitoPage() {
  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
        
        <div className="flex justify-center">
            <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle size={64} className="text-green-600 animate-bounce" />
            </div>
        </div>

        <div>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">¡Pago Exitoso!</h1>
            <p className="text-gray-500">
                Tu reserva ha sido confirmada y el pago se procesó correctamente. ¡A jugar! 🎾
            </p>
        </div>

        <div className="space-y-3 pt-4">
            <Link href="/mis-reservas" className="block w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center gap-2">
                <Calendar size={20} /> Ver mis Reservas
            </Link>
            
            <Link href="/" className="block w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2">
                <Home size={20} /> Volver al Inicio
            </Link>
        </div>

      </div>
    </main>
  );
}