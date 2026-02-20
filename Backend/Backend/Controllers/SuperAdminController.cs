using Domain.Entities;
using Infrastructure.Persistencia;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SuperAdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SuperAdminController(AppDbContext context)
        {
            _context = context;
        }

        // 1. NUEVO: OBTENER LOGS (Para la pantalla "Matrix")
        [HttpGet("logs")]
        public async Task<ActionResult> GetLogs()
        {
            var logs = await _context.LogsSistema
                .OrderByDescending(l => l.Fecha)
                .Take(50)
                .ToListAsync();

            return Ok(logs);
        }

        // 2. MÉTRICAS GLOBALES
        [HttpGet("metricas")]
        public async Task<IActionResult> GetMetricasGlobales()
        {
            var totalClubes = await _context.Usuarios.CountAsync();
            var hoy = DateTime.Now.Date;
            var reservasHoy = await _context.Reservas
                .Where(r => r.FechaInicio >= hoy && r.FechaInicio < hoy.AddDays(1))
                .CountAsync();

            decimal precioSuscripcion = 20000m;
            var ingresosSaaS = totalClubes * precioSuscripcion;

            var topClubData = await _context.Reservas
                .GroupBy(r => r.UsuarioId)
                .Select(g => new { UsuarioId = g.Key, Cantidad = g.Count() })
                .OrderByDescending(x => x.Cantidad)
                .FirstOrDefaultAsync();

            string nombreTopClub = "N/A";
            if (topClubData != null)
            {
                var dueño = await _context.Usuarios.FindAsync(topClubData.UsuarioId);
                if (dueño != null) nombreTopClub = dueño.NombreNegocio ?? dueño.userName;
            }

            return Ok(new
            {
                ClubesActivos = totalClubes,
                ReservasHoy = reservasHoy,
                IngresosSaaS = ingresosSaaS,
                EstadoServidor = "Online 🟢",
                TopClub = nombreTopClub
            });
        }

        // 3. OBTENER TODOS LOS CLIENTES (Actualizado con LogoUrl y UltimoPago)
        [HttpGet("clientes")]
        public async Task<ActionResult> GetClientes()
        {
            var clientes = await _context.Usuarios
                .Select(u => new
                {
                    u.Id,
                    u.userName,
                    u.NombreNegocio,
                    u.Activo,
                    u.FechaAlta,
                    u.UltimoPago,
                    u.LogoUrl,
                    u.FotoUrl,
                    u.Telefono,
                    u.LinkUbicacion,
                    TotalReservas = _context.Reservas.Count(r => r.UsuarioId == u.Id)
                })
                .ToListAsync();

            return Ok(clientes);
        }

        // 4. REGISTRAR PAGO (CON AUDITORÍA)
        [HttpPost("registrar-pago/{id}")]
        public async Task<ActionResult> RegistrarPago(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound("Usuario no encontrado");

            usuario.UltimoPago = DateTime.Now;

            // Auditoría
            try
            {
                var log = new LogSistema
                {
                    Fecha = DateTime.Now,
                    Nivel = "SUCCESS",
                    Accion = "Cobro Registrado",
                    Usuario = "SuperAdmin",
                    Detalle = $"Se registró el pago mensual para el cliente: {usuario.NombreNegocio ?? usuario.userName}"
                };
                _context.LogsSistema.Add(log);
            }
            catch (Exception) { }

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Pago registrado exitosamente", fecha = usuario.UltimoPago });
        }

        // 5. DESHACER PAGO
        [HttpPost("deshacer-pago/{id}")]
        public async Task<ActionResult> DeshacerPago(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound();

            if (usuario.UltimoPago != null)
            {
                usuario.UltimoPago = usuario.UltimoPago.Value.AddMonths(-1);
            }
            else
            {
                usuario.UltimoPago = null;
            }

            await _context.SaveChangesAsync();
            return Ok(new { mensaje = "Pago anulado" });
        }

        // 6. BLOQUEAR / DESBLOQUEAR CLIENTE
        [HttpPut("toggle-estado/{id}")]
        public async Task<ActionResult> ToggleEstado(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound();

            usuario.Activo = !usuario.Activo;
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = usuario.Activo ? "Cliente Reactivado" : "Cliente Bloqueado", estado = usuario.Activo });
        }

        // 7. EDITAR DATOS (Actualizado para guardar LogoUrl)
        [HttpPut("editar/{id}")]
        public async Task<ActionResult> EditarUsuario(int id, [FromBody] EditUserRequest request)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound();

            usuario.userName = request.userName;
            usuario.NombreNegocio = request.nombreNegocio;
            usuario.LogoUrl = request.logoUrl;
            usuario.FotoUrl = request.fotoUrl;
            usuario.Telefono = request.telefono;
            usuario.LinkUbicacion = request.linkUbicacion;

            if (!string.IsNullOrEmpty(request.password))
            {
                usuario.Password = request.password;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Usuario actualizado" });
        }

        // 8. ELIMINAR USUARIO
        [HttpDelete("eliminar/{id}")]
        public async Task<ActionResult> EliminarUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound();

            try
            {
                var reservasDelUsuario = _context.Reservas.Where(r => r.UsuarioId == id);
                _context.Reservas.RemoveRange(reservasDelUsuario);

                var canchasDelUsuario = _context.Canchas.Where(c => c.UsuarioId == id);
                _context.Canchas.RemoveRange(canchasDelUsuario);

                _context.Usuarios.Remove(usuario);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Usuario y sus datos eliminados definitivamente" });
            }
            catch (Exception ex)
            {
                return BadRequest("No se pudo eliminar: " + ex.Message);
            }
        }
    }

    // 🟢 CLASE ACTUALIZADA
    public class EditUserRequest
    {
        public string userName { get; set; }
        public string nombreNegocio { get; set; }
        public string? logoUrl { get; set; }
        public string? fotoUrl { get; set; }
        public string? password { get; set; }
        public string? telefono { get; set; }
        public string? linkUbicacion { get; set; }
    }
}