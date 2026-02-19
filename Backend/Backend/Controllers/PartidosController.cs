using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Infrastructure.Persistencia;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PartidosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PartidosController(AppDbContext context)
        {
            _context = context;
        }

        // 1. VER PARTIDOS
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Partido>>> GetPartidos([FromQuery] bool todo = false, [FromQuery] int? usuarioId = null)
        {
            var query = _context.Partidos
                .Include(p => p.Inscripciones)
                .AsQueryable();

            //  Si mandan un usuarioId, filtramos solo los de él
            if (usuarioId.HasValue && usuarioId.Value > 0)
            {
                
                query = query.Where(p => p.UsuarioId == usuarioId.Value);
            }

            if (!todo)
            {
                query = query.Where(p => p.Fecha >= DateTime.Today);
            }

            return await query
                .OrderBy(p => p.Fecha).ThenBy(p => p.Hora) 
                .ToListAsync();
        }

        // 2. CREAR SALA
        [HttpPost]
        public async Task<ActionResult<Partido>> CrearPartido(Partido partido)
        {
            _context.Partidos.Add(partido);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetPartidos", new { id = partido.Id }, partido);
        }

        // 3. EDITAR SALA (Admin)
        [HttpPut("{id}")]
        public async Task<IActionResult> EditarPartido(int id, Partido partido)
        {
            if (id != partido.Id) return BadRequest();

            _context.Entry(partido).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Partidos.Any(e => e.Id == id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // 4. INSCRIBIRSE (Usuario)
        [HttpPost("inscribirse")]
        public async Task<IActionResult> Inscribirse([FromBody] Inscripcion inscripcion)
        {
            var partido = await _context.Partidos.FindAsync(inscripcion.PartidoId);
            if (partido == null) return NotFound("El partido no existe.");

            if (partido.JugadoresFaltantes > 0)
            {
                partido.JugadoresFaltantes--;
                _context.Inscripciones.Add(inscripcion);
                await _context.SaveChangesAsync();
                return Ok(partido);
            }
            return BadRequest("El partido ya está lleno.");
        }

        // 5. BORRAR SALA (Usuario con Clave)
        [HttpDelete("borrar/{id}")]
        public async Task<IActionResult> BorrarPartidoUsuario(int id, [FromQuery] string clave)
        {
            var partido = await _context.Partidos.FindAsync(id);
            if (partido == null) return NotFound();

            if (partido.ClaveBorrado != clave) return Unauthorized("Clave incorrecta.");

            _context.Partidos.Remove(partido);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // 6. BORRAR SALA (Admin - Sin Clave)
        [HttpDelete("admin/{id}")]
        public async Task<IActionResult> BorrarPartidoAdmin(int id)
        {
            var partido = await _context.Partidos.FindAsync(id);
            if (partido == null) return NotFound();

            _context.Partidos.Remove(partido);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}