using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Domain.Entities;
using Infrastructure.Persistencia;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductosController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Productos?usuarioId=5
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Producto>>> GetProductos([FromQuery] int usuarioId)
        {
            if (usuarioId == 0) return BadRequest("Falta usuarioId");

            return await _context.Productos
                .Where(p => p.Activo && p.UsuarioId == usuarioId) //  SOLO SUS PRODUCTOS
                .ToListAsync();
        }

        // POST: api/Productos
        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto(Producto producto)
        {
            if (producto.UsuarioId == 0) return BadRequest("Falta usuarioId");

            producto.Activo = true;
            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();
            return Ok(producto);
        }

        // PUT: api/Productos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, Producto producto)
        {
            if (id != producto.Id) return BadRequest();

            // Verificamos seguridad antes de editar
            var existente = await _context.Productos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (existente == null) return NotFound();
            if (existente.UsuarioId != producto.UsuarioId) return Unauthorized();

            _context.Entry(producto).State = EntityState.Modified;
            producto.Activo = true;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException) { throw; }

            return NoContent();
        }

        // DELETE: api/Productos/5?usuarioId=5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id, [FromQuery] int usuarioId)
        {
            var producto = await _context.Productos.FindAsync(id);
            if (producto == null) return NotFound();

            if (usuarioId != 0 && producto.UsuarioId != usuarioId) return Unauthorized();

            producto.Activo = false; // Borrado lógico
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}