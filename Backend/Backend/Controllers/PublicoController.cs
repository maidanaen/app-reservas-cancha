using Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PublicoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PublicoController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Publico/sedes
        [HttpGet("sedes")]
        public async Task<ActionResult> GetSedesConCanchas()
        {
            // 🟢 ESTRATEGIA: Buscamos las canchas y las agrupamos por Usuario (Dueño)
            // Así no necesitamos que la clase Usuario tenga la lista de canchas.
            var sedes = await _context.Canchas
                .Include(c => c.Usuario)
                .GroupBy(c => c.Usuario)
                .Select(g => new
                {
                    ClubId = g.Key.Id,
                    // Usamos NombreNegocio como nombre del club
                    NombreClub = g.Key.NombreNegocio ?? "Club Sin Nombre",
                    // Como NO tienes dirección en la BD, no la enviamos o mandamos vacío
                    Direccion = "",
                    LogoUrl = g.Key.LogoUrl,
                    FotoUrl = g.Key.FotoUrl,
                    Canchas = g.Select(c => new
                    {
                        c.Id,
                        c.Nombre,
                        c.Deporte,
                        c.HoraApertura,
                        c.HoraCierre
                    }).ToList()
                })
                .ToListAsync();


            return Ok(sedes);
        }
    }
}