using Backend.Domain.Entities;
using Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MesasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MesasController(AppDbContext context) { _context = context; }

        // GET: api/Mesas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Mesa>>> GetMesas()
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized("Token inválido");
            return await _context.Mesas
                .Where(m => m.UsuarioId == usuarioId)
                .OrderBy(m => m.Id)
                .ToListAsync();
        }

        // POST: api/Mesas (Crear nueva mesa en el mapa)
        [HttpPost]
        public async Task<ActionResult<Mesa>> PostMesa(Mesa mesa)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();
            mesa.UsuarioId = usuarioId; // ASIGNAMOS DEL TOKEN
            _context.Mesas.Add(mesa);
            await _context.SaveChangesAsync();
            return Ok(mesa);
        }

        // 🟢 1. ABRIR MESA 
        [HttpPost("{id}/abrir")]
        public async Task<IActionResult> AbrirMesa(int id)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var mesa = await _context.Mesas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
            if (mesa == null) return NotFound("Mesa no encontrada.");
            if (mesa.EstaOcupada) return BadRequest("Esta mesa ya está ocupada.");

            //  VALIDACIÓN DE CAJA DEL USUARIO CORRECTO 
            var cajaAbierta = await _context.Cajas
                .FirstOrDefaultAsync(c => c.UsuarioId == usuarioId && c.FechaCierre == null);

            if (cajaAbierta == null)
                return BadRequest("⚠️ CAJA CERRADA: No puedes abrir mesas sin abrir la Caja primero.");

            var nuevaReserva = new Reserva
            {
                UsuarioId = usuarioId,
                MesaId = id,
                CajaId = cajaAbierta.Id, // Vinculamos ID Caja
                FechaInicio = DateTime.UtcNow, // Usa UTC siempre
                Estado = "Pendiente",
                Tipo = "Mesa",
                ClienteNombre = $"Mesa {mesa.Nombre}",
                CobradoEfectivo = 0,
                CobradoTransferencia = 0
            };

            _context.Reservas.Add(nuevaReserva);
            await _context.SaveChangesAsync();

            mesa.EstaOcupada = true;
            mesa.ReservaActualId = nuevaReserva.Id;
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Mesa abierta correctamente", reservaId = nuevaReserva.Id });
        }

        // 🟢 2. CERRAR MESA (Liberar y cobrar REALMENTE)
        [HttpPost("{id}/cerrar")]
        public async Task<IActionResult> CerrarMesa(int id, [FromBody] PagoMesaDto pago)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            // Nota: Necesitas crear la clase PagoMesaDto abajo o usar un dynamic
            var mesa = await _context.Mesas.FirstOrDefaultAsync(m => m.Id == id && m.UsuarioId == usuarioId);
            if (mesa == null) return NotFound("Mesa no encontrada.");

            // Buscamos el pedido activo
            var pedidoAbierto = await _context.Reservas
                .FirstOrDefaultAsync(r => r.Id == mesa.ReservaActualId);

            if (pedidoAbierto != null)
            {
                // 1. Actualizamos montos en la Reserva
                pedidoAbierto.CobradoEfectivo = pago.CobradoEfectivo;
                pedidoAbierto.CobradoTransferencia = pago.CobradoTransferencia;
                pedidoAbierto.Estado = "Pagado";
                pedidoAbierto.FechaFin = DateTime.UtcNow;

                // 2. BUSCAMOS LA CAJA DEL DUEÑO PARA SUMARLE LA PLATA
                var cajaAbierta = await _context.Cajas
                    .FirstOrDefaultAsync(c => c.UsuarioId == usuarioId && c.FechaCierre == null);

                if (cajaAbierta != null)
                {
                    pedidoAbierto.CajaId = cajaAbierta.Id; // Aseguramos vínculo
                    cajaAbierta.TotalEfectivo += pago.CobradoEfectivo;
                    cajaAbierta.TotalTransferencia += pago.CobradoTransferencia;
                }
            }

            // Liberamos la mesa
            mesa.EstaOcupada = false;
            mesa.ReservaActualId = null;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Mesa cobrada y liberada correctamente" });
        }

        // DELETE: api/Mesas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMesa(int id)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var mesa = await _context.Mesas.FindAsync(id);
            if (mesa == null) return NotFound();
            if (usuarioId != 0 && mesa.UsuarioId != usuarioId) return Unauthorized();

            _context.Mesas.Remove(mesa);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    // DTO necesario para recibir los montos
    public class PagoMesaDto
    {
        public decimal CobradoEfectivo { get; set; }
        public decimal CobradoTransferencia { get; set; }
    }
}