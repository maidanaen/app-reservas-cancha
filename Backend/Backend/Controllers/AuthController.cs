using Microsoft.AspNetCore.Mvc;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistencia;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // POST: api/Auth/register
        [HttpPost("register")]
        [AllowAnonymous]
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
                FechaAlta = DateTime.UtcNow,
                Telefono = request.telefono,
                LinkUbicacion = request.LinkUbicacion
            };

            _context.Usuarios.Add(nuevoUsuario);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Usuario registrado con éxito" });
        }

        [HttpPost("login")]
        [AllowAnonymous]
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

            // 4. GENERAR TOKEN JWT
            var jwtSecretKey = _config["JwtSettings:SecretKey"] ?? "nexus_sport_super_secret_key_123456789";
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(jwtSecretKey);
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                    new Claim(ClaimTypes.Name, usuario.userName)
                }),
                Expires = DateTime.UtcNow.AddDays(7), // El token dura 7 días
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            // 5. Si pasa todo, Login exitoso
            return Ok(new
            {
                message = "Login exitoso",
                token = tokenString,
                usuario = usuario.userName,
                nombreNegocio = usuario.NombreNegocio,
                id=usuario.Id,
                esAdmin=true
            });
        }

        
        // GET: api/Auth/estado/usuario123
        [HttpGet("estado/{userName}")]
        [AllowAnonymous]
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
        [AllowAnonymous]
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

        [HttpPost("generar-link-telegram")]
        public async Task<ActionResult> GenerarLinkTelegram()
        {
            int usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var usuario = await _context.Usuarios.FindAsync(usuarioId);
            if (usuario == null) return NotFound(new { message = "Usuario no encontrado" });

            // 1. Generamos un token único (GUID)
            string token = Guid.NewGuid().ToString();

            // 2. Lo guardamos en la base de datos (pisando cualquiera anterior)
            usuario.TelegramConnectionToken = token;
            await _context.SaveChangesAsync();

            // 3. Devolvemos la URL mágica
            // ⚠️ REEMPLAZA 'TuAppReservas_bot' POR EL NOMBRE DE USUARIO REAL DE TU BOT EN TELEGRAM (El que termina en _bot)
            string nombreBot = "CanchasNoti_bot";
            string urlTelegram = $"https://t.me/{nombreBot}?start={token}";

            return Ok(new { url = urlTelegram });
        }
    }

    // Clase auxiliar (DTO)
    public class LoginRequest
    {
        public string userName { get; set; }
        public string Password { get; set; }
        public string? nombreNegocio { get; set; }
        public string? telefono { get; set; } 
        public string? LinkUbicacion { get; set; }
    }
}