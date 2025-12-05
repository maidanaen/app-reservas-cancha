using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Reserva
    {
        public int Id { get; set; } 
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }

        //datos del cliente
        public string ClienteNombre { get; set; } = string.Empty;
        public string ClienteTelefono { get; set; } = string.Empty;

        //relacion: una reserva pertenece a una cancha
        public int CanchaId { get; set; }
        public Cancha? Cancha { get; set; } 
    }
}
