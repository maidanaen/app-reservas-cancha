using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    // DTO auxiliar
    public class CrearNoticiaDto
    {
        public string Titulo { get; set; } = string.Empty;
        public string Cuerpo { get; set; } = string.Empty;
        public IFormFile? Imagen { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NoticiasController : ControllerBase
    {
        private readonly AppDbContext _context;
        public NoticiasController(AppDbContext context) { _context = context; }

        // 1. ENDPOINT PARA EL ADMINISTRADOR (Panel de Control)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Noticia>>> GetNoticias()
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized("Token inválido");

            return await _context.Noticias
                .Where(n => n.UsuarioId == usuarioId) //  SOLO SUS NOTICIAS
                .OrderByDescending(n => n.FechaPublicacion)
                .ToListAsync();
        }

        // 2. ENDPOINT PARA EL PÚBLICO (Web de Clientes)
        // Ruta: GET api/Noticias/publicas?usuarioId=0 (o el ID del club)
        [HttpGet("publicas")] 
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Noticia>>> GetNoticiasPublicas([FromQuery] int usuarioId = 0)
        {
            // Empezamos trayendo todo
            var query = _context.Noticias.AsQueryable();

            // Si el usuario eligió un club específico, filtramos.
            // Si mandó 0, no entra aquí y devuelve TODAS (Feed Global).
            if (usuarioId > 0)
            {
                query = query.Where(n => n.UsuarioId == usuarioId);
            }

            return await query
                .OrderByDescending(n => n.FechaPublicacion)
                .ToListAsync();
        }

        // POST: api/Noticias
        [HttpPost]
        public async Task<ActionResult<Noticia>> PostNoticia([FromForm] CrearNoticiaDto datos)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();

            var nuevaNoticia = new Noticia
            {
                Titulo = datos.Titulo,
                Cuerpo = datos.Cuerpo,
                FechaPublicacion = DateTime.Now,
                UsuarioId = usuarioId //  SELLO DE PROPIEDAD
            };

           

            _context.Noticias.Add(nuevaNoticia);
            await _context.SaveChangesAsync();
            return Ok(nuevaNoticia);
        }

        // DELETE: api/Noticias/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNoticia(int id)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var noticia = await _context.Noticias.FindAsync(id);
            if (noticia == null) return NotFound();
            if (noticia.UsuarioId != usuarioId) return Unauthorized();

            _context.Noticias.Remove(noticia);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}