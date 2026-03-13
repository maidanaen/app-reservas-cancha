using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProductosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductosController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Productos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Producto>>> GetProductos()
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();

            return await _context.Productos
                .Where(p => p.Activo && p.UsuarioId == usuarioId) //  SOLO SUS PRODUCTOS
                .ToListAsync();
        }

        // POST: api/Productos
        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto(Producto producto)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();
            producto.UsuarioId = usuarioId;

            producto.Activo = true;
            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();
            return Ok(producto);
        }

        // PUT: api/Productos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, Producto producto)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (id != producto.Id) return BadRequest();

            // Verificamos seguridad antes de editar
            var existente = await _context.Productos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (existente == null) return NotFound();
            if (existente.UsuarioId != usuarioId) return Unauthorized();

            _context.Entry(producto).State = EntityState.Modified;
            producto.Activo = true;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException) { throw; }

            return NoContent();
        }

        // DELETE: api/Productos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var producto = await _context.Productos.FindAsync(id);
            if (producto == null) return NotFound();

            if (producto.UsuarioId != usuarioId) return Unauthorized();

            producto.Activo = false; // Borrado lógico
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}