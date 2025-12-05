using Microsoft.AspNetCore.Mvc;
using Infrastructure.Persistence;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

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
                Password = request.Password // NOTA: Idealmente esto se encripta, por ahora texto plano para aprender
            };

            _context.Usuarios.Add(nuevoUsuario);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Usuario registrado con éxito" });
        }

        // POST: api/Auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.userName == request.userName && u.Password == request.Password);

            if (usuario == null)
            {
                return Unauthorized(new { message = "Credenciales incorrectas" });
            }

            return Ok(new { message = "Login exitoso", usuario = usuario.userName });
        }
    }

    // Clase auxiliar (DTO)
    public class LoginRequest
    {
        public string userName { get; set; }
        public string Password { get; set; }
    }
}