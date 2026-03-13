using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Backend.Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CajasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CajasController(AppDbContext context)
        {
            _context = context;
        }

        //MULTICLIENTE
        // 1. ABRIR CAJA 
        [HttpPost("abrir")]
        public async Task<ActionResult<Caja>> AbrirCaja([FromBody] decimal montoInicial)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();

            var cajaAbierta = await _context.Cajas
                .FirstOrDefaultAsync(c => c.UsuarioId == usuarioId && c.FechaCierre == null);

            if (cajaAbierta != null) return BadRequest("¡Ya tienes una caja abierta!");

            var nuevaCaja = new Caja
            {
                FechaApertura = DateTime.UtcNow,
                MontoInicial = montoInicial,
                UsuarioId = usuarioId // ASIGNAMOS DUEÑO
            };

            _context.Cajas.Add(nuevaCaja);
            await _context.SaveChangesAsync();
            return Ok(nuevaCaja);
        }

        // 2. OBTENER RESUMEN ACTUAL 
        [HttpGet("actual")]
        public async Task<ActionResult<object>> GetCajaActual()
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();

            var caja = await _context.Cajas
                .FirstOrDefaultAsync(c => c.UsuarioId == usuarioId && c.FechaCierre == null);

            if (caja == null) return NotFound("No hay caja abierta para este usuario.");

            return await GenerarReporteCaja(caja);
        }

        // 3. HISTORIAL
        [HttpGet("historial")]
        public async Task<ActionResult<IEnumerable<Caja>>> GetHistorial()
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();

            return await _context.Cajas
                .Where(c => c.UsuarioId == usuarioId && c.FechaCierre != null)
                .OrderByDescending(c => c.FechaCierre)
                .Take(30)
                .ToListAsync();
        }

        // 4. DETALLE HISTORIAL 
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetDetalleCaja(int id)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();

            var caja = await _context.Cajas.FindAsync(id);
            if (caja == null) return NotFound();

            //  SEGURIDAD: Si la caja no es tuya, no la ves.
            if (caja.UsuarioId != usuarioId) return Unauthorized("No tienes permiso para ver esta caja.");

            return await GenerarReporteCaja(caja);
        }

        // 5. CERRAR CAJA 
        [HttpPost("cerrar")]
        public async Task<IActionResult> CerrarCaja([FromBody] ArqueoCierreDto arqueo)
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();
            // 1. Buscamos la caja (CON SEGURIDAD DE USUARIO)
            var caja = await _context.Cajas
                .FirstOrDefaultAsync(c => c.UsuarioId == usuarioId && c.FechaCierre == null);

            if (caja == null) return BadRequest("No hay caja abierta.");

            // 2. Calculamos los totales teóricos del sistema (Ventas registradas)
            var reporte = await GenerarReporteCaja(caja);
            dynamic r = reporte;

            caja.TotalEfectivo = r.Resumen.TotalEfectivo;
            caja.TotalTransferencia = r.Resumen.TotalTransferencia;
            caja.MontoFinal = arqueo?.EfectivoReal ?? 0;
            caja.MontoRealTransferencia = arqueo?.TransferenciaReal ?? 0;
            caja.TotalGastos = arqueo?.TotalGastos ?? 0; // Plata que salió
            caja.Observaciones = arqueo?.Observaciones; // Notas del encargado

            caja.FechaCierre = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Caja cerrada correctamente", caja });
        }


        //🪄 LÓGICA DE REPORTE

        private async Task<dynamic> GenerarReporteCaja(Caja caja)
        {
            // Traemos las reservas vinculadas a esta caja específica
            var movimientos = await _context.Reservas
                .Include(r => r.Consumos)
                .Include(r => r.Cancha)
                .Include(r => r.Mesa)
                .Where(r => r.CajaId == caja.Id) // Esto ya filtra indirectamente por usuario porque la caja es del usuario
                .ToListAsync();

            // CLASIFICACIÓN
            var mesas = movimientos.Where(r => r.Tipo == "Mesa" || r.MesaId != null).ToList();
            var idsMesas = mesas.Select(m => m.Id).ToHashSet();

            var barra = movimientos.Where(r =>
                (r.Tipo == "Mostrador") ||
                (r.CanchaId == null && r.MesaId == null && !idsMesas.Contains(r.Id))
            ).ToList();
            var idsBarra = barra.Select(b => b.Id).ToHashSet();

            var canchas = movimientos.Where(r =>
                !idsMesas.Contains(r.Id) &&
                !idsBarra.Contains(r.Id)
            ).ToList();

            // SUMAS
            decimal canchasEfvo = canchas.Sum(r => r.CobradoEfectivo);
            decimal canchasTransf = canchas.Sum(r => r.CobradoTransferencia);

            decimal mesasEfvo = mesas.Sum(r => r.CobradoEfectivo);
            decimal mesasTransf = mesas.Sum(r => r.CobradoTransferencia);

            decimal barraEfvo = barra.Sum(r => r.CobradoEfectivo);
            decimal barraTransf = barra.Sum(r => r.CobradoTransferencia);

            // TOTAL DESCUENTOS GLOBALES
            decimal totalDescuentos = movimientos.Sum(r => r.DescuentoTotalMonto);

            // LISTA VISUAL
            var listaVisual = new List<object>();

            void AddMov(List<Reserva> lista, string conceptoDefault)
            {
                foreach (var item in lista)
                {
                    if (item.CobradoEfectivo > 0 || item.CobradoTransferencia > 0)
                    {
                        listaVisual.Add(new
                        {
                            Id = item.Id,
                            // 🟢 MAGIA AQUÍ: Usamos FechaCobro (Hora real en que se cobró). Si es vieja y no tiene, usa FechaInicio
                            Hora = item.FechaCobro ?? item.FechaInicio,
                            Concepto = conceptoDefault,
                            Detalle = item.Cancha != null ? $"{item.ClienteNombre} ({item.Cancha.Nombre})" : (item.Mesa != null ? $"{item.ClienteNombre} ({item.Mesa.Nombre})" : item.ClienteNombre),
                            Metodo = (item.CobradoEfectivo > 0 && item.CobradoTransferencia > 0) ? "Mixto" : (item.CobradoTransferencia > 0 ? "Transferencia" : "Efectivo"),
                            Monto = item.CobradoEfectivo + item.CobradoTransferencia,
                            Descuento = item.DescuentoTotalMonto,
                            Items = item.Consumos.Select(c => new { c.Producto, c.Precio, c.Cantidad }).ToList(),
                            Desglose = new { Efectivo = item.CobradoEfectivo, Transferencia = item.CobradoTransferencia },
                            Tipo = "Ingreso"
                        });
                    }
                }
            }

            AddMov(canchas, "Alquiler Cancha");
            AddMov(mesas, "Restaurante");
            AddMov(barra, "Cantina Express");

            var ordenados = listaVisual.OrderByDescending(x => ((dynamic)x).Hora).ToList();

            return new
            {
                Caja = caja,
                Resumen = new
                {
                    TotalEfectivo = caja.MontoInicial + canchasEfvo + mesasEfvo + barraEfvo,
                    TotalTransferencia = canchasTransf + mesasTransf + barraTransf,
                    TotalDescuentos = totalDescuentos,
                    TotalSistema = (caja.MontoInicial + canchasEfvo + mesasEfvo + barraEfvo) + (canchasTransf + mesasTransf + barraTransf),
                    GastosRegistrados = caja.TotalGastos,
                    Observaciones = caja.Observaciones,
                    Detalle = new
                    {
                        Canchas = new { Efectivo = canchasEfvo, Transferencia = canchasTransf },
                        Mesas = new { Efectivo = mesasEfvo, Transferencia = mesasTransf },
                        Barra = new { Efectivo = barraEfvo, Transferencia = barraTransf }
                    }
                },
                Movimientos = ordenados
            };
        }
    }

    public class ArqueoCierreDto
    {
        public decimal EfectivoReal { get; set; }
        public decimal TransferenciaReal { get; set; }
        public decimal TotalGastos { get; set; }
        public string? Observaciones { get; set; }
    }
}