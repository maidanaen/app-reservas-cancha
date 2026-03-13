using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PartidosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PartidosController(AppDbContext context)
        {
            _context = context;
        }

        // 1. VER PARTIDOS
        [HttpGet]
        [AllowAnonymous] // 🟢 PÚBLICO
        public async Task<ActionResult<IEnumerable<Partido>>> GetPartidos([FromQuery] int? usuarioId, [FromQuery] bool todo = false)
        {
            var query = _context.Partidos
                .Include(p => p.Inscripciones)
                .AsQueryable();

            // 1. Si se pasa usuarioId por query (público), filtramos por ese club
            if (usuarioId.HasValue && usuarioId.Value > 0)
            {
                query = query.Where(p => p.UsuarioId == usuarioId.Value);
            }
            else
            {
                // 2. Si no, intentamos obtenerlo del token (Admin)
                int tokenUsuarioId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out int id) ? id : 0;
                if (tokenUsuarioId > 0)
                {
                    query = query.Where(p => p.UsuarioId == tokenUsuarioId);
                }
            }

            if (!todo)
            {
                // Mostramos partidos de hoy en adelante
                query = query.Where(p => p.Fecha >= DateTime.Today);
            }

            return await query
                .OrderBy(p => p.Fecha).ThenBy(p => p.Hora) 
                .ToListAsync();
        }

        // 2. CREAR SALA
        [HttpPost]
        [AllowAnonymous] // 🟢 PÚBLICO
        public async Task<ActionResult<Partido>> CrearPartido(Partido partido)
        {
            // Si el partido viene sin UsuarioId, es un error (necesitamos saber de qué club es)
            if (partido.UsuarioId <= 0) return BadRequest("Debe especificar el ID del Club (UsuarioId) para crear el partido.");

            _context.Partidos.Add(partido);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPartidos), new { id = partido.Id }, partido);
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
        [AllowAnonymous] // 🟢 PÚBLICO
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
        [AllowAnonymous] // 🟢 PÚBLICO (Requiere Clave en Query)
        public async Task<IActionResult> BorrarPartidoUsuario(int id, [FromQuery] string clave)
        {
            var partido = await _context.Partidos.FindAsync(id);
            if (partido == null) return NotFound();

            if (partido.ClaveBorrado != clave) return Unauthorized("Clave incorrecta.");

            _context.Partidos.Remove(partido);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // 6. BORRAR SALA (Admin)
        [HttpDelete("admin/{id}")]
        public async Task<IActionResult> BorrarPartidoAdmin(int id)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();
            var partido = await _context.Partidos.FindAsync(id);
            if (partido == null) return NotFound();

            _context.Partidos.Remove(partido);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}