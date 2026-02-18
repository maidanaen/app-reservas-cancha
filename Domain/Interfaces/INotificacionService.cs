using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace Domain.Interfaces
{
    public interface INotificacionService
    {
        Task EnviarMensaje(string chatId, string mensaje);
    }
}
