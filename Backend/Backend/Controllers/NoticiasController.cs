using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Http;
using System.IO;
using System;

namespace Backend.Controllers
{
    // Clase "cajita" para recibir los datos del formulario ordenados
    public class CrearNoticiaDto
    {
        public string Titulo { get; set; } = string.Empty;
        public string Cuerpo { get; set; } = string.Empty;
        public IFormFile? Imagen { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class NoticiasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NoticiasController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Noticias
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Noticia>>> GetNoticias()
        {
            return await _context.Noticias
                                 .OrderByDescending(n => n.FechaPublicacion)
                                 .ToListAsync();
        }

        // POST: api/Noticias
        [HttpPost]
        public async Task<ActionResult<Noticia>> PostNoticia([FromForm] CrearNoticiaDto datos)
        {
            var nuevaNoticia = new Noticia
            {
                Titulo = datos.Titulo,
                Cuerpo = datos.Cuerpo,
                FechaPublicacion = DateTime.Now
            };

            // Lógica de imagen
            if (datos.Imagen != null && datos.Imagen.Length > 0)
            {
                try
                {
                    var rutaCarpeta = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "imagenes");
                    if (!Directory.Exists(rutaCarpeta)) Directory.CreateDirectory(rutaCarpeta);

                    var nombreArchivo = Guid.NewGuid().ToString() + Path.GetExtension(datos.Imagen.FileName);
                    var rutaCompleta = Path.Combine(rutaCarpeta, nombreArchivo);

                    using (var stream = new FileStream(rutaCompleta, FileMode.Create))
                    {
                        await datos.Imagen.CopyToAsync(stream);
                    }

                    // URL de la imagen (Ajusta el puerto si no es 7123)
                    nuevaNoticia.ImagenUrl = $"https://localhost:7123/imagenes/{nombreArchivo}";
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Error subiendo imagen: " + ex.Message);
                }
            }

            _context.Noticias.Add(nuevaNoticia);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetNoticias", new { id = nuevaNoticia.Id }, nuevaNoticia);
        }

        // PUT: api/Noticias/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutNoticia(int id, Noticia noticia)
        {
            if (id != noticia.Id) return BadRequest();
            _context.Entry(noticia).State = EntityState.Modified;

            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Noticias.Any(e => e.Id == id)) return NotFound();
                else throw;
            }
            return NoContent();
        }

        // DELETE: api/Noticias/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNoticia(int id)
        {
            var noticia = await _context.Noticias.FindAsync(id);
            if (noticia == null) return NotFound();
            _context.Noticias.Remove(noticia);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}