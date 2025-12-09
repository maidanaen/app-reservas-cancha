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

        // GET: api/canchas
        [HttpGet]
        public async Task<ActionResult<List<Cancha>>> ObtenerTodas()
        {
            var canchas = await _repository.GetAllAsync();
            return Ok(canchas);
        }

        // POST: api/canchas
        [HttpPost]
        public async Task<ActionResult<Cancha>> CrearCancha(Cancha cancha)
        {
            var nuevaCancha = await _repository.AddAsync(cancha);
            return CreatedAtAction(nameof(ObtenerTodas), new { id = nuevaCancha.Id }, nuevaCancha);
        }
        // GET: api/Canchas/5 (Para buscar una sola cancha al editar)
        [HttpGet("{id}")]
        public async Task<ActionResult<Cancha>> ObtenerPorId(int id)
        {
            var cancha = await _repository.GetByIdAsync(id);
            if (cancha == null) return NotFound();
            return Ok(cancha);
        }

        // PUT: api/Canchas/5 (Para guardar cambios)
        [HttpPut("{id}")]
        public async Task<IActionResult> EditarCancha(int id, Cancha cancha)
        {
            if (id != cancha.Id) return BadRequest();
            await _repository.UpdateAsync(cancha);
            return NoContent(); // 204 significa "Hecho, todo bien"
        }

        // DELETE: api/Canchas/5 (Para borrar)
        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarCancha(int id)
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }
    }
}