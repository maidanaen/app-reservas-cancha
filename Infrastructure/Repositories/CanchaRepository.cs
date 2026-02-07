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
    public class CanchaRepository : ICanchaRepository
    {
        private readonly AppDbContext _context;

        public CanchaRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Cancha>> GetAllAsync()
        {
            return await _context.Canchas.ToListAsync();
        }

        public async Task<Cancha?> GetByIdAsync(int id)
        {
            return await _context.Canchas.FindAsync(id);
        }

        public async Task<Cancha> AddAsync(Cancha cancha)
        {
            _context.Canchas.Add(cancha);
            await _context.SaveChangesAsync();
            return cancha;
        }

        //  Actualizar
        public async Task UpdateAsync(Cancha cancha)
        {
            // 1. Buscamos si ya hay una versión de esta cancha en la memoria local
            var local = _context.Set<Cancha>()
                .Local
                .FirstOrDefault(entry => entry.Id.Equals(cancha.Id));

            // 2. Si existe, la "desconectamos" para evitar el conflicto de IDs
            if (local != null)
            {
                _context.Entry(local).State = EntityState.Detached;
            }

            // 3. Ahora sí, adjuntamos la nueva versión y guardamos
            _context.Canchas.Update(cancha);
            await _context.SaveChangesAsync();
        }

        // Borrar
        public async Task DeleteAsync(int id)
        {
            // 1. Buscamos la cancha
            var cancha = await _context.Canchas.FindAsync(id);

            if (cancha != null)
            {
                // 🟢 NUEVO: Buscamos todas las reservas de esta cancha
                var reservasAsociadas = _context.Reservas.Where(r => r.CanchaId == id);

                // 🟢 NUEVO: Las borramos primero (Limpieza de historial)
                _context.Reservas.RemoveRange(reservasAsociadas);

                // 2. Ahora sí, borramos la cancha sin que SQL se queje
                _context.Canchas.Remove(cancha);
                await _context.SaveChangesAsync();
            }
        }
    } 
}
    
