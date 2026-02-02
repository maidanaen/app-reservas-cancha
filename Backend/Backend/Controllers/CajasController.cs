using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Backend.Domain.Entities;
using Infrastructure.Persistencia;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CajasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CajasController(AppDbContext context)
        {
            _context = context;
        }

        // 1. ABRIR CAJA
        [HttpPost("abrir")]
        public async Task<ActionResult<Caja>> AbrirCaja([FromBody] decimal montoInicial)
        {
            var cajaAbierta = await _context.Cajas.FirstOrDefaultAsync(c => c.FechaCierre == null);
            if (cajaAbierta != null) return BadRequest("¡Ya hay una caja abierta!");

            var nuevaCaja = new Caja { FechaApertura = DateTime.Now, MontoInicial = montoInicial };
            _context.Cajas.Add(nuevaCaja);
            await _context.SaveChangesAsync();
            return Ok(nuevaCaja);
        }

        // 2. OBTENER RESUMEN ACTUAL
        [HttpGet("actual")]
        public async Task<ActionResult<object>> GetCajaActual()
        {
            var caja = await _context.Cajas.FirstOrDefaultAsync(c => c.FechaCierre == null);
            if (caja == null) return NotFound("No hay caja abierta.");
            return await GenerarReporteCaja(caja);
        }

        // 3. HISTORIAL
        [HttpGet("historial")]
        public async Task<ActionResult<IEnumerable<Caja>>> GetHistorial()
        {
            return await _context.Cajas.Where(c => c.FechaCierre != null)
                .OrderByDescending(c => c.FechaCierre).Take(30).ToListAsync();
        }

        // 4. DETALLE HISTORIAL
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetDetalleCaja(int id)
        {
            var caja = await _context.Cajas.FindAsync(id);
            if (caja == null) return NotFound();
            return await GenerarReporteCaja(caja);
        }

        // 5. CERRAR CAJA
        [HttpPost("cerrar")]
        public async Task<IActionResult> CerrarCaja([FromBody] ArqueoCierreDto arqueo)
        {
            var caja = await _context.Cajas.FirstOrDefaultAsync(c => c.FechaCierre == null);
            if (caja == null) return BadRequest("No hay caja abierta.");

            var reporte = await GenerarReporteCaja(caja);
            dynamic r = reporte;

            caja.TotalEfectivo = r.Resumen.TotalEfectivo;
            caja.TotalTransferencia = r.Resumen.TotalTransferencia;
            // Si arqueo es null, asumimos 0 para no romper
            caja.MontoFinal = arqueo?.EfectivoReal ?? 0;
            caja.MontoRealTransferencia = arqueo?.TransferenciaReal ?? 0;
            caja.FechaCierre = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Caja cerrada correctamente", caja });
        }

        // =======================================================
        // 🪄 LÓGICA DE REPORTE (CORREGIDA) ✅
        // =======================================================
        private async Task<dynamic> GenerarReporteCaja(Caja caja)
        {
            // 1. TRAEMOS TODO LO QUE TENGA EL ID DE ESTA CAJA
            var movimientos = await _context.Reservas
                .Include(r => r.Consumos)
                .Where(r => r.CajaId == caja.Id)
                .ToListAsync();

            // ❌ ELIMINAMOS O COMENTAMOS ESTAS LÍNEAS ❌
            // El error era aquí: Si la reserva es para el mes que viene, la ocultaba.
            // if (caja.FechaCierre != null)
            //    movimientos = movimientos.Where(r => r.FechaInicio <= caja.FechaCierre).ToList();

            // 2. CLASIFICACIÓN
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

            // 3. SUMAS
            decimal canchasEfvo = canchas.Sum(r => r.CobradoEfectivo);
            decimal canchasTransf = canchas.Sum(r => r.CobradoTransferencia);

            decimal mesasEfvo = mesas.Sum(r => r.CobradoEfectivo);
            decimal mesasTransf = mesas.Sum(r => r.CobradoTransferencia);

            decimal barraEfvo = barra.Sum(r => r.CobradoEfectivo);
            decimal barraTransf = barra.Sum(r => r.CobradoTransferencia);

            // 4. LISTA VISUAL
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
                            Hora = item.FechaInicio,
                            Concepto = conceptoDefault,
                            Detalle = item.ClienteNombre,
                            Metodo = (item.CobradoEfectivo > 0 && item.CobradoTransferencia > 0) ? "Mixto" : (item.CobradoTransferencia > 0 ? "Transferencia" : "Efectivo"),
                            Monto = item.CobradoEfectivo + item.CobradoTransferencia,

                            // Cantidad incluida para el frontend
                            Items = item.Consumos.Select(c => new {
                                c.Producto,
                                c.Precio,
                                Cantidad = c.Cantidad
                            }).ToList(),

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
                    TotalSistema = (caja.MontoInicial + canchasEfvo + mesasEfvo + barraEfvo) + (canchasTransf + mesasTransf + barraTransf),
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
    }
}