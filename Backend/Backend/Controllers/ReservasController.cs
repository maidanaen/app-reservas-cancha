using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // 🟢 REQUERIR TOKEN JWT PARA TODAS LAS PETICIONES POR DEFECTO
    public class ReservasController : ControllerBase
    {
        private readonly IReservaRepository _repository;
        private readonly AppDbContext _context;
        private readonly INotificacionService _telegramService;

        public ReservasController(IReservaRepository repository, AppDbContext context, INotificacionService telegramService)
        {
            _repository = repository;
            _context = context;
            _telegramService = telegramService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Reserva>>> GetReservas([FromQuery] DateTime? fecha)
        {
            // 🟢 LEER EL ID DEL USUARIO DESDE EL TOKEN JWT SEGURO
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized("Token inválido");

            var query = _context.Reservas
                .Include(r => r.Cancha)
                .Where(r => r.UsuarioId == usuarioId);

            if (fecha.HasValue)
            {
                query = query.Where(r => r.FechaInicio.Date == fecha.Value.Date);
            }

            var reservas = await query.ToListAsync();
            return Ok(reservas);
        }

        [HttpGet("ocupadas")]
        [AllowAnonymous] // 🟢 CUALQUIERA PUEDE VER LOS HORARIOS OCUPADOS
        public async Task<ActionResult<IEnumerable<string>>> GetHorariosOcupados(int canchaId, DateTime fecha)
        {
            if (fecha.Kind == DateTimeKind.Unspecified || fecha.Kind == DateTimeKind.Local)
            {
                fecha = DateTime.SpecifyKind(fecha, DateTimeKind.Utc);
            }

            var reservas = await _repository.GetByCanchaYFechaAsync(canchaId, fecha);
            var horariosBloqueados = new List<string>();

            foreach (var reserva in reservas)
            {
                var tiempoActual = reserva.FechaInicio;
                while (tiempoActual < reserva.FechaFin)
                {
                    if (tiempoActual.Date == fecha.Date)
                    {
                        horariosBloqueados.Add(tiempoActual.ToString("HH:mm"));
                    }
                    tiempoActual = tiempoActual.AddMinutes(30);
                }
            }
            return Ok(horariosBloqueados.Distinct());
        }

        [HttpGet("cancha/{canchaId}")]
        [AllowAnonymous] // 🟢 CUALQUIERA PUEDE VER LOS TURNOS DE UNA CANCHA
        public async Task<ActionResult<List<Reserva>>> VerTurnos(int canchaId, [FromQuery] DateTime? fecha)
        {
            var fechaFiltro = fecha ?? DateTime.UtcNow;

            if (fechaFiltro.Kind == DateTimeKind.Local || fechaFiltro.Kind == DateTimeKind.Unspecified)
            {
                fechaFiltro = DateTime.SpecifyKind(fechaFiltro, DateTimeKind.Utc);
            }

            var turnos = await _repository.GetByCanchaYFechaAsync(canchaId, fechaFiltro);
            return Ok(turnos);
        }

        [HttpGet("cliente/{telefono}")]
        public async Task<ActionResult<IEnumerable<Reserva>>> GetReservasPorCliente(string telefono)
        {
            if (string.IsNullOrEmpty(telefono))
            {
                return BadRequest("Debes enviar un teléfono.");
            }

            var reservas = await _context.Reservas
                .Include(r => r.Cancha)
                .Where(r => r.ClienteTelefono.Contains(telefono))
                .OrderByDescending(r => r.FechaInicio)
                .ToListAsync();

            return reservas;
        }

        [HttpPost]
        [AllowAnonymous] // 🟢 CUALQUIERA PUEDE CREAR UNA RESERVA (CLIENTE DESDE LA WEB)
        public async Task<ActionResult<Reserva>> CrearReserva(Reserva reserva)
        {
            using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                var cancha = await _context.Canchas
                    .Include(c => c.Usuario)
                    .FirstOrDefaultAsync(c => c.Id == reserva.CanchaId);

                if (cancha == null)
                    return BadRequest(new { mensaje = "La cancha seleccionada no existe." });

                if (reserva.FechaFin == default)
                {
                    reserva.FechaFin = reserva.FechaInicio.AddHours(1);
                }

                // 🟢 NUEVO BLOQUEO: Verificar superposición de horarios dentro de la transacción
                bool existeSuperposicion = await _context.Reservas.AnyAsync(r => 
                    r.CanchaId == reserva.CanchaId && 
                    r.FechaInicio < reserva.FechaFin && r.FechaFin > reserva.FechaInicio);

                if (existeSuperposicion)
                {
                    return BadRequest(new { mensaje = "Ups, el horario acaba de ser reservado por alguien más." });
                }

                reserva.UsuarioId = cancha.UsuarioId;
                reserva.Tipo = "Cancha";

                if (reserva.Estado == "Pagado" || reserva.CobradoEfectivo > 0 || reserva.CobradoTransferencia > 0)
                {
                    // 🟢 Si se cobra al momento de crearla, guardamos la hora actual
                    reserva.FechaCobro = DateTime.UtcNow;

                    var cajaAbierta = await _context.Cajas
                        .FirstOrDefaultAsync(c => c.UsuarioId == reserva.UsuarioId && c.FechaCierre == null);

                    if (cajaAbierta != null)
                    {
                        reserva.CajaId = cajaAbierta.Id;
                    }
                }

                var nueva = await _repository.AddAsync(reserva);

                try
                {
                    if (cancha.Usuario != null && !string.IsNullOrEmpty(cancha.Usuario.TelegramChatId))
                    {

                        string msj = $"🚨 *NUEVA RESERVA RECIBIDA*\n\n" +
                                     $"🏟 *Cancha:* {cancha.Nombre}\n" +
                                     $"👤 *Cliente:* {nueva.ClienteNombre ?? "Anónimo"}\n" +
                                     $"📱 *Tel:* {nueva.ClienteTelefono ?? "-"}\n" +
                                     $"📅 *Día:* {nueva.FechaInicio:dd/MM/yyyy}\n" +
                                     $"⏰ *Hora:* {nueva.FechaInicio:HH:mm} hs\n";

                        _ = _telegramService.EnviarMensaje(cancha.Usuario.TelegramChatId, msj);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error al enviar Telegram: {ex.Message}");
                }

                await transaction.CommitAsync();
                return CreatedAtAction(nameof(VerTurnos), new { canchaId = nueva.CanchaId }, nueva);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { mensaje = ex.InnerException?.Message ?? ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelarReserva(int id)
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Reserva>> GetReserva(int id)
        {
            var reserva = await _repository.GetByIdAsync(id);
            if (reserva == null) return NotFound();
            return Ok(reserva);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> ActualizarReserva(int id, Reserva reserva)
        {
            if (id != reserva.Id) return BadRequest("El ID no coincide");
            try
            {
                await _repository.UpdateAsync(reserva);
            }
            catch (Exception)
            {
                return NotFound();
            }
            return NoContent();
        }

        [HttpPost("cobrar/{id}")]
        public async Task<IActionResult> CobrarReserva(int id, [FromBody] CobroReservaDto cobro)
        {
            var reserva = await _repository.GetByIdAsync(id);
            if (reserva == null) return NotFound("Reserva no encontrada");

            decimal diferenciaEfectivo = cobro.CobradoEfectivo - reserva.CobradoEfectivo;
            decimal diferenciaTransferencia = cobro.CobradoTransferencia - reserva.CobradoTransferencia;

            reserva.CobradoEfectivo = cobro.CobradoEfectivo;
            reserva.CobradoTransferencia = cobro.CobradoTransferencia;
            reserva.DescuentoTotalMonto = cobro.DescuentoTotalMonto;

            decimal totalPagado = cobro.CobradoEfectivo + cobro.CobradoTransferencia;

            if (totalPagado > 0)
            {
                reserva.Estado = "Pagado";
                // 🟢 REGISTRAMOS LA HORA EXACTA DEL COBRO
                reserva.FechaCobro = DateTime.UtcNow;

                if (cobro.CobradoEfectivo > 0 && cobro.CobradoTransferencia > 0)
                    reserva.MetodoPago = "Mixto";
                else if (cobro.CobradoTransferencia > 0)
                    reserva.MetodoPago = "Transferencia";
                else
                    reserva.MetodoPago = "Efectivo";

                var cajaAbierta = await _context.Cajas
                    .FirstOrDefaultAsync(c => c.UsuarioId == reserva.UsuarioId && c.FechaCierre == null);

                if (cajaAbierta != null)
                {
                    reserva.CajaId = cajaAbierta.Id;
                    if (diferenciaEfectivo > 0) cajaAbierta.TotalEfectivo += diferenciaEfectivo;
                    if (diferenciaTransferencia > 0) cajaAbierta.TotalTransferencia += diferenciaTransferencia;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Caja actualizada correctamente" });
        }

        // 🟢 NUEVO: GESTIÓN DINÁMICA DE AGENDA (EXTENSIÓN DE TURNO)
        [HttpPost("extender/{id}")]
        public async Task<IActionResult> ExtenderReserva(int id, [FromBody] int minutosExtra)
        {
            if (minutosExtra <= 0) return BadRequest("Los minutos a extender deben ser mayores a 0.");

            var reserva = await _repository.GetByIdAsync(id);
            if (reserva == null) return NotFound("Reserva no encontrada");

            // Calculamos el nuevo horario de fin
            var nuevoFin = reserva.FechaFin.AddMinutes(minutosExtra);

            // Validamos que no choque con otra reserva de la misma cancha
            // que empiece antes de nuestro nuevo fin, pero que sea POSTERIOR a la nuestra actual
            bool choqueHorario = await _context.Reservas.AnyAsync(r =>
                r.CanchaId == reserva.CanchaId &&
                r.Id != reserva.Id && // No comparamos con ella misma
                r.Estado != "Cancelado" &&
                r.FechaInicio < nuevoFin &&
                r.FechaFin > reserva.FechaFin // Que suceda después de la actual
            );

            if (choqueHorario)
            {
                return BadRequest(new { mensaje = "No se puede extender el turno: choca con otra reserva existente en ese horario." });
            }

            // Actualizamos la fecha fin
            reserva.FechaFin = nuevoFin;
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = $"Turno extendido exitosamente hasta las {nuevoFin:HH:mm}.", reserva });
        }

        [HttpPost("venta-express")]
        public async Task<ActionResult<Reserva>> VentaExpress(ReservaDto dto)
        {
            try
            {
                if (dto.UsuarioId <= 0)
                    return BadRequest("Error: No se identificó el usuario (Dueño) para esta venta.");

                var nuevaReserva = new Reserva
                {
                    FechaInicio = DateTime.UtcNow,
                    FechaFin = DateTime.UtcNow.AddMinutes(5),
                    ClienteNombre = "Venta Cantina",
                    ClienteTelefono = "-",
                    Tipo = "Venta",
                    Estado = "Pagado",
                    UsuarioId = dto.UsuarioId,
                    CobradoEfectivo = dto.CobradoEfectivo,
                    CobradoTransferencia = dto.CobradoTransferencia,
                    // 🟢 REGISTRAMOS LA HORA EXACTA DEL COBRO DE CANTINA
                    FechaCobro = DateTime.UtcNow
                };

                var cajaAbierta = await _context.Cajas
                    .FirstOrDefaultAsync(c => c.UsuarioId == dto.UsuarioId && c.FechaCierre == null);

                if (cajaAbierta != null)
                {
                    nuevaReserva.CajaId = cajaAbierta.Id;
                    cajaAbierta.TotalEfectivo += dto.CobradoEfectivo;
                    cajaAbierta.TotalTransferencia += dto.CobradoTransferencia;
                }

                _context.Reservas.Add(nuevaReserva);
                await _context.SaveChangesAsync();

                foreach (var item in dto.Items)
                {
                    // Lógica de Descuento
                    decimal montoDescuento = item.DescuentoMonto;
                    if (item.DescuentoPorcentaje > 0 && montoDescuento == 0)
                    {
                        montoDescuento = (item.Precio * item.Cantidad) * (item.DescuentoPorcentaje / 100m);
                    }

                    var consumo = new Consumo
                    {
                        ReservaId = nuevaReserva.Id,
                        Producto = item.Producto,
                        Precio = item.Precio,
                        Cantidad = item.Cantidad,
                        Jugador = "Cliente Mostrador",
                        DescuentoPorcentaje = item.DescuentoPorcentaje,
                        DescuentoMonto = montoDescuento
                    };
                    _context.Consumos.Add(consumo);
                }

                await _context.SaveChangesAsync();
                return Ok(nuevaReserva);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error procesando venta: {ex.Message}");
            }
        }

        [HttpGet("buscar/{telefono}")]
        public async Task<ActionResult<IEnumerable<object>>> BuscarPorTelefono(string telefono)
        {
            if (string.IsNullOrWhiteSpace(telefono)) return BadRequest("Teléfono requerido");

            var telLimpio = telefono.Trim();
            var hoy = DateTime.UtcNow.Date;

            var reservas = await _context.Reservas
                .Include(r => r.Cancha)
                .ThenInclude(c => c.Usuario)
                .Where(r =>
                    r.ClienteTelefono.Contains(telLimpio) &&
                    r.FechaInicio >= hoy
                )
                .OrderBy(r => r.FechaInicio)
                .Select(r => new
                {
                    id = r.Id,
                    club = r.Cancha.Usuario.NombreNegocio ?? "Club Deportivo",
                    cancha = r.Cancha.Nombre,
                    fecha = r.FechaInicio.ToString("dd/MM/yyyy"),
                    hora = r.FechaInicio.ToString("HH:mm"),
                    estado = r.Estado ?? "pendiente",
                    precio = r.CobradoEfectivo + r.CobradoTransferencia
                })
                .ToListAsync();

            return Ok(reservas);
        }

        [HttpPost("fija")]
        public async Task<IActionResult> CrearReservaFija([FromBody] ReservaFijaDto dto)
        {
            try
            {
                var reservasCreadas = new List<Reserva>();
                var fechaActual = dto.FechaInicio.Date;
                var fechaLimite = dto.FechaFin.Date;
                string codigoGrupo = Guid.NewGuid().ToString();

                var cancha = await _context.Canchas.FindAsync(dto.CanchaId);
                if (cancha == null) return BadRequest("Cancha no existe");

                while (fechaActual <= fechaLimite)
                {
                    if (dto.DiasSemana.Contains((int)fechaActual.DayOfWeek))
                    {
                        DateTime inicioTurno = fechaActual.Date.Add(dto.HoraInicio.TimeOfDay);
                        DateTime finTurno = fechaActual.Date.Add(dto.HoraFin.TimeOfDay);

                        bool ocupada = await _context.Reservas.AnyAsync(r =>
                            r.CanchaId == dto.CanchaId &&
                            r.FechaInicio < finTurno &&
                            r.FechaFin > inicioTurno &&
                            r.Estado != "Cancelado");

                        if (!ocupada)
                        {
                            var nueva = new Reserva
                            {
                                UsuarioId = cancha.UsuarioId,
                                CanchaId = dto.CanchaId,
                                ClienteNombre = dto.ClienteNombre,
                                ClienteTelefono = dto.ClienteTelefono,
                                FechaInicio = inicioTurno,
                                FechaFin = finTurno,
                                Estado = "Pendiente",
                                Tipo = "Cancha",
                                CobradoEfectivo = 0,
                                CobradoTransferencia = 0,
                                GrupoId = codigoGrupo
                            };
                            reservasCreadas.Add(nueva);
                        }
                    }
                    fechaActual = fechaActual.AddDays(1);
                }

                if (reservasCreadas.Count == 0) return BadRequest("No se crearon reservas (fechas u horarios ocupados).");

                _context.Reservas.AddRange(reservasCreadas);
                await _context.SaveChangesAsync();

                return Ok(new { mensaje = $"¡Éxito! Se agendaron {reservasCreadas.Count} turnos pendientes de pago.", total = reservasCreadas.Count });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error: {ex.Message}");
            }
        }

        [HttpDelete("grupo/{grupoId}")]
        public async Task<IActionResult> CancelarGrupo(string grupoId)
        {
            if (string.IsNullOrEmpty(grupoId)) return BadRequest();

            var reservasDelGrupo = await _context.Reservas
                .Where(r => r.GrupoId == grupoId)
                .ToListAsync();

            if (!reservasDelGrupo.Any()) return NotFound("No se encontró el grupo.");

            _context.Reservas.RemoveRange(reservasDelGrupo);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = $"Se eliminaron {reservasDelGrupo.Count} reservas fijas correctamente." });
        }
    }

    // --- DTOs ---
    public class CobroReservaDto
    {
        public decimal CobradoEfectivo { get; set; }
        public decimal CobradoTransferencia { get; set; }
        public decimal DescuentoTotalMonto { get; set; } = 0;
    }

    public class VentaCantinaDto
    {
        public List<ItemVentaDto> Items { get; set; }
        public string MetodoPago { get; set; }
        public decimal? CobradoEfectivo { get; set; }
        public decimal? CobradoTransferencia { get; set; }
    }

    public class ReservaDto
    {
        public int UsuarioId { get; set; }
        public int CanchaId { get; set; }
        public string? ClienteNombre { get; set; }
        public string? ClienteTelefono { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public decimal Precio { get; set; }
        public decimal CobradoEfectivo { get; set; }
        public decimal CobradoTransferencia { get; set; }
        public string MetodoPago { get; set; }
        public decimal DescuentoTotalMonto { get; set; } = 0;
        public List<ItemVentaDto> Items { get; set; } = new List<ItemVentaDto>();
    }

    public class ItemVentaDto
    {
        public string Producto { get; set; }
        public decimal Precio { get; set; }
        public int Cantidad { get; set; }
        public decimal DescuentoPorcentaje { get; set; } = 0;
        public decimal DescuentoMonto { get; set; } = 0;
    }

    public class ReservaFijaDto
    {
        public int CanchaId { get; set; }
        public string ClienteNombre { get; set; }
        public string ClienteTelefono { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public DateTime HoraInicio { get; set; }
        public DateTime HoraFin { get; set; }
        public decimal PrecioPorTurno { get; set; }
        public List<int> DiasSemana { get; set; }
    }
}