using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistencia;
using Domain.Entities;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("resumen")]
        public async Task<ActionResult<object>> GetResumen()
        {
            var ahora = DateTime.Now;

            // 🔥 LÓGICA DE DÍA OPERATIVO:
            // Si son antes de las 6:00 AM, seguimos considerando que es "ayer"
            // (Ajusta el '6' si alguna vez abres antes de esa hora)
            var horaCorte = 6;

            DateTime inicioDiaOperativo;
            if (ahora.Hour < horaCorte)
            {
                // Si son las 2 AM del domingo, el día operativo empezó el sábado a las 6 AM
                inicioDiaOperativo = DateTime.Today.AddDays(-1).AddHours(horaCorte);
            }
            else
            {
                // Si son las 10 AM del domingo, el día operativo empezó hoy a las 6 AM
                inicioDiaOperativo = DateTime.Today.AddHours(horaCorte);
            }

            var finDiaOperativo = inicioDiaOperativo.AddDays(1); // Termina mañana a las 6 AM

            // 1. KPI: Ingresos de la JORNADA (Usamos el rango de fechas operativo)
            var ventasJornada = await _context.Reservas
                .Where(r => r.FechaInicio >= inicioDiaOperativo && r.FechaInicio < finDiaOperativo)
                .ToListAsync();

            decimal totalJornada = ventasJornada.Sum(r => r.CobradoEfectivo + r.CobradoTransferencia);

            // Contamos partidos de esta jornada (incluso los de la madrugada)
            int partidosJornada = ventasJornada.Count(r => r.CanchaId != null || r.Tipo == "Cancha");

            // 2. KPI: Caja Abierta (Esto sigue igual, es el dinero físico actual)
            var cajaAbierta = await _context.Cajas
                .OrderByDescending(c => c.FechaApertura)
                .FirstOrDefaultAsync(c => c.FechaCierre == null);

            decimal totalCaja = 0;
            if (cajaAbierta != null)
            {
                var movsCaja = await _context.Reservas
                    .Where(r => r.CajaId == cajaAbierta.Id)
                    .SumAsync(r => r.CobradoEfectivo + r.CobradoTransferencia);

                totalCaja = cajaAbierta.MontoInicial + movsCaja;
            }

            // 3. GRÁFICO: Ajustado a Días Operativos (Últimos 7 días)
            // Para el gráfico es un poco más complejo hacerlo exacto por SQL, 
            // pero para simplificar visualmente usaremos la fecha de inicio ajustada.
            var hace7dias = inicioDiaOperativo.AddDays(-6);

            var ventasSemana = await _context.Reservas
                .Where(r => r.FechaInicio >= hace7dias) // Traemos todo lo de la semana
                .Select(r => new { r.FechaInicio, Total = r.CobradoEfectivo + r.CobradoTransferencia })
                .ToListAsync();

            var graficoSemanal = Enumerable.Range(0, 7)
                .Select(i => hace7dias.AddDays(i))
                .Select(diaInicio => new
                {
                    Fecha = diaInicio.ToString("dd/MM"),
                    Dia = diaInicio.ToString("ddd", new System.Globalization.CultureInfo("es-ES")),
                    // Sumamos todo lo que ocurrió en las 24hs desde ese inicio de día operativo
                    Monto = ventasSemana
                        .Where(v => v.FechaInicio >= diaInicio && v.FechaInicio < diaInicio.AddDays(1))
                        .Sum(v => v.Total)
                })
                .ToList();

            // 4. LISTA: Próximos 5 Turnos (Desde AHORA real en adelante)
            var proximosTurnos = await _context.Reservas
                .Include(r => r.Cancha)
                .Where(r => r.FechaInicio > ahora && (r.CanchaId != null || r.Tipo == "Cancha"))
                .OrderBy(r => r.FechaInicio)
                .Take(5)
                .Select(r => new
                {
                    r.Id,
                    Hora = r.FechaInicio,
                    Cancha = r.Cancha != null ? r.Cancha.Nombre : "Pista Padel",
                    Cliente = r.ClienteNombre,
                    Estado = r.Estado
                })
                .ToListAsync();

            return Ok(new
            {
                Kpis = new
                {
                    IngresosHoy = totalJornada, // Ahora refleja tu "Día Operativo"
                    PartidosJugados = partidosJornada,
                    TotalEnCaja = totalCaja,
                    HayCajaAbierta = cajaAbierta != null
                },
                Grafico = graficoSemanal,
                Proximos = proximosTurnos
            });
        }
    }
}