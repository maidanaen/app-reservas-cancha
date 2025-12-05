using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Entities;

namespace Domain.Interfaces
{
    public interface ICanchaRepository
    {
        // Definimos las reglas del juego:
        Task<List<Cancha>> GetAllAsync(); // Traer todas
        Task<Cancha?> GetByIdAsync(int id); // Traer una por ID
        Task<Cancha> AddAsync(Cancha cancha); // Crear nueva
    }
}