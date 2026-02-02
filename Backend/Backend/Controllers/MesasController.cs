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

        public MesasController(AppDbContext context)
        {
            _context = context;
        }

        // 1. OBTENER LISTA DE MESAS
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Mesa>>> GetMesas()
        {
            return await _context.Mesas.OrderBy(m => m.Id).ToListAsync();
        }

        // 2. CREAR MESA
        [HttpPost]
        public async Task<ActionResult<Mesa>> PostMesa(Mesa mesa)
        {
            _context.Mesas.Add(mesa);
            await _context.SaveChangesAsync();
            return Ok(mesa);
        }

        // 3. ABRIR UNA MESA (ACTUALIZADO) 🍽️
        [HttpPost("{id}/abrir")]
        public async Task<ActionResult> AbrirMesa(int id, [FromQuery] string mozo = "Mozo")
        {
            var mesa = await _context.Mesas.FindAsync(id);
            if (mesa == null) return NotFound("Mesa no existe");
            if (mesa.EstaOcupada) return BadRequest("La mesa ya está ocupada");

            var nuevaCuenta = new Reserva
            {
                MesaId = mesa.Id,
                CanchaId = null,
                ClienteNombre = $"Mesa: {mesa.Nombre}",
                ClienteTelefono = "000",
                FechaInicio = DateTime.Now,
                FechaFin = DateTime.Now.AddHours(2), // Duración estimada
                MetodoPago = "Pendiente",

                // 🟢 LA CLAVE DEL ÉXITO: ETIQUETA "MESA"
                // Esto asegura que la Caja lo ponga en la fila de "Restaurante"
                Tipo = "Mesa",

                Consumos = new List<Consumo>()
            };

            _context.Reservas.Add(nuevaCuenta);
            await _context.SaveChangesAsync();

            mesa.EstaOcupada = true;
            mesa.ReservaActualId = nuevaCuenta.Id;
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Mesa abierta", reservaId = nuevaCuenta.Id });
        }

        // 4. CERRAR MESA
        [HttpPost("{id}/cerrar")]
        public async Task<ActionResult> CerrarMesa(int id, [FromBody] CierreMesaDto pago)
        {
            var mesa = await _context.Mesas.FindAsync(id);

            // Validaciones básicas
            if (mesa == null) return NotFound("Mesa no encontrada");
            if (!mesa.EstaOcupada || mesa.ReservaActualId == null)
                return BadRequest("La mesa no está abierta, no se puede cobrar.");

            // Buscamos la "Reserva" que actúa como cuenta de la mesa
            var reserva = await _context.Reservas.FindAsync(mesa.ReservaActualId);

            if (reserva != null)
            {
                // Guardamos el desglose del dinero para la Caja
                reserva.CobradoEfectivo = pago.CobradoEfectivo;
                reserva.CobradoTransferencia = pago.CobradoTransferencia;

                // Actualizamos estado
                reserva.MetodoPago = (pago.CobradoEfectivo > 0 && pago.CobradoTransferencia > 0) ? "Mixto"
                                   : (pago.CobradoTransferencia > 0) ? "Transferencia" : "Efectivo";

                reserva.Estado = "Pagado";
                reserva.FechaFin = DateTime.Now; // Hora real de cierre
            }

            // Liberamos la mesa física
            mesa.EstaOcupada = false;
            mesa.ReservaActualId = null;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Mesa cobrada y cerrada exitosamente" });
        }

        // 5. BORRAR MESA
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMesa(int id)
        {
            var mesa = await _context.Mesas.FindAsync(id);
            if (mesa == null) return NotFound();

            var historialReservas = await _context.Reservas
                                            .Where(r => r.MesaId == id)
                                            .Include(r => r.Consumos)
                                            .ToListAsync();

            if (historialReservas.Any())
            {
                _context.Reservas.RemoveRange(historialReservas);
            }

            _context.Mesas.Remove(mesa);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    // DTO simple para recibir los datos del Frontend
    public class CierreMesaDto
    {
        public decimal CobradoEfectivo { get; set; }
        public decimal CobradoTransferencia { get; set; }
    }
}