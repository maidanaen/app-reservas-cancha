using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // 🟢 Necesario para usar EF Core
using Domain.Entities;
using Domain.Interfaces;
using Infrastructure.Persistencia; // 🟢 Necesario para AppDbContext

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReservasController : ControllerBase
    {
        private readonly IReservaRepository _repository;
        private readonly AppDbContext _context; // 🟢 Inyectamos el Contexto directo

        public ReservasController(IReservaRepository repository, AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        // GET: api/Reservas?fecha=2026-01-31
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Reserva>>> GetReservas([FromQuery] int usuarioId, [FromQuery] DateTime? fecha)
        {
            if (usuarioId == 0) return BadRequest("Falta usuarioId");

            // Si no mandan fecha, devolvemos todo (para el Dashboard que filtra en memoria)
            // O si prefieres, puedes filtrar por fecha aquí también.
            // Para el Dashboard, generalmente queremos "todas las futuras" o "las de hoy".

            // Opción A: Traer TODO lo de este usuario (Dashboard filtra en RAM) - MÁS FÁCIL PARA TU FRONTEND ACTUAL
            var query = _context.Reservas
                .Include(r => r.Cancha) // 🟢 CLAVE: Traer nombre de cancha
                .Where(r => r.UsuarioId == usuarioId); // 🔒 CLAVE: Seguridad

            if (fecha.HasValue)
            {
                // Si mandan fecha específica (Agenda), filtramos por día
                query = query.Where(r => r.FechaInicio.Date == fecha.Value.Date);
            }

            var reservas = await query.ToListAsync();
            return Ok(reservas);
        }

        // GET: api/Reservas/ocupadas
        [HttpGet("ocupadas")]
        public async Task<ActionResult<IEnumerable<string>>> GetHorariosOcupados(int canchaId, DateTime fecha)
        {
            // ✅ CORRECCIÓN: Forzamos que la fecha que llega se trate como UTC
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
                    // Comparamos solo la parte de la fecha (.Date)
                    if (tiempoActual.Date == fecha.Date)
                    {
                        horariosBloqueados.Add(tiempoActual.ToString("HH:mm"));
                    }
                    tiempoActual = tiempoActual.AddMinutes(30);
                }
            }
            return Ok(horariosBloqueados.Distinct());
        }

        // GET: api/Reservas/cancha/1
        [HttpGet("cancha/{canchaId}")]
        public async Task<ActionResult<List<Reserva>>> VerTurnos(int canchaId, [FromQuery] DateTime? fecha)
        {
            // ✅ CORRECCIÓN: Usar UtcNow en lugar de Now
            var fechaFiltro = fecha ?? DateTime.UtcNow;

            // Asegurar UTC si viene por parámetro
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

            // Buscamos reservas donde el teléfono coincida (parcialmente)
            var reservas = await _context.Reservas
                .Include(r => r.Cancha) // 🟢 CLAVE: Traemos los datos de la cancha
                .Where(r => r.ClienteTelefono.Contains(telefono))
                .OrderByDescending(r => r.FechaInicio) // Las más recientes primero
                .ToListAsync();

            return reservas;
        }


        [HttpPost]
        public async Task<ActionResult<Reserva>> CrearReserva(Reserva reserva)
        {
            try
            {
                // 🟢 1. VALIDACIÓN VITAL: BUSCAR LA CANCHA Y SU DUEÑO
                // Antes de nada, preguntamos: "¿De quién es esta cancha?"
                var cancha = await _context.Canchas.FindAsync(reserva.CanchaId);

                if (cancha == null)
                    return BadRequest(new { mensaje = "La cancha seleccionada no existe." });

                // 🟢 2. HERENCIA DE PROPIEDAD
                // Asignamos a la reserva el mismo dueño que la cancha.
                // Esto soluciona el error "FK_Reservas_Usuarios".
                reserva.UsuarioId = cancha.UsuarioId;

                // --- Configuración básica ---
                reserva.Tipo = "Cancha";
                if (reserva.FechaFin == default)
                {
                    reserva.FechaFin = reserva.FechaInicio.AddHours(1);
                }

                // 🟢 3. LÓGICA DE CAJA (CORREGIDA PARA MULTI-CLIENTE)
                // Solo buscamos cajas abiertas que pertenezcan a ESTE USUARIO
                if (reserva.Estado == "Pagado" || reserva.CobradoEfectivo > 0 || reserva.CobradoTransferencia > 0)
                {
                    var cajaAbierta = await _context.Cajas
                        .FirstOrDefaultAsync(c => c.UsuarioId == reserva.UsuarioId && c.FechaCierre == null); // 👈 Filtro clave

                    if (cajaAbierta != null)
                    {
                        reserva.CajaId = cajaAbierta.Id;
                    }
                }

                // Guardamos
                var nueva = await _repository.AddAsync(reserva);

                return CreatedAtAction(nameof(VerTurnos), new { canchaId = nueva.CanchaId }, nueva);
            }
            catch (Exception ex)
            {
                // Tip: Usa ex.InnerException?.Message para ver detalles profundos de SQL si falla
                return BadRequest(new { mensaje = ex.InnerException?.Message ?? ex.Message });
            }
        }

        // DELETE
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelarReserva(int id)
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }

        // GET DETALLE
        [HttpGet("{id}")]
        public async Task<ActionResult<Reserva>> GetReserva(int id)
        {
            var reserva = await _repository.GetByIdAsync(id);
            if (reserva == null) return NotFound();
            return Ok(reserva);
        }

        // PUT (Actualización Genérica)
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

        // ==========================================
        // 2. COBRAR RESERVA (AGENDA) 💰
        // ==========================================
        [HttpPost("cobrar/{id}")]
        public async Task<IActionResult> CobrarReserva(int id, [FromBody] CobroReservaDto cobro)
        {
            var reserva = await _repository.GetByIdAsync(id);
            if (reserva == null) return NotFound("Reserva no encontrada");

            // 🟢 1. Calculamos la DIFERENCIA (Lo que entra nuevo a la caja)
            // Si antes había pagado 100 y ahora paga 150, a la caja solo entran 50.
            decimal diferenciaEfectivo = cobro.CobradoEfectivo - reserva.CobradoEfectivo;
            decimal diferenciaTransferencia = cobro.CobradoTransferencia - reserva.CobradoTransferencia;

            // 2. Actualizamos la reserva con los nuevos totales
            reserva.CobradoEfectivo = cobro.CobradoEfectivo;
            reserva.CobradoTransferencia = cobro.CobradoTransferencia;

            // 3. Calculamos total y estado
            decimal totalPagado = cobro.CobradoEfectivo + cobro.CobradoTransferencia;

            if (totalPagado > 0)
            {
                reserva.Estado = "Pagado";

                if (cobro.CobradoEfectivo > 0 && cobro.CobradoTransferencia > 0)
                    reserva.MetodoPago = "Mixto";
                else if (cobro.CobradoTransferencia > 0)
                    reserva.MetodoPago = "Transferencia";
                else
                    reserva.MetodoPago = "Efectivo";

                // 🟢 4.VINCULAR A CAJA ABIERTA (DEL DUEÑO CORRECTO) 
                // Buscamos SOLO la caja del usuario dueño de la reserva
                var cajaAbierta = await _context.Cajas
                    .FirstOrDefaultAsync(c => c.UsuarioId == reserva.UsuarioId && c.FechaCierre == null);

                if (cajaAbierta != null)
                {
                    reserva.CajaId = cajaAbierta.Id;

                    // 🟢 5. SUMAMOS LA DIFERENCIA A LA CAJA (Impacto real)
                    if (diferenciaEfectivo > 0) cajaAbierta.TotalEfectivo += diferenciaEfectivo;
                    if (diferenciaTransferencia > 0) cajaAbierta.TotalTransferencia += diferenciaTransferencia;
                }
            }

            // 6. Guardamos todo junto (Reserva + Caja)
            await _context.SaveChangesAsync(); // Usamos el contexto directo para guardar ambos cambios

            return Ok(new { mensaje = "Caja actualizada correctamente" });
        }

        // ==========================================
        // 3. VENTA EXPRESS (CANTINA/KIOSCO) 🍔🥤
        // ==========================================
        [HttpPost("venta-express")]
        public async Task<ActionResult<Reserva>> VentaExpress(ReservaDto dto)
        {
            try
            {
                // 1. Validamos que venga el UsuarioId (El dueño)
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

                    // 🔴 BORRAMOS LA LÍNEA 'Precio' PORQUE NO EXISTE EN TU BASE DE DATOS
                    // Precio = ..., 

                    // ✅ ESTO ES LO QUE IMPORTA (Donde se guarda la plata):
                    CobradoEfectivo = dto.CobradoEfectivo,
                    CobradoTransferencia = dto.CobradoTransferencia
                };

                // 🟢 2. VINCULAR A LA CAJA ABIERTA (Vital para que sume al cierre)
                // Buscamos la caja abierta DE ESTE USUARIO ESPECÍFICO
                var cajaAbierta = await _context.Cajas
                    .FirstOrDefaultAsync(c => c.UsuarioId == dto.UsuarioId && c.FechaCierre == null);

                if (cajaAbierta != null)
                {
                    nuevaReserva.CajaId = cajaAbierta.Id;

                    // Actualizamos los acumuladores de la caja en tiempo real
                    cajaAbierta.TotalEfectivo += dto.CobradoEfectivo;
                    cajaAbierta.TotalTransferencia += dto.CobradoTransferencia;
                }

                // 3. Guardar la Reserva (Venta)
                _context.Reservas.Add(nuevaReserva);
                await _context.SaveChangesAsync(); // Guardamos para generar el ID de la reserva

                // 4. Guardar los Items individuales (Tabla Consumos)
                foreach (var item in dto.Items)
                {
                    var consumo = new Consumo
                    {
                        ReservaId = nuevaReserva.Id,
                        Producto = item.Producto,
                        Precio = item.Precio, // Precio unitario o total según tu lógica frontend
                        Cantidad = item.Cantidad,
                        Jugador = "Cliente Mostrador"
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
        // ==========================================
        // 4. BÚSQUEDA PÚBLICA (MIS RESERVAS) 🔍
        // ==========================================
        [HttpGet("buscar/{telefono}")]
        public async Task<ActionResult<IEnumerable<object>>> BuscarPorTelefono(string telefono)
        {
            if (string.IsNullOrWhiteSpace(telefono)) return BadRequest("Teléfono requerido");

            var telLimpio = telefono.Trim();

            // 🟢 FECHA DE HOY (A las 00:00:00)
            var hoy = DateTime.UtcNow.Date;

            var reservas = await _context.Reservas
                .Include(r => r.Cancha)
                .ThenInclude(c => c.Usuario)
                .Where(r =>
                    r.ClienteTelefono.Contains(telLimpio) &&
                    r.FechaInicio >= hoy // 🟢 FILTRO: Solo de hoy en adelante
                )
                // 🟢 CAMBIO: Usamos 'OrderBy' (Ascendente) en lugar de 'Descending'
                // Así aparece primero el partido más cercano (hoy/mañana) y al final los lejanos.
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
        // ==========================================
        // 5. RESERVAS FIJAS (RECURRENTES) 🔄
        // ==========================================
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

                                // 🟢 2. ESTADO PENDIENTE (Para que aparezca la deuda)
                                Estado = "Pendiente",
                                Tipo = "Cancha",
                                CobradoEfectivo = 0,
                                CobradoTransferencia = 0,

                                // 🟢 3. ASIGNAMOS EL GRUPO
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
        //borrado por reserva fija 
        
        [HttpDelete("grupo/{grupoId}")]
        public async Task<IActionResult> CancelarGrupo(string grupoId)
        {
            if (string.IsNullOrEmpty(grupoId)) return BadRequest();

            // Buscamos todas las reservas con ese ID de grupo
            var reservasDelGrupo = await _context.Reservas
                .Where(r => r.GrupoId == grupoId)
                .ToListAsync();

            if (!reservasDelGrupo.Any()) return NotFound("No se encontró el grupo.");

            // Las borramos todas de una
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
    }

    public class VentaCantinaDto
    {
        public List<ItemVentaDto> Items { get; set; }
        public string MetodoPago { get; set; } // "Efectivo", "Transferencia" o "Mixto"

        // 🟢 NUEVOS CAMPOS PARA PAGO MIXTO (Opcionales)
        public decimal? CobradoEfectivo { get; set; }
        public decimal? CobradoTransferencia { get; set; }
    }
    // DTO para recibir los datos desde el Frontend
    public class ReservaDto
    {
        public int UsuarioId { get; set; } // 🟢 El dueño del negocio
        public int CanchaId { get; set; }
        public string? ClienteNombre { get; set; }
        public string? ClienteTelefono { get; set; }

        // Fechas
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }

        // Pagos
        public decimal Precio { get; set; }
        public decimal CobradoEfectivo { get; set; }
        public decimal CobradoTransferencia { get; set; }
        public string MetodoPago { get; set; }

        // 🟢 ESTO ES LO NUEVO PARA CANTINA: La lista de productos
        public List<ItemVentaDto> Items { get; set; } = new List<ItemVentaDto>();
    }

    public class ItemVentaDto
    {
        public string Producto { get; set; }
        public decimal Precio { get; set; }
        public int Cantidad { get; set; }
    }
    // --- DTO ESPECIAL PARA RESERVAS FIJAS ---
    public class ReservaFijaDto
    {
        public int CanchaId { get; set; }
        public string ClienteNombre { get; set; }
        public string ClienteTelefono { get; set; }

        // Rango de Fechas (Desde hoy hasta cuando dura el fijo)
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }

        // Hora del turno (Ej: 20:00 a 22:00)
        // Usamos DateTime pero solo nos importará la hora
        public DateTime HoraInicio { get; set; }
        public DateTime HoraFin { get; set; }

        public decimal PrecioPorTurno { get; set; }

        // Lista de días: 0=Domingo, 1=Lunes, ... 6=Sábado
        public List<int> DiasSemana { get; set; }
    }
}