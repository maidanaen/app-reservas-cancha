using Domain.Entities;            // Asegúrate que coincida con tu proyecto
using Infrastructure.Persistence; // Asegúrate que coincida con tu contexto
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

        // POST: api/Consumos (Para agregar una Coca, Pizza, etc.)
        [HttpPost]
        public async Task<ActionResult<Consumo>> PostConsumo(Consumo consumo)
        {
            _context.Consumos.Add(consumo);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetConsumo", new { id = consumo.Id }, consumo);
        }

        // DELETE: api/Consumos/5 (Por si cargaste mal un producto)
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteConsumo(int id)
        {
            var consumo = await _context.Consumos.FindAsync(id);
            if (consumo == null)
            {
                return NotFound();
            }

            _context.Consumos.Remove(consumo);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Consumos/5 (Solo por si el sistema lo pide internamente)
        [HttpGet("{id}")]
        public async Task<ActionResult<Consumo>> GetConsumo(int id)
        {
            var consumo = await _context.Consumos.FindAsync(id);
            if (consumo == null) return NotFound();
            return consumo;
        }
    }
}