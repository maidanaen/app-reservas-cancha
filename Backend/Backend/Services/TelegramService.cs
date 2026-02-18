using System;
using System.Net.Http;
using System.Threading.Tasks;
using Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services
{
    public class TelegramService : INotificacionService
    {
        private readonly HttpClient _httpClient;
        private readonly string _botToken;

        public TelegramService(IConfiguration config, HttpClient httpClient)
        {
            _httpClient = httpClient;
            // Leeremos el token del appsettings.json
            _botToken = config["TelegramSettings:Token"] ?? "";
        }

        public async Task EnviarMensaje(string chatId, string mensaje)
        {
            if (string.IsNullOrEmpty(chatId) || string.IsNullOrEmpty(_botToken)) return;

            // La URL de la API oficial de Telegram
            var url = $"https://api.telegram.org/bot{_botToken}/sendMessage?chat_id={chatId}&text={Uri.EscapeDataString(mensaje)}&parse_mode=Markdown";

            try
            {
                await _httpClient.GetAsync(url);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error enviando Telegram: {ex.Message}");
            }
        }
    }
}