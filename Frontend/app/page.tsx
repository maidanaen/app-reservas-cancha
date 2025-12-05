import { Search, MapPin, Calendar, Trophy, Users } from "lucide-react";
import { Cancha } from "./types"; // Importamos el molde

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
      {/* --- HEADER SUPERIOR (ESTO QUEDA IGUAL) --- */}
      <header className="bg-white p-6 rounded-b-3xl shadow-sm">
        <div className="flex justify-between items-center mb-4 text-gray-500 text-sm">
          <div className="flex items-center gap-1">
            <MapPin size={16} className="text-green-600" />
            <span>San Luis del Palmar</span>
          </div>
          <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
            🔔
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800">
          ¡Hola Enzo! 👋
          <br />
          <span className="text-gray-500 text-lg font-normal">¿Qué hacemos hoy?</span>
        </h1>

        <div className="mt-6 relative">
          <input 
            type="text" 
            placeholder="Buscar club, zona o deporte..." 
            className="w-full py-3 pl-12 pr-4 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-700 placeholder-gray-400"
          />
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        </div>
      </header>

      {/* --- SECCIÓN ACCIONES RÁPIDAS (ESTO QUEDA IGUAL) --- */}
      <section className="p-6">
        <div className="flex justify-between gap-4">
          <button className="flex-1 flex flex-col items-center gap-2 bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <Calendar size={24} />
            </div>
            <span className="text-sm font-medium text-gray-700">Reservar</span>
          </button>

          <button className="flex-1 flex flex-col items-center gap-2 bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100">
            <div className="bg-orange-100 p-3 rounded-full text-orange-600">
              <Users size={24} />
            </div>
            <span className="text-sm font-medium text-gray-700">Partidos</span>
          </button>

          <button className="flex-1 flex flex-col items-center gap-2 bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <Trophy size={24} />
            </div>
            <span className="text-sm font-medium text-gray-700">Torneos</span>
          </button>
        </div>
      </section>

      {/* --- 3. CAMBIO: SECCIÓN DINÁMICA (LISTA DE CANCHAS) --- */}
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
                  
                  <button className="mt-2 text-sm font-semibold text-green-600 text-left hover:underline">
                    Ver disponibilidad →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </main>
  );
}