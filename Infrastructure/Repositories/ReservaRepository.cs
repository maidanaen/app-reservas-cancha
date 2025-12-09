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
            // Buscamos reservas que coincidan en Día, Mes y Año
            return await _context.Reservas
                .Where(r => r.CanchaId == canchaId
                            && r.FechaInicio.Date == fecha.Date)
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
    }
}