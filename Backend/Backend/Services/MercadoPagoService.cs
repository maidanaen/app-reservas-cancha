using MercadoPago.Client.Preference;
using MercadoPago.Config;
using MercadoPago.Resource.Preference;

namespace Backend.Services
{
    public class MercadoPagoService
    {
        public MercadoPagoService(IConfiguration configuration)
        {
            string accessToken = configuration["MercadoPago:AccessToken"] ?? "";
            MercadoPagoConfig.AccessToken = accessToken;
        }

        public async Task<string> CrearPreferencia(string titulo, decimal precio, int cantidad)
        {
            // 1. Preparamos las URLs en una variable aparte (para obligar a C# a leerlas)
            var misUrls = new PreferenceBackUrlsRequest
            {
                Success = "http://localhost:3000/reservar/exito",
                Failure = "http://localhost:3000/reservar/fallo",
                Pending = "http://localhost:3000/reservar/fallo"
            };

            // 2. Creamos la solicitud usando esa variable
            var request = new PreferenceRequest
            {
                Items = new List<PreferenceItemRequest>
                {
                    new PreferenceItemRequest
                    {
                        Title = titulo,
                        Quantity = cantidad,
                        CurrencyId = "ARS",
                        UnitPrice = precio,
                    }
                },
                BackUrls = misUrls,      // <--- Aquí asignamos la variable
                //AutoReturn = "approved", // <--- Esto activa el redireccionamiento
            };

            var client = new PreferenceClient();
            Preference preference = await client.CreateAsync(request);

            return preference.InitPoint;
        }
    }
}