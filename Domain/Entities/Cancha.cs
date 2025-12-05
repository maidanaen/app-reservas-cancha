using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Cancha
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Deporte { get; set; } = string.Empty; //padel, futbol, tenis, etc
        public decimal PrecioPorHora { get; set; }
        public bool Techada { get; set; }
        public string imgUrl { get; set; } = string.Empty;
        // ---> NUEVOS CAMPOS DE HORARIO <---
        public int HoraApertura { get; set; } // Ej: 8 (para las 08:00)
        public int HoraCierre { get; set; }   // Ej: 23 (para las 23:00)
    }
}
