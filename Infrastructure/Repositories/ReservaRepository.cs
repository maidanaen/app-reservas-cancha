using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistence;
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
            //  VALIDACIÓN CLAVE: ¿Hay conflicto?
            // "Si hay alguna reserva que empiece antes de que yo termine Y termine después de que yo empiece..."
            bool hayConflicto = await _context.Reservas.AnyAsync(r =>
                r.CanchaId == reserva.CanchaId &&
                r.FechaInicio < reserva.FechaFin &&
                r.FechaFin > reserva.FechaInicio);

            if (hayConflicto)
            {
                throw new InvalidOperationException("⚠️ ¡Ese horario ya está ocupado!");
            }

            // Si pasa la validación, guardamos
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
    }
}