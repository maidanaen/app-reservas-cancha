import { Cancha } from "./types"; // Importamos el molde
import Link from "next/link";

// Función para pedir los datos al Backend
async function getCanchas(): Promise<Cancha[]> {
  //(Ignora el error del certificado local)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  // ⚠️ IMPORTANTE: Asegúrate que este puerto (7197) sea el mismo que ves en tu Swagger
  const res = await fetch('https://localhost:7123/api/Canchas', { 
    cache: 'no-store' 
  });
  
  if (!res.ok) {
    // Si falla, retornamos un array vacío para que no rompa la página
    console.error("Error conectando al backend");
    return [];
  }
  
  return res.json();
}

// 1. CAMBIO: Agregamos la palabra 'async' antes de function
export default async function Home() {

  // 2. CAMBIO: Pedimos los datos al backend antes de mostrar nada
  const canchas = await getCanchas();

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* --- 1. CAMBIO: SECCIÓN DINÁMICA (LISTA DE CANCHAS) --- */}
      <section className="px-6">
        <h2 className="font-bold text-gray-800 mb-4 text-lg">Canchas Destacadas</h2>
        
        {/* Aquí usamos .map para recorrer la lista que trajo el Backend */}
        <div className="space-y-4">
          {canchas.length === 0 ? (
            <p className="text-center text-gray-400">No se encontraron canchas o el servidor está apagado.</p>
          ) : (
            canchas.map((cancha) => (
              <div key={cancha.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition cursor-pointer">
                {/* Imagen */}
                <img 
                  src={cancha.imgUrl || "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&q=80&w=1000"} 
                  alt={cancha.nombre}
                  className="w-24 h-24 rounded-xl object-cover bg-gray-200"
                />
                
                {/* Información */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-800 line-clamp-1">{cancha.nombre}</h3>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                        ${cancha.precioPorHora}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {cancha.deporte} • {cancha.techada ? "Techada 🏠" : "Al aire libre ☀️"}
                    </p>
                  </div>
                  
                  <Link 
                      href={`/reservar/${cancha.id}`}
                      className="mt-2 text-sm font-semibold text-green-600 text-left hover:underline inline-block">
                      Ver disponibilidad →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </main>
  );
}