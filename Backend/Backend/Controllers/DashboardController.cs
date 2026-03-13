using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistencia;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("resumen")]
        public async Task<ActionResult> GetResumen()
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            if (usuarioId == 0) return Unauthorized();

            // 1. BUSCAR CAJA ABIERTA (El contenedor de la jornada actual)
            var cajaAbierta = await _context.Cajas
                .Where(c => c.UsuarioId == usuarioId && c.FechaCierre == null)
                .OrderByDescending(c => c.FechaApertura)
                .FirstOrDefaultAsync();

            decimal ventasJornada = 0;
            
            decimal cajaTotal = 0;

            // SI HAY TURNO ABIERTO: Calculamos todo en base a ESA caja
            if (cajaAbierta != null)
            {
                // a. Sumamos todas las reservas vinculadas a esta caja (sin importar si fueron ayer u hoy)
                var reservasDelTurno = _context.Reservas
                    .Where(r => r.CajaId == cajaAbierta.Id && r.Estado != "Cancelado");

                ventasJornada = await reservasDelTurno
                    .SumAsync(r => r.CobradoEfectivo + r.CobradoTransferencia);

                

                // c. Caja Actual = Monto Inicial + Ventas del Turno
                cajaTotal = cajaAbierta.MontoInicial + ventasJornada;
            }
            else
            {
                //  SI NO HAY TURNO ABIERTO: Mostramos 0 o datos del día calendario (opcional)
                // Por seguridad operativa, mejor mostrar 0 para obligar a abrir caja.
                ventasJornada = 0;
               
                cajaTotal = 0;
            }

            //2- Queremos saber la ocupación REAL de la cancha hoy, hayan pagado o no.
            var hoy = DateTime.Today;
            var manana = hoy.AddDays(1);

            int turnosJornada = await _context.Reservas
                .Where(r => r.UsuarioId == usuarioId
                            && r.FechaInicio >= hoy
                            && r.FechaInicio < manana
                            && r.Tipo == "Cancha"
                            && r.Estado != "Cancelado")
                .CountAsync();

            // 3. GRÁFICO (Este sí lo dejamos por fecha calendario para ver historial semanal)
            var hace7Dias = DateTime.Today.AddDays(-6);
            var graficoData = await _context.Reservas
                .Where(r => r.UsuarioId == usuarioId
                            && r.FechaInicio >= hace7Dias
                            && r.Estado != "Cancelado")
                .GroupBy(r => r.FechaInicio.Date)
                .Select(g => new
                {
                    Fecha = g.Key,
                    Total = g.Sum(x => x.CobradoEfectivo + x.CobradoTransferencia)
                })
                .OrderBy(x => x.Fecha)
                .ToListAsync();

            return Ok(new
            {
                ventasDiarias = ventasJornada, // Dinero en caja hoy
                turnosHoy = turnosJornada, //Ocupación de canchas hoy (Pagado + Pendiente)
                cajaActual = cajaTotal, // Saldo total físico
                grafico = graficoData
            });
        }
    }
    
}