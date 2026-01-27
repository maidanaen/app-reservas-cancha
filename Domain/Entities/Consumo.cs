using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities // <--- Fíjate que el namespace ahora es Domain
{
    public class Consumo
    {
        public int Id { get; set; }
        public string Producto { get; set; } = string.Empty;
        public decimal Precio { get; set; }
        public int Cantidad { get; set; }
        public string Jugador { get; set; } = string.Empty; // Quién lo pidió

        // Relación con Reserva
        public int ReservaId { get; set; }
    }
}