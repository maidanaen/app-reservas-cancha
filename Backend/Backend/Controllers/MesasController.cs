using Backend.Domain.Entities;
using Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MesasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MesasController(AppDbContext context) { _context = context; }

        // GET: api/Mesas?usuarioId=5
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Mesa>>> GetMesas([FromQuery] int usuarioId)
        {
            if (usuarioId == 0) return BadRequest("Falta usuarioId");
            return await _context.Mesas
                .Where(m => m.UsuarioId == usuarioId)
                .OrderBy(m => m.Id)
                .ToListAsync();
        }

        // POST: api/Mesas (Crear nueva mesa en el mapa)
        [HttpPost]
        public async Task<ActionResult<Mesa>> PostMesa(Mesa mesa)
        {
            if (mesa.UsuarioId == 0) return BadRequest("Falta usuarioId");
            _context.Mesas.Add(mesa);
            await _context.SaveChangesAsync();
            return Ok(mesa);
        }

        // 🟢 1. ABRIR MESA (MÉTODO NUEVO Y MEJORADO)
        [HttpPost("{id}/abrir")]
        public async Task<IActionResult> AbrirMesa(int id, [FromQuery] int usuarioId)
        {
            // A. Buscamos la mesa
            var mesa = await _context.Mesas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
            if (mesa == null) return NotFound("Mesa no encontrada.");

            if (mesa.EstaOcupada) return BadRequest("Esta mesa ya está ocupada.");

            // B. 🔥 VALIDACIÓN DE CAJA (AQUÍ ESTÁ LA MAGIA) 🔥
            // Buscamos si hay una caja abierta para este usuario
            var cajaAbierta = await _context.Cajas
                .FirstOrDefaultAsync(c => c.UsuarioId == usuarioId && c.FechaCierre == null);

            if (cajaAbierta == null)
            {
                // En lugar de 404, devolvemos 400 con un mensaje claro para el humano
                return BadRequest("⚠️ CAJA CERRADA: No puedes abrir mesas sin abrir la Caja primero.");
            }

            // C. Creamos el pedido (Reserva)
            var nuevaReserva = new Reserva
            {
                UsuarioId = usuarioId,
                MesaId = id,
                CajaId = cajaAbierta.Id, // Asignamos la caja abierta
                FechaInicio = DateTime.Now,
                // FechaFin se queda null hasta cerrar
                Estado = "Pendiente",
                Tipo = "Mesa", // Marcamos que es de restaurante
                ClienteNombre = $"Mesa {mesa.Nombre}", // Nombre por defecto
                CobradoEfectivo = 0,
                CobradoTransferencia = 0
            };

            _context.Reservas.Add(nuevaReserva);
            await _context.SaveChangesAsync(); // Guardamos para generar el ID

            // D. Actualizamos la Mesa visualmente
            mesa.EstaOcupada = true;
            mesa.ReservaActualId = nuevaReserva.Id;

            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Mesa abierta correctamente", reservaId = nuevaReserva.Id });
        }

        // 🟢 2. CERRAR MESA (Liberar y cobrar)
        [HttpPost("{id}/cerrar")]
        public async Task<IActionResult> CerrarMesa(int id, [FromQuery] int usuarioId)
        {
            var mesa = await _context.Mesas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
            if (mesa == null) return NotFound("Mesa no encontrada.");

            // Buscamos el pedido activo
            var pedidoAbierto = await _context.Reservas
                .Where(r => r.MesaId == id && r.UsuarioId == usuarioId && r.Estado != "Pagado" && r.Estado != "Cancelado")
                .OrderByDescending(r => r.FechaInicio)
                .FirstOrDefaultAsync();

            if (pedidoAbierto != null)
            {
                // Aquí podrías validar si el saldo es 0 antes de cerrar, 
                // pero por ahora simplemente lo marcamos como pagado/cerrado.
                pedidoAbierto.Estado = "Pagado";
                pedidoAbierto.FechaFin = DateTime.Now;
            }

            // Liberamos la mesa
            mesa.EstaOcupada = false;
            mesa.ReservaActualId = null;

            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Mesa liberada correctamente" });
        }

        // DELETE: api/Mesas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMesa(int id, [FromQuery] int usuarioId)
        {
            var mesa = await _context.Mesas.FindAsync(id);
            if (mesa == null) return NotFound();
            if (usuarioId != 0 && mesa.UsuarioId != usuarioId) return Unauthorized();

            _context.Mesas.Remove(mesa);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}