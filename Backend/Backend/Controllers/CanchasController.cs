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
    }
}