using Microsoft.AspNetCore.Mvc;
using Domain.Entities;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CanchasController : ControllerBase
    {
        private readonly ICanchaRepository _repository;

        public CanchasController(ICanchaRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<List<Cancha>>> ObtenerTodas()
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId <= 0)
            {
                return Unauthorized("⚠️ Error de seguridad: Token inválido.");
            }

            // Traemos todas y filtramos (Idealmente esto se hace en el repositorio, pero así funciona rápido)
            var todasLasCanchas = await _repository.GetAllAsync();
            var misCanchas = todasLasCanchas.Where(c => c.UsuarioId == usuarioId).ToList();

            return Ok(misCanchas);
        }

        [HttpPost]
        public async Task<ActionResult<Cancha>> CrearCancha(Cancha cancha)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId <= 0)
            {
                return Unauthorized("❌ No se puede crear una cancha sin estar autenticado.");
            }
            cancha.UsuarioId = usuarioId; // ASIGNAMOS EL DUEÑO DEL TOKEN

            var nuevaCancha = await _repository.AddAsync(cancha);

            // Ajustamos el retorno para evitar errores si GetById no recibe parámetros extra
            return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevaCancha.Id }, nuevaCancha);
        }

        // GET: api/Canchas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Cancha>> ObtenerPorId(int id)
        {
            var cancha = await _repository.GetByIdAsync(id);
            if (cancha == null) return NotFound();
            return Ok(cancha);
        }

        // PUT: api/Canchas/5
        //  SEGURIDAD: Verificamos existencia antes de editar
        [HttpPut("{id}")]
        public async Task<IActionResult> EditarCancha(int id, Cancha cancha)
        {
            if (id != cancha.Id) return BadRequest("El ID de la URL no coincide con el cuerpo.");

            // 1. Buscamos la cancha original en la BD
            var canchaExistente = await _repository.GetByIdAsync(id);
            if (canchaExistente == null) return NotFound();

            // 2. PROTECCIÓN CRÍTICA:
            // Aseguramos que no estén intentando cambiar el dueño de la cancha o editar una ajena
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (canchaExistente.UsuarioId != usuarioId)
            {
                return Unauthorized("⛔ No tienes permiso para editar esta cancha o cambiar su dueño.");
            }
            cancha.UsuarioId = usuarioId; // Forzamos a que no pueda cambiar el dueño original

            await _repository.UpdateAsync(cancha);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarCancha(int id)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var cancha = await _repository.GetByIdAsync(id);
            if (cancha == null) return NotFound();

            if (cancha.UsuarioId != usuarioId) 
                return Unauthorized("No tienes permiso de borrar esta cancha.");

            await _repository.DeleteAsync(id);
            return NoContent();
        }
    }
}