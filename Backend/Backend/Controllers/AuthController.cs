using Microsoft.AspNetCore.Mvc;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistencia;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/Auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] LoginRequest request)
        {
            // 1. Validar que no exista ya ese usuario
            var existe = await _context.Usuarios.AnyAsync(u => u.userName == request.userName);
            if (existe)
            {
                return BadRequest(new { message = "El usuario ya existe" });
            }

            // 2. Crear el nuevo usuario
            var nuevoUsuario = new Usuario
            {
                userName = request.userName,
                Password = request.Password, // NOTA: Idealmente esto se encripta, por ahora texto plano para aprender
                NombreNegocio = request.nombreNegocio ?? "Negocio Sin Nombre", // Guardamos el nombre del club
                Activo = true,             // Nace activo
                FechaAlta = DateTime.UtcNow
            };

            _context.Usuarios.Add(nuevoUsuario);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Usuario registrado con éxito" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // 1. Buscamos al usuario por nombre y contraseña
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.userName == request.userName && u.Password == request.Password);

            // 2. Si no existe o la contraseña está mal
            if (usuario == null)
            {
                return Unauthorized(new { message = "Credenciales incorrectas" });
            }

            // 🛑 3. NUEVO BLOQUEO: Verificamos si estás bloqueado por el Super Admin
            if (usuario.Activo == false)
            {
                return Unauthorized(new { message = "⛔ Su cuenta está suspendida por falta de pago. Contacte al soporte." });
            }

            // 4. Si pasa todo, Login exitoso
            return Ok(new
            {
                message = "Login exitoso",
                usuario = usuario.userName,
                // Agregamos esto por si quieres mostrarlo en el Dashboard luego:
                nombreNegocio = usuario.NombreNegocio,
                id=usuario.Id,
                esAdmin=true
            });
        }

        
        // GET: api/Auth/estado/usuario123
        [HttpGet("estado/{userName}")]
        public async Task<IActionResult> GetEstadoUsuario(string userName)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.userName == userName);

            if (usuario == null) return NotFound(); // No existe

            // Devolvemos si está activo (true) o bloqueado (false)
            return Ok(usuario.Activo);
        }

        // GET: api/Auth/clubes-publicos
        [HttpGet("clubes-publicos")]
        public async Task<ActionResult> GetClubesPublicos()
        {
            // Seleccionamos solo los datos públicos (ID y Nombre).
            // Filtramos que tengan nombre de negocio y estén activos.
            var clubes = await _context.Usuarios
                .Where(u => u.Activo == true && u.NombreNegocio != null && u.NombreNegocio != "")
                .Select(u => new
                {
                    u.Id,
                    u.NombreNegocio,
                    // Podrías agregar dirección o ciudad si las tuvieras en el futuro
                })
                .ToListAsync();

            return Ok(clubes);
        }
    }

    // Clase auxiliar (DTO)
    public class LoginRequest
    {
        public string userName { get; set; }
        public string Password { get; set; }
        public string? nombreNegocio { get; set; }
    }
}