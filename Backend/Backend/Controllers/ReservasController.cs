using Microsoft.AspNetCore.Mvc;
using Domain.Entities;
using Domain.Interfaces;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReservasController : ControllerBase
    {
        private readonly IReservaRepository _repository;

        public ReservasController(IReservaRepository repository)
        {
            _repository = repository;
        }

        // GET: api/Reservas/cancha/1?fecha=2025-10-20
        [HttpGet("cancha/{canchaId}")]
        public async Task<ActionResult<List<Reserva>>> VerTurnos(int canchaId, [FromQuery] DateTime? fecha)
        {
            // Si no mandan fecha, usamos HOY
            var fechaFiltro = fecha ?? DateTime.Now;
            var turnos = await _repository.GetByCanchaYFechaAsync(canchaId, fechaFiltro);
            return Ok(turnos);
        }

        // POST: api/Reservas
        [HttpPost]
        public async Task<ActionResult<Reserva>> CrearReserva(Reserva reserva)
        {
            try
            {
                // Forzamos que la fecha fin sea 1 hora después del inicio (Regla de negocio simple)
                // Opcional: puedes quitar esto si el frontend manda la fecha fin exacta
                if (reserva.FechaFin == default)
                {
                    reserva.FechaFin = reserva.FechaInicio.AddHours(1);
                }

                var nueva = await _repository.AddAsync(reserva);
                return CreatedAtAction(nameof(VerTurnos), new { canchaId = nueva.CanchaId }, nueva);
            }
            catch (InvalidOperationException ex)
            {
                // Devolvemos Error 400 (Bad Request) con el mensaje "Horario ocupado"
                return BadRequest(new { mensaje = ex.Message });
            }
        }
        // DELETE: api/Reservas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelarReserva(int id)
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }
        // GET: api/Reservas/cliente/123456789
        [HttpGet("cliente/{telefono}")]
        public async Task<ActionResult<List<Reserva>>> VerMisReservas(string telefono)
        {
            var reservas = await _repository.GetByClienteTelefonoAsync(telefono);
            return Ok(reservas);
        }
        // GET: api/Reservas/5 (Para la pantalla de Detalle/Comanda)
        [HttpGet("{id}")]
        public async Task<ActionResult<Reserva>> GetReserva(int id)
        {
            var reserva = await _repository.GetByIdAsync(id);

            if (reserva == null)
            {
                return NotFound();
            }

            return Ok(reserva);
        }

        // PUT: api/Reservas/5 (Para guardar los Pagos de Caja)
        [HttpPut("{id}")]
        public async Task<IActionResult> ActualizarReserva(int id, Reserva reserva)
        {
            if (id != reserva.Id)
            {
                return BadRequest("El ID no coincide");
            }

            try
            {
                await _repository.UpdateAsync(reserva);
            }
            catch (Exception)
            {
                // Manejo básico de errores
                return NotFound();
            }

            return NoContent();
        }
        // GET: api/Reservas/dia/2026-01-27
        [HttpGet("dia/{fecha}")]
        public async Task<ActionResult<List<Reserva>>> VerCajaDiaria(DateTime fecha)
        {
            var reservas = await _repository.GetAllByFechaAsync(fecha);
            return Ok(reservas);
        }

    }
}