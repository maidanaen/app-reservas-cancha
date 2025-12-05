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
    }
}