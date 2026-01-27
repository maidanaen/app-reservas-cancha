using Microsoft.AspNetCore.Mvc;
using Backend.Services;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PagosController : ControllerBase
    {
        private readonly MercadoPagoService _mpService;

        public PagosController(MercadoPagoService mpService)
        {
            _mpService = mpService;
        }

        [HttpPost("crear")]
        public async Task<ActionResult> CrearPago([FromBody] DatosPago datos)
        {
            try
            {
                // Intentamos crear el link
                string urlPago = await _mpService.CrearPreferencia(datos.Titulo, datos.Precio, 1);
                return Ok(new { url = urlPago });
            }
            catch (Exception ex)
            {
                // 🛑 AQUÍ ESTÁ LA CLAVE: Imprimimos el error en la consola negra de Visual Studio
                Console.WriteLine("--------------------------------------------------");
                Console.WriteLine("❌ ERROR MERCADO PAGO: " + ex.Message);
                if (ex.InnerException != null)
                {
                    Console.WriteLine("🔍 DETALLE INTERNO: " + ex.InnerException.Message);
                }
                Console.WriteLine("--------------------------------------------------");

                // Le devolvemos el error al Frontend también
                return BadRequest(new { error = ex.Message, detalle = ex.InnerException?.Message });
            }
        }
    }

    public class DatosPago
    {
        public string Titulo { get; set; } = string.Empty;
        public decimal Precio { get; set; }
    }
}