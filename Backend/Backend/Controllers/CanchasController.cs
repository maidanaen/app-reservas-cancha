using Microsoft.AspNetCore.Mvc;
using Domain.Entities;
using Domain.Interfaces;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CanchasController : ControllerBase
    {
        private readonly ICanchaRepository _repository;

        public CanchasController(ICanchaRepository repository)
        {
            _repository = repository;
        }

        // GET: api/canchas?usuarioId=5
        // SEGURIDAD: Exigimos el usuarioId para filtrar
        [HttpGet]
        public async Task<ActionResult<List<Cancha>>> ObtenerTodas([FromQuery] int usuarioId)
        {
            if (usuarioId <= 0)
            {
                return BadRequest("⚠️ Error de seguridad: Se requiere el ID del usuario.");
            }

            // Traemos todas y filtramos (Idealmente esto se hace en el repositorio, pero así funciona rápido)
            var todasLasCanchas = await _repository.GetAllAsync();
            var misCanchas = todasLasCanchas.Where(c => c.UsuarioId == usuarioId).ToList();

            return Ok(misCanchas);
        }

        // POST: api/canchas
        //  SEGURIDAD: Validamos que la cancha tenga dueño
        [HttpPost]
        public async Task<ActionResult<Cancha>> CrearCancha(Cancha cancha)
        {
            if (cancha.UsuarioId <= 0)
            {
                return BadRequest("❌ No se puede crear una cancha sin asignar un dueño (UsuarioId).");
            }

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
            if (canchaExistente.UsuarioId != cancha.UsuarioId)
            {
                return Unauthorized("⛔ No tienes permiso para editar esta cancha o cambiar su dueño.");
            }

            await _repository.UpdateAsync(cancha);
            return NoContent();
        }

        // DELETE: api/Canchas/5
        // SEGURIDAD: Verificamos existencia antes de borrar
        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarCancha(int id)
        {
            var cancha = await _repository.GetByIdAsync(id);
            if (cancha == null) return NotFound();

            // Aquí podríamos validar también el usuarioId si se enviara, 
            // pero al menos validamos que exista antes de intentar borrar.

            await _repository.DeleteAsync(id);
            return NoContent();
        }
    }
}