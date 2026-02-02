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
        public async Task<ActionResult<IEnumerable<Reserva>>> GetReservas([FromQuery] DateTime? fecha)
        {
            var fechaFiltro = fecha ?? DateTime.Today;
            var reservas = await _repository.GetAllByFechaAsync(fechaFiltro);
            return Ok(reservas);
        }

        // GET: api/Reservas/ocupadas
        [HttpGet("ocupadas")]
        public async Task<ActionResult<IEnumerable<string>>> GetHorariosOcupados(int canchaId, DateTime fecha)
        {
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

        // GET: api/Reservas/cancha/1
        [HttpGet("cancha/{canchaId}")]
        public async Task<ActionResult<List<Reserva>>> VerTurnos(int canchaId, [FromQuery] DateTime? fecha)
        {
            var fechaFiltro = fecha ?? DateTime.Now;
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


        // ==========================================
        // 1. CREAR RESERVA DE CANCHA (AGENDA) 🎾
        // ==========================================
        [HttpPost]
        public async Task<ActionResult<Reserva>> CrearReserva(Reserva reserva)
        {
            try
            {
                reserva.Tipo = "Cancha";

                if (reserva.FechaFin == default)
                {
                    reserva.FechaFin = reserva.FechaInicio.AddHours(1);
                }

                // 🟢 LÓGICA DE CAJA: Si nace ya pagada, la vinculamos a la caja de HOY
                if (reserva.Estado == "Pagado" || reserva.CobradoEfectivo > 0 || reserva.CobradoTransferencia > 0)
                {
                    var cajaAbierta = await _context.Cajas.FirstOrDefaultAsync(c => c.FechaCierre == null);
                    if (cajaAbierta != null)
                    {
                        reserva.CajaId = cajaAbierta.Id;
                    }
                }

                var nueva = await _repository.AddAsync(reserva);
                return CreatedAtAction(nameof(VerTurnos), new { canchaId = nueva.CanchaId }, nueva);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { mensaje = ex.Message });
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

            // 1. Guardamos el dinero
            reserva.CobradoEfectivo = cobro.CobradoEfectivo;
            reserva.CobradoTransferencia = cobro.CobradoTransferencia;

            // 2. Calculamos total y estado
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

                // 🟢 3. MAGIA: VINCULAR A CAJA ABIERTA 🪄
                var cajaAbierta = await _context.Cajas.FirstOrDefaultAsync(c => c.FechaCierre == null);
                if (cajaAbierta != null)
                {
                    reserva.CajaId = cajaAbierta.Id;
                }
            }

            // 4. Guardamos
            await _repository.UpdateAsync(reserva);

            return Ok(new { mensaje = "Caja actualizada correctamente" });
        }

        // ==========================================
        // 3. VENTA EXPRESS (CANTINA/KIOSCO) 🍔🥤
        // ==========================================
        [HttpPost("venta-express")]
        public async Task<ActionResult> NuevaVentaCantina([FromBody] VentaCantinaDto venta)
        {
            var ticket = new Reserva
            {
                FechaInicio = DateTime.Now,
                FechaFin = DateTime.Now,
                ClienteNombre = "Venta Mostrador",
                ClienteTelefono = "000",
                Estado = "Pagado",
                Tipo = "Mostrador",
                CanchaId = null,
                MesaId = null,
                Consumos = new List<Consumo>()
            };

            // 🟢 VINCULAR A CAJA ABIERTA
            var cajaAbierta = await _context.Cajas.FirstOrDefaultAsync(c => c.FechaCierre == null);
            if (cajaAbierta != null)
            {
                ticket.CajaId = cajaAbierta.Id;
            }

            decimal totalVenta = 0;
            foreach (var item in venta.Items)
            {
                var consumo = new Consumo
                {
                    Producto = item.Producto,
                    Precio = item.Precio,
                    Cantidad = item.Cantidad,
                    Jugador = "Mostrador"
                };
                ticket.Consumos.Add(consumo);
                totalVenta += consumo.Precio;
            }

            // 🟢 LÓGICA DE PAGO MIXTO INTELIGENTE 🟢
            // 1. Si el frontend manda montos explícitos, los usamos.
            // 2. Si no (vienen null), usamos la lógica vieja (todo efectivo o todo transferencia).
            decimal pagoEfec = venta.CobradoEfectivo ?? (venta.MetodoPago == "Efectivo" ? totalVenta : 0);
            decimal pagoTransf = venta.CobradoTransferencia ?? (venta.MetodoPago == "Transferencia" ? totalVenta : 0);

            ticket.CobradoEfectivo = pagoEfec;
            ticket.CobradoTransferencia = pagoTransf;

            // Determinar etiqueta MetodoPago
            if (pagoEfec > 0 && pagoTransf > 0) ticket.MetodoPago = "Mixto";
            else if (pagoTransf > 0) ticket.MetodoPago = "Transferencia";
            else ticket.MetodoPago = "Efectivo";

            await _repository.AddAsync(ticket);

            return Ok(new { mensaje = "Venta registrada", ticketId = ticket.Id, total = totalVenta });
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

    public class ItemVentaDto
    {
        public string Producto { get; set; }
        public decimal Precio { get; set; }
        public int Cantidad { get; set; }
    }
}