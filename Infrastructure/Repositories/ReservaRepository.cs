using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistencia;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class ReservaRepository : IReservaRepository
    {
        private readonly AppDbContext _context;

        public ReservaRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Reserva>> GetByCanchaYFechaAsync(int canchaId, DateTime fecha)
        {
            // Definimos el rango del día que estamos consultando (de 00:00 a 00:00 del día siguiente)
            var inicioDia = fecha.Date;
            var finDia = fecha.Date.AddDays(1);

            // Buscamos reservas que "choquen" con este día.
            // Lógica: (Empieza antes de que termine el día) Y (Termina después de que empiece el día)
            // Esto incluye:
            // 1. Las normales (empiezan y terminan hoy).
            // 2. Las que empezaron ayer y siguen hoy (Cruce de medianoche).
            return await _context.Reservas
                .Where(r => r.CanchaId == canchaId
                            && r.FechaInicio < finDia
                            && r.FechaFin > inicioDia)
                .OrderBy(r => r.FechaInicio)
                .ToListAsync();
        }

        public async Task<Reserva> AddAsync(Reserva reserva)
        {
            // 🟢 CORRECCIÓN: Solo validamos conflicto si es una CANCHA (CanchaId tiene valor).
            // Si es Cantina o Mesa (CanchaId es null), NO validamos horario.

            if (reserva.CanchaId != null)
            {
                bool hayConflicto = await _context.Reservas.AnyAsync(r =>
                    r.CanchaId == reserva.CanchaId &&
                    r.FechaInicio < reserva.FechaFin &&
                    r.FechaFin > reserva.FechaInicio);

                if (hayConflicto)
                {
                    throw new InvalidOperationException("⚠ ¡Ese horario ya está ocupado!");
                }
            }

            // Si pasa la validación (o si no era cancha), guardamos
            _context.Reservas.Add(reserva);
            await _context.SaveChangesAsync();
            return reserva;
        }
        // Eliminar reserva por Id
        public async Task DeleteAsync(int id)
        {
            var reserva = await _context.Reservas.FindAsync(id);
            if (reserva != null)
            {
                _context.Reservas.Remove(reserva);
                await _context.SaveChangesAsync();
            }
        }
        public async Task<List<Reserva>> GetByClienteTelefonoAsync(string telefono)
        {
            // Buscamos por teléfono exacto Y que la fecha sea futura (o de hoy)
            return await _context.Reservas
                .Include(r => r.Cancha) // Incluimos datos de la cancha para mostrar el nombre
                .Where(r => r.ClienteTelefono == telefono && r.FechaInicio >= DateTime.Today)
                .OrderBy(r => r.FechaInicio)
                .ToListAsync();
        }
        public async Task<Reserva?> GetByIdAsync(int id)
        {
            // AQUÍ ESTÁ LA CLAVE: .Include(r => r.Consumos)
            return await _context.Reservas
                .Include(r => r.Consumos)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task UpdateAsync(Reserva reserva)
        {
            _context.Reservas.Update(reserva);
            await _context.SaveChangesAsync();
        }
        // Obtener todas las reservas de una fecha específica
        public async Task<List<Reserva>> GetAllByFechaAsync(DateTime fecha)
        {
            return await _context.Reservas
                .Include(r => r.Consumos) // Traemos consumos por si queremos ver detalles
                .Where(r => r.FechaInicio.Date == fecha.Date)
                .OrderBy(r => r.FechaInicio)
                .ToListAsync();
        }
        public async Task<Reserva> GetOrCreateBarraAsync(DateTime fecha)
        {
            // 1. Buscamos si ya existe la barra de esa fecha
            var barra = await _context.Reservas
                .Include(r => r.Consumos)
                .FirstOrDefaultAsync(r =>
                    r.FechaInicio.Date == fecha.Date &&
                    r.ClienteNombre == "🍻 VENTAS BARRA"
                );

            /// 2. Si NO existe, la creamos automáticamente
            if (barra == null)
            {
                // TRUCO DE MAGIA: Buscamos la primera cancha real que exista en la BD 
                var primeraCancha = await _context.Canchas.FirstOrDefaultAsync();

                if (primeraCancha == null)
                {
                    // Si no hay ninguna cancha creada, no podemos abrir la barra
                    throw new Exception("¡ERROR: No hay canchas cargadas! Crea al menos una cancha en el panel para poder usar la barra.");
                }

                barra = new Reserva
                {
                    ClienteNombre = "🍻 VENTAS BARRA",
                    ClienteTelefono = "000-0000",
                    FechaInicio = fecha.Date.AddHours(8),
                    FechaFin = fecha.Date.AddHours(23),

                    // AQUI ESTA EL CAMBIO CLAVE: Usamos el ID real que encontramos
                    CanchaId = primeraCancha.Id,

                    MetodoPago = "Mostrador",
                    Consumos = new List<Consumo>(),
                    CobradoEfectivo = 0,
                    CobradoTransferencia = 0,
                    CobradoDigital = 0
                };

                _context.Reservas.Add(barra);
                await _context.SaveChangesAsync();
            }

            return barra;
        }
    }
}