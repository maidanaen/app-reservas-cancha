using Backend.Domain.Entities;
using Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConsumosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ConsumosController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/Consumos
        [HttpPost]
        public async Task<ActionResult<Consumo>> PostConsumo(Consumo consumo)
        {
            _context.Consumos.Add(consumo);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetConsumo", new { id = consumo.Id }, consumo);
        }

        //  Endpoint Inteligente para Pagar un Ítem individual
        // PUT: api/Consumos/5/pagar
        [HttpPut("{id}/pagar")]
        public async Task<IActionResult> PagarConsumo(int id, [FromBody] string metodo)
        {
            // 1. Buscamos el consumo
            var consumo = await _context.Consumos.FindAsync(id);
            if (consumo == null) return NotFound("Consumo no encontrado");

            // 2. Buscamos la Reserva dueña de este consumo (La Barra o una Cancha)
            var reserva = await _context.Reservas.FindAsync(consumo.ReservaId);
            if (reserva == null) return NotFound("Reserva padre no encontrada");

            // 3. Lógica de REVERSA (Si el cliente cambia de opinión: "Uy te pagué efvo, mejor transf")
            // Si ya tenía un pago registrado, primero restamos ese monto viejo
            if (consumo.MetodoPago == "EFECTIVO") reserva.CobradoEfectivo -= consumo.Precio;
            if (consumo.MetodoPago == "TRANSFERENCIA") reserva.CobradoTransferencia -= consumo.Precio;

            // 4. Lógica de PAGO NUEVO
            // Sumamos el monto a la caja correspondiente, contemplando el descuento
            decimal montoAPagar = consumo.Precio - consumo.DescuentoMonto;
            if (metodo == "EFECTIVO") reserva.CobradoEfectivo += montoAPagar;
            else if (metodo == "TRANSFERENCIA") reserva.CobradoTransferencia += montoAPagar;

            // 5. Marcamos el consumo como pagado
            consumo.MetodoPago = metodo;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Pago registrado correctamente", metodo = metodo });
        }

        
        // DELETE: api/Consumos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteConsumo(int id)
        {
            var consumo = await _context.Consumos.FindAsync(id);
            if (consumo == null) return NotFound();

            // 1. Si el ítem estaba pagado, tenemos que devolver la plata a la caja (Restar)
            // Esto evita que te sobre plata en el cierre de caja si borras una venta
            if (consumo.MetodoPago != null)
            {
                var reserva = await _context.Reservas.FindAsync(consumo.ReservaId);
                if (reserva != null)
                {
                    decimal montoDevolver = consumo.Precio - consumo.DescuentoMonto;
                    if (consumo.MetodoPago == "EFECTIVO") reserva.CobradoEfectivo -= montoDevolver;
                    else if (consumo.MetodoPago == "TRANSFERENCIA") reserva.CobradoTransferencia -= montoDevolver;
                }
            }

            // 2. Borramos el ítem
            _context.Consumos.Remove(consumo);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Consumos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Consumo>> GetConsumo(int id)
        {
            var consumo = await _context.Consumos.FindAsync(id);
            if (consumo == null) return NotFound();
            return consumo;
        }
    }
}