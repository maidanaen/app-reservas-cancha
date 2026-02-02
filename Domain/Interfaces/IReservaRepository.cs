using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Domain.Entities;

namespace Domain.Interfaces
{
    public interface IReservaRepository
    {
        // Para el calendario: Traer reservas de UNA cancha en UNA fecha específica
        Task<List<Reserva>> GetByCanchaYFechaAsync(int canchaId, DateTime fecha);

        // Para crear: Guardar reserva nueva (validando conflicto)
        Task<Reserva> AddAsync(Reserva reserva);
        // Para eliminar: Borrar reserva por Id
        Task DeleteAsync(int id);
        // Buscar reservas por teléfono del cliente
        Task<List<Reserva>> GetByClienteTelefonoAsync(string telefono);
        Task<Reserva?> GetByIdAsync(int id); // Para ver el detalle
        Task UpdateAsync(Reserva reserva);   // Para guardar los pagos
        Task<List<Reserva>> GetAllByFechaAsync(DateTime fecha);
        // Para la barra: Obtener o crear la reserva de barra del día
        Task<Reserva> GetOrCreateBarraAsync(DateTime fecha);
    }
}