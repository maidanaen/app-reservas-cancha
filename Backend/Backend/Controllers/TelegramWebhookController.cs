using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistencia;
using Domain.Interfaces;
using System.Text.Json; // Usaremos el nativo de .NET

namespace Backend.Controllers
{
    [Route("api/webhooks/telegram")]
    [ApiController]
    public class TelegramWebhookController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly INotificacionService _telegramService;

        public TelegramWebhookController(AppDbContext context, INotificacionService telegramService)
        {
            _context = context;
            _telegramService = telegramService;
        }

        [HttpPost]
        public async Task<IActionResult> HandleUpdate([FromBody] JsonElement update)
        {
            try
            {
                // Navegamos por el JSON que manda Telegram
                if (!update.TryGetProperty("message", out var message)) return Ok();
                if (!message.TryGetProperty("text", out var textElement)) return Ok();
                if (!message.TryGetProperty("chat", out var chatElement)) return Ok();
                if (!chatElement.TryGetProperty("id", out var idElement)) return Ok();

                string texto = textElement.GetString() ?? "";
                string chatId = idElement.GetRawText() ?? ""; // Extrae el número

                string nombreUsuario = "Usuario";
                if (message.TryGetProperty("from", out var fromElement) && fromElement.TryGetProperty("first_name", out var firstNameElement))
                {
                    nombreUsuario = firstNameElement.GetString() ?? "Usuario";
                }

                // 🟢 LÓGICA DE VINCULACIÓN DE DEEP LINKING
                if (texto.StartsWith("/start "))
                {
                    string tokenRecibido = texto.Replace("/start ", "").Trim();

                    // Buscamos al dueño que generó este código en la web
                    var usuarioEsperando = await _context.Usuarios
                        .FirstOrDefaultAsync(u => u.TelegramConnectionToken == tokenRecibido);

                    if (usuarioEsperando != null)
                    {
                        // ¡MAGIA! Vinculamos el celular con la cuenta
                        usuarioEsperando.TelegramChatId = chatId;
                        usuarioEsperando.TelegramConnectionToken = null; // Destruimos el token por seguridad

                        await _context.SaveChangesAsync();

                        // Le confirmamos al celular
                        await _telegramService.EnviarMensaje(chatId, $"✅ ¡Hola {nombreUsuario}! Tu cuenta del sistema ha sido vinculada con éxito.\n\n🔔 A partir de ahora recibirás alertas de tus nuevas reservas por aquí.");
                    }
                    else
                    {
                        await _telegramService.EnviarMensaje(chatId, "⚠️ El enlace ha expirado o no es válido. Intenta conectar nuevamente desde el panel de administración web.");
                    }
                }
                else if (texto == "/start")
                {
                    await _telegramService.EnviarMensaje(chatId, "👋 ¡Hola! Soy el bot de notificaciones. Para vincular tu cuenta, por favor usa el botón 'Conectar Telegram' desde tu panel de administrador en la web.");
                }

                return Ok();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error procesando Webhook de Telegram: " + ex.Message);
                return Ok(); // Siempre devolvemos 200 a Telegram para que no reintente infinitamente
            }
        }
    }
}